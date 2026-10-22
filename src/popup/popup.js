// Popup JS - Tracker Cop Interactive Dashboard

document.addEventListener('DOMContentLoaded', async () => {
  const masterToggle = document.getElementById('masterToggle');
  const statusBanner = document.getElementById('statusBanner');
  const statusText = document.getElementById('statusText');
  const currentDomainEl = document.getElementById('currentDomain');
  const riskBadge = document.getElementById('riskBadge');
  const whitelistBtn = document.getElementById('whitelistBtn');
  const statBlocked = document.getElementById('statBlocked');
  const statPoisoned = document.getElementById('statPoisoned');
  const statStealth = document.getElementById('statStealth');
  const poisonModeSelect = document.getElementById('poisonModeSelect');
  const recentLogsContainer = document.getElementById('recentLogs');
  const emailReportBtn = document.getElementById('emailReportBtn');
  const openOptionsBtn = document.getElementById('openOptionsBtn');

  let activeTabDomain = '';

  // Get active tab domain
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      const url = new URL(tabs[0].url);
      if (url.protocol.startsWith('http')) {
        activeTabDomain = url.hostname;
      } else {
        activeTabDomain = 'Browser System';
      }
    }
  } catch (e) {
    activeTabDomain = 'unknown';
  }

  currentDomainEl.textContent = activeTabDomain || 'Unknown';

  // Load state from service worker
  async function refreshUI() {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
      if (!res || !res.success || !res.data) return;

      const data = res.data;
      const enabled = data.enabled !== false;
      const stats = data.stats || {};
      const logs = data.logs || [];
      const whitelisted = data.whitelistedDomains || [];
      const isSiteWhitelisted = activeTabDomain && whitelisted.includes(activeTabDomain.toLowerCase());

      // Update toggle and status banner
      masterToggle.checked = enabled;
      if (enabled) {
        statusBanner.className = 'status-banner banner-active';
        statusText.textContent = 'POLICE PATROL ACTIVE';
      } else {
        statusBanner.className = 'status-banner banner-disabled';
        statusText.textContent = 'GUARD STANDING DOWN';
      }

      // Stats
      statBlocked.textContent = stats.totalBlocked || 0;
      statPoisoned.textContent = stats.cookiesPoisoned || 0;
      statStealth.textContent = stats.stealthDetected || 0;

      // Poison Mode Select
      if (data.poisonMode) {
        poisonModeSelect.value = data.poisonMode;
      }

      // Whitelist Button Text & Risk Badge
      if (isSiteWhitelisted) {
        whitelistBtn.textContent = 'Unwhitelist';
        whitelistBtn.className = 'btn btn-secondary btn-sm';
        riskBadge.textContent = 'WHITELISTED';
        riskBadge.className = 'risk-badge risk-medium';
      } else {
        whitelistBtn.textContent = 'Whitelist Site';
        whitelistBtn.className = 'btn btn-secondary btn-sm';

        // Count domain issues in logs
        const domainLogs = logs.filter(l => l.domain === activeTabDomain);
        if (domainLogs.some(l => l.riskLevel === 'HIGH' || l.riskLevel === 'CRITICAL')) {
          riskBadge.textContent = 'HIGH RISK';
          riskBadge.className = 'risk-badge risk-high';
        } else if (domainLogs.length > 0) {
          riskBadge.textContent = 'CAUTION';
          riskBadge.className = 'risk-badge risk-medium';
        } else {
          riskBadge.textContent = 'GUARDED';
          riskBadge.className = 'risk-badge risk-low';
        }
      }

      // Render Logs
      recentLogsContainer.innerHTML = '';
      if (logs.length === 0) {
        recentLogsContainer.innerHTML = '<div class="log-item empty">No recent digital footprints detected yet.</div>';
      } else {
        logs.slice(0, 5).forEach(log => {
          const div = document.createElement('div');
          div.className = 'log-item';
          const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          div.textContent = `[${time}] ${log.domain}: ${log.detail}`;
          recentLogsContainer.appendChild(div);
        });
      }
    });
  }

  await refreshUI();

  // Event Listeners
  masterToggle.addEventListener('change', async () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_ENABLED' }, () => {
      refreshUI();
    });
  });

  whitelistBtn.addEventListener('click', async () => {
    if (!activeTabDomain || activeTabDomain === 'Browser System') return;
    chrome.runtime.sendMessage({ type: 'TOGGLE_WHITELIST_DOMAIN', domain: activeTabDomain }, () => {
      refreshUI();
    });
  });

  poisonModeSelect.addEventListener('change', async () => {
    const newMode = poisonModeSelect.value;
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { poisonMode: newMode }
    }, () => {
      refreshUI();
    });
  });

  openOptionsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  emailReportBtn.addEventListener('click', async () => {
    chrome.runtime.sendMessage({ type: 'GENERATE_EMAIL_REPORT' }, (res) => {
      if (res && res.success && res.report) {
        // Open mailto link
        window.open(res.report.mailtoUrl, '_blank');
      }
    });
  });
});
