// Tracker Cop Injected Poison Script (Executes in MAIN page execution world)
(function() {
  if (window.__TRACKER_COP_INJECTED__) return;
  window.__TRACKER_COP_INJECTED__ = true;

  console.log('👮 Tracker Cop active in main world - Guarding against canvas, audio, webgl & navigator fingerprinting!');

  // Helper to notify content script / background worker
  function notifyStealthDetection(technique, detail, riskLevel = 'HIGH') {
    try {
      window.postMessage({
        source: 'TRACKER_COP_MAIN',
        type: 'STEALTH_DETECTED',
        technique,
        detail,
        domain: window.location.hostname,
        riskLevel
      }, '*');
    } catch (e) {}
  }

  // 1. CANVAS FINGERPRINTING DEFENSE
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  HTMLCanvasElement.prototype.toDataURL = function(type, encoderOptions) {
    // Detect typical canvas fingerprinting size (e.g. text rendered on small canvas)
    if (this.width > 0 && this.height > 0) {
      notifyStealthDetection('Canvas Fingerprinting (toDataURL)', `Attempted to extract canvas canvas fingerprinting hash (${this.width}x${this.height})`);

      // Inject subtle noise into canvas before conversion
      const ctx = this.getContext('2d');
      if (ctx) {
        try {
          const imgData = originalGetImageData.call(ctx, 0, 0, Math.min(this.width, 10), Math.min(this.height, 10));
          for (let i = 0; i < imgData.data.length; i += 4) {
            imgData.data[i] = imgData.data[i] ^ (Math.floor(Math.random() * 3) + 1); // subtle pixel tweak
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (e) {}
      }
    }
    return originalToDataURL.apply(this, arguments);
  };

  CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
    if (w > 0 && h > 0) {
      notifyStealthDetection('Canvas Fingerprinting (getImageData)', `Attempted to read canvas image pixels at (${x},${y},${w},${h})`, 'MEDIUM');
    }
    const res = originalGetImageData.apply(this, arguments);
    // Poison image data with minor decoy noise
    if (res && res.data && res.data.length > 4) {
      res.data[0] = (res.data[0] + 1) % 256;
      res.data[1] = (res.data[1] + 2) % 256;
    }
    return res;
  };

  // 2. AUDIO CONTEXT FINGERPRINTING DEFENSE
  if (window.AudioContext || window.webkitAudioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const originalGetChannelData = AudioBuffer.prototype.getChannelData;

    AudioBuffer.prototype.getChannelData = function(channel) {
      notifyStealthDetection('Audio Context Fingerprinting', 'Attempted channel data extraction for audio signature', 'HIGH');
      const data = originalGetChannelData.apply(this, arguments);
      if (data && data.length > 100) {
        // Inject decoy noise into audio data buffer
        for (let i = 0; i < 20; i++) {
          const idx = Math.floor(Math.random() * data.length);
          data[idx] += 0.0000001 * (Math.random() - 0.5);
        }
      }
      return data;
    };
  }

  // 3. NAVIGATOR & HARDWARE SPOOFING
  try {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,
      configurable: true
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
      configurable: true
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en', 'fr'],
      configurable: true
    });
  } catch (e) {}

  // 4. WEBGL FINGERPRINTING DEFENSE
  try {
    const getParameterOriginal = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // 37445 = UNMASKED_VENDOR_WEBGL, 37446 = UNMASKED_RENDERER_WEBGL
      if (parameter === 37445) {
        notifyStealthDetection('WebGL Fingerprinting', 'Attempted to query UNMASKED_VENDOR_WEBGL', 'HIGH');
        return 'TrackerCop Shielded Graphics Vendor';
      }
      if (parameter === 37446) {
        notifyStealthDetection('WebGL Fingerprinting', 'Attempted to query UNMASKED_RENDERER_WEBGL', 'HIGH');
        return 'Decoy Engine Police Edition - Try Getting A Job It Pays Bills!';
      }
      return getParameterOriginal.apply(this, arguments);
    };
  } catch (e) {}

  // 5. DOCUMENT.COOKIE SPOOFING & DUMMY FEEDING IN MAIN WORLD
  try {
    const originalCookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') || Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
    if (originalCookieDesc && originalCookieDesc.set) {
      Object.defineProperty(document, 'cookie', {
        get: function() {
          return originalCookieDesc.get.call(this);
        },
        set: function(val) {
          if (typeof val === 'string') {
            const lowerVal = val.toLowerCase();
            const trackerPatterns = ['_ga', '_gid', '_fbp', '_fbc', '_hj', 'criteo', 'segment', '_mixpanel', 'pixel'];
            if (trackerPatterns.some(p => lowerVal.includes(p))) {
              notifyStealthDetection('Script Cookie Tracking', `Script attempted setting tracking cookie: ${val.split(';')[0]}`, 'HIGH');
              // Replace value with decoy sarcastic message while preserving original cookie attributes
              const cookieParts = val.split(';');
              const keyVal = cookieParts[0].split('=');
              if (keyVal.length >= 2) {
                const cookieName = keyVal[0].trim();
                const attributes = cookieParts.slice(1).join(';');
                val = `${cookieName}=POLICE_DECIPHERED_FAKE_Instead_of_tracking_try_getting_a_job_it_pays_bills${attributes ? ';' + attributes : ''}`;
              }
            }
          }
          return originalCookieDesc.set.call(this, val);
        },
        configurable: true
      });
    }
  } catch (e) {}

})();
