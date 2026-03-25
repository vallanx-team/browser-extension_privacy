// Vallanx Privacy Shield — Content Script
// Läuft vor dem Seitencode (run_at: document_start)

(async () => {
  const settings = await chrome.storage.sync.get({ antiFingerprintEnabled: true });
  if (!settings.antiFingerprintEnabled) return;
  injectFingerprintProtection();
})();

function injectFingerprintProtection() {
  const script = document.createElement('script');
  script.textContent = `(${fingerprintOverrides.toString()})();`;
  document.documentElement.appendChild(script);
  script.remove();
}

function fingerprintOverrides() {
  // Canvas Fingerprinting
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type, ...args) {
    const ctx = this.getContext('2d');
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, this.width, this.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i]   ^= Math.floor(Math.random() * 3);
        imageData.data[i+1] ^= Math.floor(Math.random() * 3);
        imageData.data[i+2] ^= Math.floor(Math.random() * 3);
      }
      ctx.putImageData(imageData, 0, 0);
    }
    return origToDataURL.apply(this, [type, ...args]);
  };

  // AudioContext Fingerprinting
  if (window.AudioContext || window.webkitAudioContext) {
    // Zufälligen Offset auf AudioBuffer.getChannelData anwenden
    const origGetChanData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function(channel) {
      const data = origGetChanData.call(this, channel);
      for (let i = 0; i < Math.min(data.length, 20); i++) {
        data[i] += (Math.random() - 0.5) * 1e-6;
      }
      return data;
    };
  }

  // Navigator-Properties randomisieren/verschleiern
  const navigatorOverrides = {
    hardwareConcurrency: [2, 4, 8][Math.floor(Math.random() * 3)],
    deviceMemory: [2, 4, 8][Math.floor(Math.random() * 3)],
    platform: 'Win32',
    languages: ['de-DE', 'de', 'en-US', 'en'],
  };
  for (const [key, value] of Object.entries(navigatorOverrides)) {
    try {
      Object.defineProperty(navigator, key, { get: () => value, configurable: true });
    } catch (_) {}
  }

  // Screen-Properties
  Object.defineProperty(screen, 'colorDepth',  { get: () => 24, configurable: true });
  Object.defineProperty(screen, 'pixelDepth',  { get: () => 24, configurable: true });

  // WebGL-Fingerprinting
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    if (param === 37445) return 'Intel Inc.';    // UNMASKED_VENDOR_WEBGL
    if (param === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
    return getParameter.call(this, param);
  };
}

(async () => {
  const s = await chrome.storage.sync.get({
    geolocationSpoofEnabled: false,
    geolocationLat: 48.8566,
    geolocationLon: 2.3522,
    dntEnabled: true
  });

  if (s.dntEnabled) {
    injectScript(`Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true });`);
  }

  if (s.geolocationSpoofEnabled) {
    const lat = parseFloat(String(s.geolocationLat).replace(',', '.'));
    const lon = parseFloat(String(s.geolocationLon).replace(',', '.'));
    if (!isNaN(lat) && !isNaN(lon)) {
      injectScript(`
        (function() {
          const _lat = ${lat};
          const _lon = ${lon};
          const fakePos = function(success) {
            success({
              coords: {
                latitude:         _lat,
                longitude:        _lon,
                accuracy:         10,
                altitude:         null,
                altitudeAccuracy: null,
                heading:          null,
                speed:            null
              },
              timestamp: Date.now()
            });
          };
          try {
            Object.defineProperty(navigator.geolocation, 'getCurrentPosition',
              { value: fakePos, configurable: true, writable: true });
            Object.defineProperty(navigator.geolocation, 'watchPosition',
              { value: function(success) { fakePos(success); return 0; }, configurable: true, writable: true });
          } catch(_) {
            navigator.geolocation.getCurrentPosition = fakePos;
            navigator.geolocation.watchPosition = function(success) { fakePos(success); return 0; };
          }
        })();
      `);
    }
  }
})();

function injectScript(code) {
  const s = document.createElement('script');
  s.textContent = code;
  document.documentElement.appendChild(s);
  s.remove();
}

// ─── Seitenspezifische Overrides ─────────────────────────────────────────────

(async () => {
  const { siteOverrides = {}, blockJs = false, blockPopups = true } = await chrome.storage.sync.get({
    siteOverrides: {},
    blockJs: false,
    blockPopups: true
  });
  const domain = location.hostname;
  const site = siteOverrides[domain] || {};

  const effectiveJs     = site.blockJs     ?? blockJs;
  const effectivePopups = site.blockPopups  ?? blockPopups;

  if (effectiveJs) {
    injectScript(`console.warn('[VPS] JavaScript-Blockierung aktiv (via declarativeNetRequest)')`);
  }
  if (effectivePopups) {
    injectScript(`window.open = function() { return null; };`);
  }
})();

// ─── Kosmetische UBS-Regeln (Element Hiding) ─────────────────────────────────

(async () => {
  const { blocklists } = await chrome.storage.sync.get({ blocklists: [] });
  const selectors = [];
  const hostname = location.hostname;

  for (const list of blocklists) {
    if (!list.enabled || !list.text) continue;
    for (const line of list.text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('!')) continue;
      const idx = trimmed.indexOf('##');
      if (idx === -1) continue;
      const domain = trimmed.slice(0, idx).trim();
      if (domain.startsWith('#')) continue;
      if (domain && !hostname.endsWith(domain)) continue;
      selectors.push(trimmed.slice(idx + 2));
    }
  }

  if (selectors.length === 0) return;
  applyCosmeticRules(selectors);

  const observer = new MutationObserver(() => applyCosmeticRules(selectors));
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();

function applyCosmeticRules(selectors) {
  for (const selector of selectors) {
    try {
      document.querySelectorAll(selector).forEach(el => { el.style.display = 'none'; });
    } catch (_) { /* invalid selector */ }
  }
}
