// Options JS - Command Center & Email Security Report

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  const reportTextArea = document.getElementById('reportTextArea');
  const generateReportBtn = document.getElementById('generateReportBtn');
  const launchMailtoBtn = document.getElementById('launchMailtoBtn');
  const downloadJsonReportBtn = document.getElementById('downloadJsonReportBtn');
  const copyReportBtn = document.getElementById('copyReportBtn');
  const copyNotification = document.getElementById('copyNotification');

  const optPoisonMode = document.getElementById('optPoisonMode');
  const optCustomMsg = document.getElementById('optCustomMsg');
  const optNotifications = document.getElementById('optNotifications');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const saveStatus = document.getElementById('saveStatus');

  const newDomainInput = document.getElementById('newDomainInput');
  const addDomainBtn = document.getElementById('addDomainBtn');
  const whitelistItems = document.getElementById('whitelistItems');

  const logsTableBody = document.getElementById('logsTableBody');
  const clearLogsBtn = document.getElementById('clearLogsBtn');

  let currentMailtoUrl = '';

  // Tab switching logic
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(target).classList.add('active');
    });
  });

  // Load and populate settings
  async function loadData() {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
      if (!res || !res.success || !res.data) return;

      const data = res.data;

      // Populate Settings Tab
      if (data.poisonMode) optPoisonMode.value = data.poisonMode;
      if (data.customPoisonMsg) optCustomMsg.value = data.customPoisonMsg;
      optNotifications.checked = data.notificationsEnabled !== false;

      // Populate Whitelist Tab
      renderWhitelist(data.whitelistedDomains || []);

      // Populate Audit Logs
      renderLogs(data.logs || []);

      // Generate initial email report
      refreshReport();
    });
  }

  function renderWhitelist(list) {
    whitelistItems.innerHTML = '';
    if (list.length === 0) {
      whitelistItems.innerHTML = '<div class="help-text">No domains whitelisted.</div>';
      return;
    }

    list.forEach(domain => {
      const div = document.createElement('div');
      div.className = 'whitelist-item';
      div.innerHTML = `
        <span>${domain}</span>
        <button class="btn btn-danger btn-sm remove-whitelist-btn" data-domain="${domain}">Remove</button>
      `;
      whitelistItems.appendChild(div);
    });

    document.querySelectorAll('.remove-whitelist-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const domainToRemove = e.target.dataset.domain;
        chrome.runtime.sendMessage({ type: 'TOGGLE_WHITELIST_DOMAIN', domain: domainToRemove }, () => {
          loadData();
        });
      });
    });
  }

  function renderLogs(logs) {
    logsTableBody.innerHTML = '';
    if (logs.length === 0) {
      logsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">No security logs recorded yet.</td></tr>';
      return;
    }

    logs.forEach(log => {
      const tr = document.createElement('tr');
      const dateStr = new Date(log.timestamp).toLocaleString();
      let riskColor = '#4ade80';
      if (log.riskLevel === 'MEDIUM') riskColor = '#fbbf24';
      if (log.riskLevel === 'HIGH' || log.riskLevel === 'CRITICAL') riskColor = '#f87171';

      tr.innerHTML = `
        <td style="white-space:nowrap; font-size:11px;">${dateStr}</td>
        <td><strong style="font-size:11px;">${log.type}</strong></td>
        <td><code>${log.domain}</code></td>
        <td><span style="color:${riskColor}; font-weight:bold;">${log.riskLevel}</span></td>
        <td style="font-size:12px;">${log.detail}</td>
      `;
      logsTableBody.appendChild(tr);
    });
  }

  function refreshReport() {
    chrome.runtime.sendMessage({ type: 'GENERATE_EMAIL_REPORT' }, (res) => {
      if (res && res.success && res.report) {
        reportTextArea.value = res.report.body;
        currentMailtoUrl = res.report.mailtoUrl;
      }
    });
  }

  await loadData();

  // Event Listeners
  generateReportBtn.addEventListener('click', refreshReport);

  launchMailtoBtn.addEventListener('click', () => {
    if (currentMailtoUrl) {
      window.open(currentMailtoUrl, '_blank');
    }
  });

  downloadJsonReportBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
      if (!res || !res.success || !res.data) return;
      const jsonStr = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tracker_cop_audit_report_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  copyReportBtn.addEventListener('click', () => {
    reportTextArea.select();
    navigator.clipboard.writeText(reportTextArea.value).then(() => {
      copyNotification.classList.remove('hidden');
      setTimeout(() => {
        copyNotification.classList.add('hidden');
      }, 3000);
    });
  });

  saveSettingsBtn.addEventListener('click', () => {
    const newSettings = {
      poisonMode: optPoisonMode.value,
      customPoisonMsg: optCustomMsg.value,
      notificationsEnabled: optNotifications.checked
    };

    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings: newSettings }, () => {
      saveStatus.textContent = 'Settings Saved!';
      setTimeout(() => {
        saveStatus.textContent = '';
      }, 3000);
      refreshReport();
    });
  });

  addDomainBtn.addEventListener('click', () => {
    let domain = newDomainInput.value.trim().toLowerCase();
    if (!domain) return;
    // Strip http:// or https:// or leading slashes if user pasted full URL
    try {
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        domain = new URL(domain).hostname;
      }
    } catch (e) {}
    domain = domain.replace(/^\/+|\/+$/g, '');

    chrome.runtime.sendMessage({ type: 'TOGGLE_WHITELIST_DOMAIN', domain }, () => {
      newDomainInput.value = '';
      loadData();
    });
  });

  clearLogsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all incident logs?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' }, () => {
        loadData();
      });
    }
  });
});
