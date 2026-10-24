// Tracker Cop Background Service Worker

const DEFAULT_SETTINGS = {
  enabled: true,
  poisonMode: 'sarcastic', // 'sarcastic' | 'gibberish' | 'decoy_profile' | 'custom'
  customPoisonMsg: 'Instead of tracking try getting a job it pays bills!',
  whitelistedDomains: [],
  notificationsEnabled: true,
  stats: {
    totalBlocked: 0,
    cookiesPoisoned: 0,
    stealthDetected: 0,
    sitesProtectedCount: 0
  },
  protectedSitesMap: {}, // domain -> { blocked: 0, poisoned: 0, stealth: 0, lastSeen: timestamp }
  logs: []
};

// Poison Payloads generator based on mode
function getPoisonPayload(mode, customMsg) {
  switch (mode) {
    case 'sarcastic': {
      const sarcasticMsgs = [
        "Nothing to see here officer!",
        "Instead of tracking try getting a job it pays bills!",
        "Nice try tracer, here is a 100% fake cookie value for your database.",
        "Target profile: Professional cat snuggler & professional nap taker.",
        "Your tracker found 0 real data. Have a nice day!",
        "Decoy activated: Police whistle blowing in your direction 👮"
      ];
      return sarcasticMsgs[Math.floor(Math.random() * sarcasticMsgs.length)];
    }
    case 'gibberish': {
      return 'FAKE_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    case 'decoy_profile': {
      return JSON.stringify({
        age: 99,
        interest: ["underwater basket weaving", "watching paint dry", "collecting rubber ducks"],
        income: "$0/yr",
        location: "North Pole Sector 4"
      });
    }
    case 'custom': {
      return customMsg || 'Instead of tracking try getting a job it pays bills!';
    }
    default:
      return 'Nothing to see here officer!';
  }
}

// Initialize default state on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Tracker Cop] Installed / Updated. Reason:', details.reason);
  const data = await chrome.storage.local.get(null);

  const mergedSettings = { ...DEFAULT_SETTINGS, ...data };
  if (!mergedSettings.stats) mergedSettings.stats = DEFAULT_SETTINGS.stats;
  if (!mergedSettings.protectedSitesMap) mergedSettings.protectedSitesMap = {};
  if (!mergedSettings.logs) mergedSettings.logs = [];

  await chrome.storage.local.set(mergedSettings);

  // Configure WebRTC Leak Protection via privacy API
  if (chrome.privacy && chrome.privacy.network && chrome.privacy.network.webRTCIPHandlingPolicy) {
    try {
      chrome.privacy.network.webRTCIPHandlingPolicy.set({
        value: 'disable_non_proxied_udp'
      });
      console.log('[Tracker Cop] WebRTC IP handling policy set to disable_non_proxied_udp.');
    } catch (e) {
      console.warn('[Tracker Cop] WebRTC IP policy setting error:', e);
    }
  }

  // Setup periodic health & audit alarm
  chrome.alarms.create('trackerCopAuditAlarm', { periodInMinutes: 15 });
});

// Alarm Handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'trackerCopAuditAlarm') {
    await performRoutineCookieAudit();
  }
});

// Helper: check if domain is whitelisted
function isWhitelisted(domain, whitelist = []) {
  if (!domain) return false;
  const cleanDomain = domain.replace(/^\./, '').toLowerCase();
  return whitelist.some(w => cleanDomain === w.toLowerCase() || cleanDomain.endsWith('.' + w.toLowerCase()));
}

