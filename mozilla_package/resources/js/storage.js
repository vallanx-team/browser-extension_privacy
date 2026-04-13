/**
 * Vallanx Privacy Shield — Storage Schema
 * Alle Einstellungen mit Default-Werten.
 */
const DEFAULTS = {
  // Metadaten
  language: 'en',
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
    const syncDefaults = Object.fromEntries(Object.entries(DEFAULTS).filter(([k]) => k !== 'blocklists'));
    chrome.storage.sync.get(syncDefaults, syncResult => {
      chrome.storage.local.get({ blocklists: [] }, localResult => {
        resolve({ ...syncResult, blocklists: localResult.blocklists });
      });
    });
  });
}

export async function setSetting(key, value) {
  if (key === 'blocklists') {
    return new Promise(resolve => chrome.storage.local.set({ [key]: value }, resolve));
  }
  return new Promise(resolve => chrome.storage.sync.set({ [key]: value }, resolve));
}

// ─── IndexedDB for large blocklist text ──────────────────────────────────────

function openBlocklistDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('vallanx-blocklists', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('texts', { keyPath: 'id' });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

export async function setBlocklistText(id, text) {
  const db = await openBlocklistDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('texts', 'readwrite');
    tx.objectStore('texts').put({ id, text });
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}

export async function getBlocklistText(id) {
  const db = await openBlocklistDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('texts', 'readonly');
    const req = tx.objectStore('texts').get(id);
    req.onsuccess = e => resolve(e.target.result?.text ?? '');
    req.onerror = e => reject(e.target.error);
  });
}

export async function deleteBlocklistText(id) {
  const db = await openBlocklistDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('texts', 'readwrite');
    tx.objectStore('texts').delete(id);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
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