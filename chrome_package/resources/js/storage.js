/**
 * Vallanx Privacy Shield — Storage Schema
 * Alle Einstellungen mit Default-Werten.
 */
const DEFAULTS = {
  // Metadaten
  language: 'de',
  theme: 'auto',           // 'light' | 'dark' | 'auto'
  colorblindMode: false,
  simpleLang: false,
  lowBandwidth: false,

  // Privacy Features
  antiFingerprintEnabled: true,
  dntEnabled: true,
  geolocationSpoofEnabled: false,
  geolocationLat: 48.8566,
  geolocationLon: 2.3522,
  userAgentEnabled: false,
  userAgentString: '',
  ipHeaderEnabled: false,
  ipHeaderValue: '',

  // Content Controls (global)
  blockJs: false,
  blockPopups: true,
  blockMedia: false,
  blockMediaSizeKb: 500,
  blockFonts: false,
  blockCosmeticFilter: false,
  disablePrefetch: true,
  disableHyperlinkAudit: true,
  hidePlaceholders: false,

  // Per-site overrides: { "example.com": { blockJs: true, ... } }
  siteOverrides: {},

  // Blocklists: Array of { id, name, url|text, type: 'block'|'allow'|'parental', enabled }
  blocklists: [],

  // Proxy
  proxyEnabled: false,
  proxyHost: '',
  proxyPort: '',
  proxyUsername: '',
  proxyPassword: '',

  // Parental Controls
  parentalEnabled: false,
  parentalPasswordHash: '',
  parentalStartTime: '08:00',
  parentalEndTime:   '20:00',
  parentalTimezone:  'Europe/Berlin',
};

export async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get(DEFAULTS, result => resolve(result));
  });
}

export async function setSetting(key, value) {
  return new Promise(resolve => {
    chrome.storage.sync.set({ [key]: value }, resolve);
  });
}

export async function getStats() {
  return new Promise(resolve => {
    chrome.storage.local.get({
      stats: { blockedRequests: 0, blockedMb: 0, savedMs: 0 }
    }, r => resolve(r.stats));
  });
}

export async function incrementStats(requests, mb, ms) {
  const stats = await getStats();
  await new Promise(resolve => {
    chrome.storage.local.set({
      stats: {
        blockedRequests: stats.blockedRequests + requests,
        blockedMb: stats.blockedMb + mb,
        savedMs: stats.savedMs + ms
      }
    }, resolve);
  });
}
