import { getSettings, setSetting, getStats } from '../resources/js/storage.js';
import { formatMb, formatMs } from '../resources/js/stats.js';

async function init() {
  applyTheme();
  await loadStats();
  await loadToggles();
  const hostname = await getCurrentHostname();
  if (hostname) await loadSiteToggles(hostname);
  bindEvents(hostname);
}

async function applyTheme() {
  const s = await getSettings();
  document.documentElement.setAttribute('data-theme',
    s.theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : s.theme
  );
}

async function loadStats() {
  const stats = await getStats();
  document.getElementById('stat-blocked').textContent = stats.blockedRequests.toLocaleString();
  document.getElementById('stat-mb').textContent = formatMb(stats.blockedMb);
  document.getElementById('stat-time').textContent = formatMs(stats.savedMs);
}

async function loadToggles() {
  const s = await getSettings();
  document.getElementById('toggle-fingerprint').checked = s.antiFingerprintEnabled;
  document.getElementById('toggle-dnt').checked = s.dntEnabled;
}

async function getCurrentHostname() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.url ? new URL(tab.url).hostname : null;
  } catch {
    return null;
  }
}

async function loadSiteToggles(hostname) {
  document.getElementById('site-label').textContent = hostname;
  const { siteOverrides = {} } = await chrome.storage.sync.get({ siteOverrides: {} });
  const site = siteOverrides[hostname] || {};
  document.getElementById('toggle-site-js').checked     = site.blockJs     ?? false;
  document.getElementById('toggle-site-popups').checked = site.blockPopups ?? true;
}

function bindEvents(hostname) {
  document.getElementById('toggle-fingerprint').addEventListener('change', e =>
    setSetting('antiFingerprintEnabled', e.target.checked));

  document.getElementById('toggle-dnt').addEventListener('change', e =>
    setSetting('dntEnabled', e.target.checked));

  if (hostname) {
    const bindSite = async (id, key) => {
      document.getElementById(id).addEventListener('change', async e => {
        const { siteOverrides = {} } = await chrome.storage.sync.get({ siteOverrides: {} });
        siteOverrides[hostname] = { ...(siteOverrides[hostname] || {}), [key]: e.target.checked };
        await chrome.storage.sync.set({ siteOverrides });
      });
    };
    bindSite('toggle-site-js', 'blockJs');
    bindSite('toggle-site-popups', 'blockPopups');
  }

  document.getElementById('btn-report').addEventListener('click', reportSuspicious);

  document.getElementById('btn-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  });
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
    btn.textContent = chrome.i18n.getMessage('reportSent') || 'Gesendet ✓';
  } catch {
    btn.textContent = chrome.i18n.getMessage('reportError') || 'Fehler ✗';
  }
}

init();
