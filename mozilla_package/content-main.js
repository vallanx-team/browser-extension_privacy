// Vallanx Privacy Shield — Main World Content Script
// Läuft im MAIN world (Seiten-Kontext) — direkter Zugriff auf Seiten-APIs

(function () {
  'use strict';

  // Per-Session Noise (einmalig, stabil pro Seitenladen)
  const _noiseTable = new Uint8Array(256);
  crypto.getRandomValues(_noiseTable);
  for (let i = 0; i < _noiseTable.length; i++) _noiseTable[i] %= 3;
  const _audioOffset = (Math.random() - 0.5) * 1e-6;

  // Geolocation catch & buffer

  const _origGet   = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  const _origWatch = navigator.geolocation.watchPosition.bind(navigator.geolocation);

  const _pending = [];   // gepufferte Calls, bevor Settings ankommen
  let _ready        = false;
  let _spoofEnabled = false;
  let _lat          = 0;
  let _lon          = 0;

  function _fakePos(success) {
    success({
      coords: {
        latitude:         _lat,
        longitude:        _lon,
        accuracy:         10,
        altitude:         null,
        altitudeAccuracy: null,
        heading:          null,
        speed:            null,
      },
      timestamp: Date.now(),
    });
  }

  try {
    Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
      configurable: true,
      writable: true,
      value: function (success, error, options) {
        if (!_ready) { _pending.push({ type: 'get', a: [success, error, options] }); return; }
        _spoofEnabled ? _fakePos(success) : _origGet(success, error, options);
      },
    });
    Object.defineProperty(navigator.geolocation, 'watchPosition', {
      configurable: true,
      writable: true,
      value: function (success, error, options) {
        if (!_ready) { _pending.push({ type: 'watch', a: [success, error, options] }); return 0; }
        if (_spoofEnabled) { _fakePos(success); return 0; }
        return _origWatch(success, error, options);
      },
    });
  } catch (_) {}

  // Settings Event getting from Isolated-World-Script
  document.addEventListener('__vps_apply__', function (e) {
    const s = e.detail;

    // Geolocation
    _spoofEnabled = !!s.geolocationSpoofEnabled;
    _lat          = s.lat || 0;
    _lon          = s.lon || 0;
    _ready        = true;

    // Gepufferte Calls abspielen
    for (const call of _pending) {
      const [success, error, options] = call.a;
      if (_spoofEnabled) {
        _fakePos(success);
      } else {
        call.type === 'get'
          ? _origGet(success, error, options)
          : _origWatch(success, error, options);
      }
    }
    _pending.length = 0;

    // GPC / Do-Not-Track
    if (s.dntEnabled) {
      try {
        Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true, configurable: true });
      } catch (_) {}
    }

    // User-Agent JS-Property (konsistent mit HTTP-Header aus background.js)
    if (s.userAgentEnabled && s.userAgentString) {
      try {
        const ua     = s.userAgentString;
        const vendor = ua.includes('Firefox') ? '' : 'Google Inc.';
        Object.defineProperty(navigator, 'userAgent',  { get: () => ua, configurable: true });
        Object.defineProperty(navigator, 'appVersion', { get: () => ua.replace(/^Mozilla\//, ''), configurable: true });
        Object.defineProperty(navigator, 'vendor',     { get: () => vendor, configurable: true });
      } catch (_) {}
    }

    // Popup Blocking
    if (s.blockPopups) {
      try {
        Object.defineProperty(window, 'open', {
          value: function () { return null; },
          configurable: true,
          writable: true,
        });
      } catch (_) {}
    }

    // Anti-Fingerprinting
    if (s.antiFingerprintEnabled) {
      _applyFingerprintProtection();
    }
  });


  // Anti-Fingerprinting
  function _applyFingerprintProtection() {

    // Canvas — deterministische Rausch-Tabelle, Original bleibt unverändert.
    // drawImage statt getImageData auf dem Quell-Canvas → kein willReadFrequently-Warning.
    function _getNoisyCanvas(src) {
      if (src.width === 0 || src.height === 0) return src;
      const tmp = document.createElement('canvas');
      tmp.width  = src.width;
      tmp.height = src.height;
      const tmpCtx = tmp.getContext('2d', { willReadFrequently: true });
      tmpCtx.drawImage(src, 0, 0);
      const imageData = tmpCtx.getImageData(0, 0, src.width, src.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const ni = (i >>> 2) & 255;
        d[i]     ^= _noiseTable[ni];
        d[i + 1] ^= _noiseTable[(ni + 85)  & 255];
        d[i + 2] ^= _noiseTable[(ni + 170) & 255];
      }
      tmpCtx.putImageData(imageData, 0, 0);
      return tmp;
    }

    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (type, ...args) {
      return origToDataURL.apply(_getNoisyCanvas(this), [type, ...args]);
    };

    const origToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      origToBlob.call(_getNoisyCanvas(this), callback, type, quality);
    };

    // AudioContext — stabiler Offset pro Session, jedes Float32Array nur einmal
    const _processedAudio = new WeakSet();
    const origGetChanData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function (channel) {
      const data = origGetChanData.call(this, channel);
      if (!_processedAudio.has(data)) {
        _processedAudio.add(data);
        for (let i = 0; i < data.length; i++) data[i] += _audioOffset;
      }
      return data;
    };

    // Navigator
    const navOverrides = {
      hardwareConcurrency: [2, 4, 8][Math.floor(Math.random() * 3)],
      deviceMemory:        [2, 4, 8][Math.floor(Math.random() * 3)],
      platform:            'Win32',
      languages:           ['de-DE', 'de', 'en-US', 'en'],
    };
    for (const [key, value] of Object.entries(navOverrides)) {
      try { Object.defineProperty(navigator, key, { get: () => value, configurable: true }); } catch (_) {}
    }

    // Screen
    const screenOverrides = {
      colorDepth:  24,
      pixelDepth:  24,
      width:       1920,
      height:      1080,
      availWidth:  1920,
      availHeight: 1040,
    };
    for (const [key, value] of Object.entries(screenOverrides)) {
      try { Object.defineProperty(screen, key, { get: () => value, configurable: true }); } catch (_) {}
    }

    // devicePixelRatio
    try {
      Object.defineProperty(window, 'devicePixelRatio', { get: () => 1, configurable: true });
    } catch (_) {}

    // WebGL v1 + v2
    function _patchWebGL(proto) {
      const orig = proto.getParameter;
      proto.getParameter = function (param) {
        if (param === 37445) return 'Intel Inc.';
        if (param === 37446) return 'Intel Iris OpenGL Engine';
        return orig.call(this, param);
      };
    }
    _patchWebGL(WebGLRenderingContext.prototype);
    if (typeof WebGL2RenderingContext !== 'undefined') {
      _patchWebGL(WebGL2RenderingContext.prototype);
    }
  }

})();