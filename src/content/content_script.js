// Tracker Cop Content Script - Isolated World

(function() {
  if (window.__TRACKER_COP_CONTENT_SCRIPT__) return;
  window.__TRACKER_COP_CONTENT_SCRIPT__ = true;

  console.log('[Tracker Cop Content Script] Initialized on domain:', window.location.hostname);

  // Inject main world script into web page
  function injectMainWorldScript() {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('src/content/injected_poison.js');
      script.onload = function() {
        this.remove();
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.warn('[Tracker Cop] Script injection error:', e);
    }
  }

  injectMainWorldScript();

  // Listen for messages from injected main world script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.source === 'TRACKER_COP_MAIN') {
      if (event.data.type === 'STEALTH_DETECTED') {
        // Forward to background service worker
        chrome.runtime.sendMessage({
          type: 'REPORT_STEALTH_TRACKER',
          domain: event.data.domain || window.location.hostname,
          technique: event.data.technique,
          detail: event.data.detail,
          riskLevel: event.data.riskLevel || 'HIGH'
        }).catch(err => {
          // Extension context may be invalidated during page reload
        });
      }
    }
  });

  // Scan document for known dynamic inline tracking pixels & hidden scripts
  function scanPageTrackers() {
    try {
      const scripts = document.querySelectorAll('script[src]');
      const trackerPatterns = ['google-analytics.com', 'doubleclick.net', 'connect.facebook.net', 'hotjar.com', 'criteo.com', 'outbrain.com', 'taboola.com'];

      scripts.forEach(script => {
        const src = script.src.toLowerCase();
        if (trackerPatterns.some(p => src.includes(p))) {
          chrome.runtime.sendMessage({
            type: 'RECORD_BLOCK_EVENT',
            domain: window.location.hostname,
            url: script.src
          }).catch(() => {});
        }
      });
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanPageTrackers);
  } else {
    scanPageTrackers();
  }
})();