// Helper: add log entry
async function addLogEntry(type, domain, detail, riskLevel = 'MEDIUM') {
  const data = await chrome.storage.local.get(['logs', 'protectedSitesMap', 'stats']);
  const logs = data.logs || [];
  const protectedSitesMap = data.protectedSitesMap || {};
  const stats = data.stats || { totalBlocked: 0, cookiesPoisoned: 0, stealthDetected: 0, sitesProtectedCount: 0 };

  const entry = {
    id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    type, // 'COOKIE_POISON' | 'TRACKER_BLOCK' | 'STEALTH_DETECTED'
    domain: domain || 'unknown',
    detail,
    riskLevel // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  };

  logs.unshift(entry);
  if (logs.length > 200) logs.pop(); // Keep last 200 logs

  // Update site map
  if (domain && domain !== 'unknown') {
    const cleanDomain = domain.replace(/^\./, '').toLowerCase();
    if (!protectedSitesMap[cleanDomain]) {
      protectedSitesMap[cleanDomain] = { blocked: 0, poisoned: 0, stealth: 0, lastSeen: new Date().toISOString() };
    }
    protectedSitesMap[cleanDomain].lastSeen = new Date().toISOString();
    if (type === 'COOKIE_POISON') protectedSitesMap[cleanDomain].poisoned++;
    if (type === 'TRACKER_BLOCK') protectedSitesMap[cleanDomain].blocked++;
    if (type === 'STEALTH_DETECTED') protectedSitesMap[cleanDomain].stealth++;
  }

  stats.sitesProtectedCount = Object.keys(protectedSitesMap).length;

  await chrome.storage.local.set({ logs, protectedSitesMap, stats });
}

// Cookie Poisoning Listener
const KNOWN_TRACKER_COOKIE_PATTERNS = [
  '_ga', '_gid', '_fbp', '_fbc', '_uetsid', '_uetvid', '_hj', '_td', 'criteo',
  '_parsely', 'segment', '_mixpanel', '_quant', '_px', 'bm_sz', '_mibhv',
  'hubspot', 'omvis', '__cfruid', 'intercom'
];

chrome.cookies.onChanged.addListener(async (changeInfo) => {
  if (changeInfo.removed) return; // ignore removals

  const { cookie } = changeInfo;
  const store = await chrome.storage.local.get(['enabled', 'poisonMode', 'customPoisonMsg', 'whitelistedDomains', 'stats']);

  if (!store.enabled) return;
  if (isWhitelisted(cookie.domain, store.whitelistedDomains)) return;

  const cookieName = cookie.name.toLowerCase();
  const isTrackerCookie = KNOWN_TRACKER_COOKIE_PATTERNS.some(pattern => cookieName.includes(pattern));

  // If cookie name matches tracker patterns or has suspicious tracker structure
  if (isTrackerCookie) {
    const poisonPayload = getPoisonPayload(store.poisonMode, store.customPoisonMsg);

    // Check if cookie is already poisoned to avoid infinite loops
    if (cookie.value && cookie.value.includes('POLICE_DECIPHERED_FAKE')) return;

    const dummyValue = `POLICE_DECIPHERED_FAKE: ${poisonPayload}`;

    // Overwrite cookie with dummy data
    const protocol = cookie.secure ? 'https:' : 'http:';
    const cookieUrl = `${protocol}//${cookie.domain.replace(/^\./, '')}${cookie.path}`;

    try {
      const cookieSetDetails = {
        url: cookieUrl,
        name: cookie.name,
        value: dummyValue,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        expirationDate: cookie.expirationDate
      };

      // Only set domain parameter if it's not a host-only cookie to prevent API errors
      if (!cookie.hostOnly && cookie.domain) {
        cookieSetDetails.domain = cookie.domain;
      }

      await chrome.cookies.set(cookieSetDetails);

      // Update stats
      const stats = store.stats || { totalBlocked: 0, cookiesPoisoned: 0, stealthDetected: 0, sitesProtectedCount: 0 };
      stats.cookiesPoisoned = (stats.cookiesPoisoned || 0) + 1;
      await chrome.storage.local.set({ stats });

      await addLogEntry('COOKIE_POISON', cookie.domain, `Poisoned tracking cookie "${cookie.name}" with false info.`, 'MEDIUM');
    } catch (err) {
      console.warn('[Tracker Cop] Failed to set poisoned cookie:', err);
    }
  }
});

// Routine Audit Function
async function performRoutineCookieAudit() {
  const store = await chrome.storage.local.get(['enabled', 'whitelistedDomains']);
  if (!store.enabled) return;

  try {
    const cookies = await chrome.cookies.getAll({});
    let auditPoisonedCount = 0;

    for (const cookie of cookies) {
      if (isWhitelisted(cookie.domain, store.whitelistedDomains)) continue;
      const cookieName = cookie.name.toLowerCase();
      if (KNOWN_TRACKER_COOKIE_PATTERNS.some(p => cookieName.includes(p))) {
        if (!cookie.value.includes('POLICE_DECIPHERED_FAKE')) {
          auditPoisonedCount++;
        }
      }
    }

    if (auditPoisonedCount > 5 && store.notificationsEnabled) {
      triggerNotification('👮 Routine Police Sweep Complete', `Swept and flagged ${auditPoisonedCount} stealth tracking cookies across active domains.`);
    }
  } catch (err) {
    console.error('[Tracker Cop] Cookie audit error:', err);
  }
}

// Notification Helper
function triggerNotification(title, message) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: title,
      message: message,
      priority: 2
    });
  } catch (err) {
    console.warn('[Tracker Cop] Notification trigger failed:', err);
  }
}

