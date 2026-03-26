// Vallanx Privacy Shield — Content Script (Isolated World)
// Liest Einstellungen aus dem Storage und übermittelt sie via CustomEvent
// an content-main.js (MAIN world). Behandelt außerdem kosmetische CSS-Regeln.

(async () => {
  const s = await chrome.storage.sync.get({
    antiFingerprintEnabled: true,
    geolocationSpoofEnabled: false,
    geolocationLat: 48.8566,
    geolocationLon: 2.3522,
    dntEnabled: true,
    blockPopups: true,
    blockJs: false,
    siteOverrides: {},
    userAgentEnabled: false,
    userAgentString: '',
    disablePrefetch: true,
    disableHyperlinkAudit: true,
    lowBandwidth: false,
  });

  const domain = location.hostname;
  const site   = s.siteOverrides[domain] || {};

  const effectiveFingerprint = site.antiFingerprintEnabled ?? s.antiFingerprintEnabled;
  const effectiveDnt         = site.dntEnabled             ?? s.dntEnabled;
  const effectivePopups      = site.blockPopups            ?? s.blockPopups;
  const effectiveJsBlock     = site.blockJs                ?? s.blockJs;

  const lat = parseFloat(String(s.geolocationLat).replace(',', '.'));
  const lon = parseFloat(String(s.geolocationLon).replace(',', '.'));

  document.dispatchEvent(new CustomEvent('__vps_apply__', {
    detail: {
      antiFingerprintEnabled: effectiveFingerprint,
      geolocationSpoofEnabled: s.geolocationSpoofEnabled && !isNaN(lat) && !isNaN(lon),
      lat: isNaN(lat) ? 0 : lat,
      lon: isNaN(lon) ? 0 : lon,
      dntEnabled:       effectiveDnt,
      blockPopups:      effectivePopups,
      blockJsWarn:      effectiveJsBlock,
      userAgentEnabled: s.userAgentEnabled,
      userAgentString:  s.userAgentString,
    },
  }));

  // disablePrefetch: entfernt <link rel="prefetch|prerender|dns-prefetch|preconnect">
  if (s.disablePrefetch || s.lowBandwidth) {
    const PREFETCH_RELS = new Set(['prefetch', 'prerender', 'dns-prefetch', 'preconnect']);
    const removePrefetchLinks = () => {
      document.querySelectorAll('link[rel]').forEach(el => {
        if (el.rel.split(/\s+/).some(r => PREFETCH_RELS.has(r))) el.remove();
      });
    };
    removePrefetchLinks();
    new MutationObserver(removePrefetchLinks)
      .observe(document.documentElement, { childList: true, subtree: true });
  }

  // disableHyperlinkAudit: entfernt ping-Attribut von <a>-Tags (zusätzlich zum DNR-Block)
  if (s.disableHyperlinkAudit) {
    const removePingAttrs = () => {
      document.querySelectorAll('a[ping]').forEach(el => el.removeAttribute('ping'));
    };
    removePingAttrs();
    new MutationObserver(removePingAttrs)
      .observe(document.documentElement, { childList: true, subtree: true });
  }
})();

// ─── Kosmetische UBS-Regeln (Element Hiding) ─────────────────────────────────

(async () => {
  const { blocklists } = await chrome.storage.sync.get({ blocklists: [] });
  const selectors = [];
  const hostname  = location.hostname;

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
    } catch (_) { /* ungültiger Selektor */ }
  }
}
