import { getSettings, setSetting, getStats, getBlocklistText, setBlocklistText } from '../resources/js/storage.js';
import { formatElements, formatMb, formatMs } from '../resources/js/stats.js';
import { loadI18n, t, applyI18n } from '../resources/js/i18n.js';

async function init() {
  const s = await getSettings();
  await loadI18n(s.language || 'en', s.simpleLang || false);
  applyI18n();
  applyTheme(s);
  await loadStats();
  const hostname = await getCurrentHostname();
  await loadToggles(s, hostname);
  bindEvents(hostname);
}

function applyTheme(s) {
  document.documentElement.setAttribute('data-theme',
    s.theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : s.theme
  );
  document.documentElement.setAttribute('data-colorblind', s.colorblindMode ? 'true' : 'false');
}

async function loadStats() {
  const stats = await getStats();
  // document.getElementById('stat-blocked').textContent = stats.blockedRequests.toLocaleString();
  document.getElementById('stat-blocked').textContent = formatElements(stats.blockedRequests).toLocaleString();
  document.getElementById('stat-mb').textContent = formatMb(stats.blockedMb);
  document.getElementById('stat-time').textContent = formatMs(stats.savedMs);
}

async function getCurrentHostname() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.url ? new URL(tab.url).hostname : null;
  } catch {
    return null;
  }
}

async function loadToggles(s, hostname) {
  let site = {};
  if (hostname) {
    document.getElementById('site-label').textContent = hostname;
    const { siteOverrides = {} } = await chrome.storage.sync.get({ siteOverrides: {} });
    site = siteOverrides[hostname] || {};
    document.getElementById('toggle-site-js').checked     = site.blockJs     ?? false;
    document.getElementById('toggle-site-popups').checked = site.blockPopups ?? true;
  }
  // Globaler Default, per-site Override möglich
  document.getElementById('toggle-fingerprint').checked = site.antiFingerprintEnabled ?? s.antiFingerprintEnabled;
  document.getElementById('toggle-dnt').checked         = site.dntEnabled             ?? s.dntEnabled;
}

function bindEvents(hostname) {
  // Speichert per-site Override wenn hostname bekannt, sonst globaler Fallback
  const bindToggle = (id, key, { siteOnly = false, reloadOnChange = false } = {}) => {
    document.getElementById(id).addEventListener('change', async e => {
      if (hostname) {
        const { siteOverrides = {} } = await chrome.storage.sync.get({ siteOverrides: {} });
        siteOverrides[hostname] = { ...(siteOverrides[hostname] || {}), [key]: e.target.checked };
        await chrome.storage.sync.set({ siteOverrides });
        if (reloadOnChange) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) chrome.tabs.reload(tab.id);
        }
      } else if (!siteOnly) {
        await setSetting(key, e.target.checked);
      }
    });
  };

  bindToggle('toggle-fingerprint', 'antiFingerprintEnabled');
  bindToggle('toggle-dnt',         'dntEnabled');
  bindToggle('toggle-site-js',     'blockJs',     { siteOnly: true, reloadOnChange: true });
  bindToggle('toggle-site-popups', 'blockPopups', { siteOnly: true });

  document.getElementById('btn-report').addEventListener('click', reportSuspicious);

  document.getElementById('btn-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  });
}

const REPORTED_LIST_ID = 'vallanx-reported';
const SKIP_SCHEMES = ['chrome:', 'chrome-extension:', 'moz-extension:', 'edge:', 'about:', 'data:', 'blob:'];

async function addToLocalBlacklist(url) {
  let entry;
  try {
    const parsed = new URL(url);
    if (SKIP_SCHEMES.includes(parsed.protocol)) return;
    const hostname = parsed.hostname;
    if (!hostname) return;
    const pathname = parsed.pathname;
    entry = (pathname && pathname !== '/') ? `||${hostname}${pathname}^` : hostname;
  } catch {
    return;
  }

  const settings = await getSettings();
  const exists = settings.blocklists.find(l => l.id === REPORTED_LIST_ID);

  if (!exists) {
    await setBlocklistText(REPORTED_LIST_ID, entry);
    settings.blocklists.push({ id: REPORTED_LIST_ID, name: 'Reported URLs', type: 'block', url: '', enabled: true });
  } else {
    const current = await getBlocklistText(REPORTED_LIST_ID);
    const lines = current.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.includes(entry)) return;
    lines.push(entry);
    await setBlocklistText(REPORTED_LIST_ID, lines.join('\n'));
    exists.lastReported = Date.now();
  }

  await setSetting('blocklists', settings.blocklists);
}

async function reportSuspicious() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const btn = document.getElementById('btn-report');
  btn.disabled = true;
  try {
    await fetch('https://vallanx.com/listener/suspicious_content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ URL: tab.url, 'User-IP': '', sourcetype: 'browser_extension' })
    });
    await addToLocalBlacklist(tab.url);
    btn.textContent = t('reportSent');
  } catch {
    btn.textContent = t('reportError');
  }
}

init();