// Dynamic Net Request Feedback / Block counters
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
    const store = await chrome.storage.local.get(['stats']);
    const stats = store.stats || { totalBlocked: 0, cookiesPoisoned: 0, stealthDetected: 0, sitesProtectedCount: 0 };
    stats.totalBlocked++;
    await chrome.storage.local.set({ stats });

    let domain = 'unknown';
    try {
      domain = new URL(info.request.url).hostname;
    } catch (e) {}

    await addLogEntry('TRACKER_BLOCK', domain, `Blocked tracker request to ${info.request.url.substring(0, 80)}`, 'LOW');
  });
}

// Message Listener from Popup, Options, and Content Scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleAsyncMessage = async () => {
    switch (message.type) {
      case 'GET_STATUS': {
        const store = await chrome.storage.local.get(null);
        return { success: true, data: store };
      }

      case 'TOGGLE_ENABLED': {
        const store = await chrome.storage.local.get(['enabled']);
        const newEnabled = !store.enabled;
        await chrome.storage.local.set({ enabled: newEnabled });
        return { success: true, enabled: newEnabled };
      }

      case 'TOGGLE_WHITELIST_DOMAIN': {
        const { domain } = message;
        if (!domain) return { success: false, error: 'No domain specified' };

        const store = await chrome.storage.local.get(['whitelistedDomains']);
        let list = store.whitelistedDomains || [];
        const cleanDomain = domain.toLowerCase();

        if (list.includes(cleanDomain)) {
          list = list.filter(d => d !== cleanDomain);
        } else {
          list.push(cleanDomain);
        }

        await chrome.storage.local.set({ whitelistedDomains: list });
        return { success: true, whitelistedDomains: list, isWhitelisted: list.includes(cleanDomain) };
      }

      case 'UPDATE_SETTINGS': {
        await chrome.storage.local.set(message.settings);
        return { success: true };
      }

      case 'REPORT_STEALTH_TRACKER': {
        const { domain, detail, technique, riskLevel } = message;
        const store = await chrome.storage.local.get(['stats', 'notificationsEnabled', 'whitelistedDomains', 'enabled']);

        if (!store.enabled || isWhitelisted(domain, store.whitelistedDomains)) {
          return { success: false, reason: 'Disabled or Whitelisted' };
        }

        const stats = store.stats || { totalBlocked: 0, cookiesPoisoned: 0, stealthDetected: 0, sitesProtectedCount: 0 };
        stats.stealthDetected++;
        await chrome.storage.local.set({ stats });

        await addLogEntry('STEALTH_DETECTED', domain, `Detected stealth tracer using ${technique}: ${detail}`, riskLevel || 'HIGH');

        if (store.notificationsEnabled && (riskLevel === 'HIGH' || riskLevel === 'CRITICAL')) {
          triggerNotification(
            `🚨 Stealth Tracer Alert on ${domain}!`,
            `Tracker Cop detected a masked digital fingerprinting attempt (${technique}). Dummy decoy values were fed to neuter the tracker!`
          );
        }

        return { success: true };
      }

      case 'RECORD_BLOCK_EVENT': {
        const { domain, url } = message;
        const store = await chrome.storage.local.get(['stats']);
        const stats = store.stats || { totalBlocked: 0, cookiesPoisoned: 0, stealthDetected: 0, sitesProtectedCount: 0 };
        stats.totalBlocked++;
        await chrome.storage.local.set({ stats });
        await addLogEntry('TRACKER_BLOCK', domain, `Blocked tracker script/pixel: ${url ? url.substring(0, 60) : 'script'}`, 'LOW');
        return { success: true };
      }

      case 'GENERATE_EMAIL_REPORT': {
        const data = await chrome.storage.local.get(null);
        const report = generateEmailReportContent(data);
        return { success: true, report };
      }

      case 'CLEAR_LOGS': {
        await chrome.storage.local.set({ logs: [] });
        return { success: true };
      }

      default:
        return { success: false, error: 'Unknown message type' };
    }
  };

  handleAsyncMessage().then(sendResponse).catch(err => sendResponse({ success: false, error: err.message }));
  return true; // async sendResponse
});

