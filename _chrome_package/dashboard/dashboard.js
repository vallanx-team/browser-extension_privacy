import { getSettings, setSetting, getStats } from '../resources/js/storage.js';
import { formatMb, formatMs } from '../resources/js/stats.js';

// ─── Tab Navigation ──────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ─── Init ────────────────────────────────────────────────────────────────────

async function init() {
  const s = await getSettings();
  document.documentElement.setAttribute('data-theme',
    s.theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : s.theme
  );

  const stats = await getStats();
  document.getElementById('stat-blocked-big').textContent = stats.blockedRequests.toLocaleString();
  document.getElementById('stat-mb-big').textContent = formatMb(stats.blockedMb);
  document.getElementById('stat-time-big').textContent = formatMs(stats.savedMs);

  await loadNetworkLog();
  await loadSettings(s);
  await renderFilterLists();
  bindSettingsEvents();
  bindFilterEvents();
  bindExportImportEvents();
}

// ─── Network Log ─────────────────────────────────────────────────────────────

async function loadNetworkLog() {
  const { networkLog = [] } = await chrome.storage.local.get({ networkLog: [] });
  const container = document.getElementById('network-log');
  if (networkLog.length === 0) {
    container.textContent = 'Kein Netzwerkprotokoll vorhanden.';
    return;
  }
  container.innerHTML = networkLog.map(e => {
    const time = new Date(e.timestamp).toLocaleTimeString();
    const icon = e.type === 'blocked' ? '🚫' : '✓';
    return `<div>${icon} [${time}] ${e.url}</div>`;
  }).join('');
}

// ─── Settings ────────────────────────────────────────────────────────────────

async function loadSettings(s) {
  document.getElementById('setting-theme').value = s.theme;
  document.getElementById('setting-colorblind').checked = s.colorblindMode;
  document.getElementById('setting-simple-lang').checked = s.simpleLang;
  document.getElementById('setting-language').value = s.language;

  document.getElementById('s-fingerprint').checked = s.antiFingerprintEnabled;
  document.getElementById('s-dnt').checked = s.dntEnabled;
  document.getElementById('s-geo').checked = s.geolocationSpoofEnabled;
  document.getElementById('s-geo-lat').value = s.geolocationLat;
  document.getElementById('s-geo-lon').value = s.geolocationLon;
  document.getElementById('s-ua').checked = s.userAgentEnabled;
  document.getElementById('s-ua-string').value = s.userAgentString;
  document.getElementById('s-ip').checked = s.ipHeaderEnabled;
  document.getElementById('s-ip-value').value = s.ipHeaderValue;

  document.getElementById('s-block-js').checked = s.blockJs;
  document.getElementById('s-block-popups').checked = s.blockPopups;
  document.getElementById('s-block-media').checked = s.blockMedia;
  document.getElementById('s-media-size').value = s.blockMediaSizeKb;
  document.getElementById('s-block-fonts').checked = s.blockFonts;
  document.getElementById('s-prefetch').checked = s.disablePrefetch;
  document.getElementById('s-hyperlink').checked = s.disableHyperlinkAudit;
  document.getElementById('s-low-bandwidth').checked = s.lowBandwidth;

  document.getElementById('s-proxy-host').value = s.proxyHost;
  document.getElementById('s-proxy-port').value = s.proxyPort;
  document.getElementById('s-proxy-user').value = s.proxyUsername;
  document.getElementById('s-proxy-pass').value = s.proxyPassword;
  updateProxyStatus(s.proxyEnabled);
}

function updateProxyStatus(enabled) {
  const dot = document.getElementById('proxy-status-dot');
  const text = document.getElementById('proxy-status-text');
  const btn = document.getElementById('s-proxy-toggle');
  dot.className = `status-dot ${enabled ? 'green' : 'red'}`;
  text.textContent = enabled ? 'Aktiv' : 'Inaktiv';
  btn.textContent = enabled ? 'Proxy deaktivieren' : 'Proxy aktivieren';
}