// Helper: Format detailed email report
function generateEmailReportContent(data) {
  const stats = data.stats || {};
  const logs = data.logs || [];
  const protectedSitesMap = data.protectedSitesMap || {};
  const whitelisted = data.whitelistedDomains || [];

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const totalTracers = (stats.totalBlocked || 0) + (stats.cookiesPoisoned || 0) + (stats.stealthDetected || 0);
  const totalSites = Object.keys(protectedSitesMap).length;

  let siteBreakdownText = '';
  for (const [site, sData] of Object.entries(protectedSitesMap)) {
    siteBreakdownText += `- ${site}: Blocked ${sData.blocked} network requests, Poisoned ${sData.poisoned} cookies, Intercepted ${sData.stealth} stealth fingerprinting attempts.\n`;
  }
  if (!siteBreakdownText) siteBreakdownText = 'No suspicious domains recorded in this session.\n';

  let recentIncidentsText = '';
  logs.slice(0, 15).forEach(log => {
    recentIncidentsText += `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.riskLevel}] ${log.domain} - ${log.detail}\n`;
  });
  if (!recentIncidentsText) recentIncidentsText = 'No recent incidents logged.\n';

  const body = `
====================================================================
👮 TRACKER COP & COOKIE POISONER - DEFENSIVE SECURITY REPORT
====================================================================
Date Generated: ${dateStr}
Status: Active Defense Operating

SUMMARY METRICS:
--------------------------------------------------------------------
- Total Tracers Neutralized: ${totalTracers}
- Network Trackers Blocked: ${stats.totalBlocked || 0}
- Surveillance Cookies Poisoned: ${stats.cookiesPoisoned || 0}
- Stealth Fingerprinters Caught: ${stats.stealthDetected || 0}
- Protected Web Domains: ${totalSites}

PROTECTED SITES & TRACKING LOCATIONS BREAKDOWN:
--------------------------------------------------------------------
${siteBreakdownText}

RECENT SUSPICIOUS INCIDENTS & DIGITAL FOOTPRINTS DETECTED:
--------------------------------------------------------------------
${recentIncidentsText}

RECOMMENDED SECURITY ACTIONS:
--------------------------------------------------------------------
1. Review whitelisted domains list (Currently ${whitelisted.length} domains whitelisted).
2. Keep Tracker Cop active with Sarcastic / Decoy Poison Mode enabled to continuously feed dummy profile telemetry to trackers.
3. Use HTTPS-only mode and consider periodic browser storage sweeps.
4. If stealth fingerprinting attempts persist on specific untrusted sites, consider adding custom dummy payloads in Tracker Cop Options.

--------------------------------------------------------------------
Report generated automatically by Tracker Cop Extension.
"Instead of tracking try getting a job it pays bills!" 👮
====================================================================
`.trim();

  const subject = `Tracker Cop Security Report - ${totalTracers} Tracers Neutralized (${dateStr})`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return {
    subject,
    body,
    mailtoUrl,
    stats,
    totalTracers,
    totalSites
  };
}