function bindSettingsEvents() {
  const bind = (id, key, type = 'checkbox') => {
    const el = document.getElementById(id);
    el.addEventListener('change', () => setSetting(key, type === 'checkbox' ? el.checked : el.value));
  };

  bind('setting-theme', 'theme', 'select');
  bind('setting-colorblind', 'colorblindMode');
  bind('setting-simple-lang', 'simpleLang');
  bind('setting-language', 'language', 'select');
  bind('s-fingerprint', 'antiFingerprintEnabled');
  bind('s-dnt', 'dntEnabled');
  bind('s-geo', 'geolocationSpoofEnabled');
  bind('s-geo-lat', 'geolocationLat', 'number');
  bind('s-geo-lon', 'geolocationLon', 'number');
  bind('s-ua', 'userAgentEnabled');
  bind('s-ua-string', 'userAgentString', 'text');
  bind('s-ip', 'ipHeaderEnabled');
  bind('s-ip-value', 'ipHeaderValue', 'text');
  bind('s-block-js', 'blockJs');
  bind('s-block-popups', 'blockPopups');
  bind('s-block-media', 'blockMedia');
  bind('s-media-size', 'blockMediaSizeKb', 'number');
  bind('s-block-fonts', 'blockFonts');
  bind('s-prefetch', 'disablePrefetch');
  bind('s-hyperlink', 'disableHyperlinkAudit');
  bind('s-low-bandwidth', 'lowBandwidth');

  document.getElementById('s-proxy-toggle').addEventListener('click', async () => {
    const s = await getSettings();
    const proxyHost = document.getElementById('s-proxy-host').value.trim();
    const proxyPort = document.getElementById('s-proxy-port').value.trim();
    const enabled = !s.proxyEnabled;
    await setSetting('proxyEnabled', enabled);
    await setSetting('proxyHost', proxyHost);
    await setSetting('proxyPort', proxyPort);
    await setSetting('proxyUsername', document.getElementById('s-proxy-user').value.trim());
    await setSetting('proxyPassword', document.getElementById('s-proxy-pass').value.trim());
    updateProxyStatus(enabled);
  });
}

function bindExportImportEvents() {
  document.getElementById('btn-export').addEventListener('click', async () => {
    const settings = await getSettings();
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vallanx-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  });

  document.getElementById('btn-import').addEventListener('click', () =>
    document.getElementById('import-file').click());

  document.getElementById('import-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const imported = JSON.parse(text);
    await chrome.storage.sync.set(imported);
    location.reload();
  });
}

// ─── Filter Lists ─────────────────────────────────────────────────────────────

async function renderFilterLists() {
  const { blocklists } = await getSettings();
  const container = document.getElementById('filter-list-container');
  container.innerHTML = '';
  for (const list of blocklists) {
    const el = document.createElement('div');
    el.className = 'card';
    el.style.cssText = 'margin-bottom:8px;display:flex;align-items:center;justify-content:space-between';
    el.innerHTML = `
      <div>
        <strong>${list.name}</strong>
        <span style="font-size:11px;color:var(--text-muted);margin-left:8px">${list.type}</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="checkbox" ${list.enabled ? 'checked' : ''} data-id="${list.id}">
        <button class="btn btn-danger" style="padding:4px 10px;font-size:11px" data-delete="${list.id}">✕</button>
      </div>
    `;
    container.appendChild(el);
  }

  container.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', async e => {
      const settings = await getSettings();
      const list = settings.blocklists.find(l => l.id === e.target.dataset.id);
      if (list) { list.enabled = e.target.checked; await setSetting('blocklists', settings.blocklists); }
    });
  });

  container.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async e => {
      const settings = await getSettings();
      await setSetting('blocklists', settings.blocklists.filter(l => l.id !== e.target.dataset.delete));
      renderFilterLists();
    });
  });
}

function bindFilterEvents() {
  document.getElementById('btn-add-list').addEventListener('click', async () => {
    const name = document.getElementById('filter-name').value.trim();
    const type = document.getElementById('filter-type').value;
    const url  = document.getElementById('filter-url').value.trim();
    const text = document.getElementById('filter-text').value.trim();
    if (!name || (!url && !text)) return;

    let listText = text;
    if (url) {
      const resp = await fetch(url);
      listText = await resp.text();
    }

    const settings = await getSettings();
    settings.blocklists.push({ id: crypto.randomUUID(), name, type, url, text: listText, enabled: true });
    await setSetting('blocklists', settings.blocklists);
    renderFilterLists();
  });

  document.getElementById('btn-load-file').addEventListener('click', () =>
    document.getElementById('filter-file').click());

  document.getElementById('filter-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('filter-file-name').textContent = file.name;
    document.getElementById('filter-text').value = await file.text();
  });
}

init();
