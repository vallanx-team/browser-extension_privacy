// Vallanx Privacy Shield — Background Service Worker

import { getSettings, incrementStats, getBlocklistText } from './resources/js/storage.js';
import { parseUBS } from './resources/js/ubs-parser.js';
import { calcSavedMs } from './resources/js/stats.js';

// Privacy Header Rule IDs (reserved 1-3)
const PRIVACY_RULE_ID_DNT = 1;
const PRIVACY_RULE_ID_UA  = 2;
const PRIVACY_RULE_ID_IP  = 3;

// Content Blocking Rule IDs (reserved 4-6)
const CONTENT_RULE_ID_MEDIA = 4;
const CONTENT_RULE_ID_FONTS = 5;
const CONTENT_RULE_ID_PING  = 6;

// Per-site JS blocking Rule IDs (reserved 7-8)
const CONTENT_RULE_ID_JS_SCRIPTS = 7;
const CONTENT_RULE_ID_JS_CSP     = 8;

// Blocking rules start at ID 100
const BLOCK_RULE_ID_START = 100;

// ─── Privacy Headers ───────────────────────────────────────────────────────

async function initPrivacyHeaders() {
  const settings = await getSettings();
  const rules = [];

  // Per-site DNT overrides
  const dntOverrideOff = Object.entries(settings.siteOverrides)
    .filter(([, v]) => v.dntEnabled === false).map(([d]) => d);
  const dntOverrideOn  = Object.entries(settings.siteOverrides)
    .filter(([, v]) => v.dntEnabled === true).map(([d]) => d);

  if (settings.dntEnabled) {
    const condition = { resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'] };
    if (dntOverrideOff.length > 0) condition.excludedInitiatorDomains = dntOverrideOff;
    rules.push({
      id: PRIVACY_RULE_ID_DNT,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'DNT',     operation: 'set', value: '1' },
          { header: 'Sec-GPC', operation: 'set', value: '1' }
        ]
      },
      condition
    });
  } else if (dntOverrideOn.length > 0) {
    // Global DNT aus, aber einzelne Sites haben es explizit aktiviert
    rules.push({
      id: PRIVACY_RULE_ID_DNT,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'DNT',     operation: 'set', value: '1' },
          { header: 'Sec-GPC', operation: 'set', value: '1' }
        ]
      },
      condition: {
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'],
        initiatorDomains: dntOverrideOn
      }
    });
  }

  if (settings.userAgentEnabled && settings.userAgentString) {
    rules.push({
      id: PRIVACY_RULE_ID_UA,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [{ header: 'User-Agent', operation: 'set', value: settings.userAgentString }]
      },
      condition: { resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'] }
    });
  }

  if (settings.ipHeaderEnabled && settings.ipHeaderValue) {
    rules.push({
      id: PRIVACY_RULE_ID_IP,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [{ header: 'X-Forwarded-For', operation: 'set', value: settings.ipHeaderValue }]
      },
      condition: { resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'] }
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [PRIVACY_RULE_ID_DNT, PRIVACY_RULE_ID_UA, PRIVACY_RULE_ID_IP],
    addRules: rules
  });
}

// ─── Content Type Rules (media, fonts, ping) ───────────────────────────────

async function rebuildContentRules() {
  const s = await getSettings();
  const rules = [];

  // lowBandwidth forces both media and font blocking
  if (s.blockMedia || s.lowBandwidth) {
    rules.push({
      id: CONTENT_RULE_ID_MEDIA,
      priority: 1,
      action: { type: 'block' },
      condition: { resourceTypes: ['image', 'media'] }
    });
  }

  if (s.blockFonts || s.lowBandwidth) {
    rules.push({
      id: CONTENT_RULE_ID_FONTS,
      priority: 1,
      action: { type: 'block' },
      condition: { resourceTypes: ['font'] }
    });
  }

  // disableHyperlinkAudit: block <a ping="..."> requests at network level
  if (s.disableHyperlinkAudit) {
    rules.push({
      id: CONTENT_RULE_ID_PING,
      priority: 1,
      action: { type: 'block' },
      condition: { resourceTypes: ['ping'] }
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [CONTENT_RULE_ID_MEDIA, CONTENT_RULE_ID_FONTS, CONTENT_RULE_ID_PING],
    addRules: rules
  });
}

// ─── Per-Site JS Blocking ──────────────────────────────────────────────────

async function rebuildJsBlockRules() {
  const s = await getSettings();
  const rules = [];

  const blockedDomains = Object.entries(s.siteOverrides)
    .filter(([, v]) => v.blockJs)
    .map(([domain]) => domain);

  if (blockedDomains.length > 0) {
    // Block external script requests initiated from blocked domains
    rules.push({
      id: CONTENT_RULE_ID_JS_SCRIPTS,
      priority: 1,
      action: { type: 'block' },
      condition: {
        resourceTypes: ['script'],
        initiatorDomains: blockedDomains
      }
    });

    // Block inline scripts via CSP injection on page responses
    rules.push({
      id: CONTENT_RULE_ID_JS_CSP,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'Content-Security-Policy', operation: 'set', value: "script-src 'none'" }
        ]
      },
      condition: {
        resourceTypes: ['main_frame', 'sub_frame'],
        requestDomains: blockedDomains
      }
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [CONTENT_RULE_ID_JS_SCRIPTS, CONTENT_RULE_ID_JS_CSP],
    addRules: rules
  });
}

// ─── Content Blocking ──────────────────────────────────────────────────────

async function rebuildBlockingRules() {
  const settings = await getSettings();
  const newRules = [];
  let idCounter = BLOCK_RULE_ID_START;

  for (const list of settings.blocklists) {
    if (!list.enabled) continue;
    if (list.type === 'parental' && !settings.parentalEnabled) continue;
    // 4900 safe rules max — Chrome enforces a 5000 "unsafe rule" limit
    // (wildcard urlFilter rules count as unsafe). webNavigation covers the rest.
    const remaining = 4900 - (idCounter - BLOCK_RULE_ID_START);
    if (remaining <= 0) break;

    const text = await getBlocklistText(list.id);
    const parsed = parseUBS(text, remaining);

    for (const rule of parsed) {
      if (rule.type === 'cosmetic') continue;

      const cond = buildCondition(rule);
      if (!cond) continue;

      if (rule.type === 'allow') {
        newRules.push({
          id: idCounter++,
          priority: 2,
          action: { type: 'allow' },
          condition: cond
        });
      } else {
        const isMainFrameBlock = rule.matchType === 'domain' && !cond.resourceTypes;
        const blockedPage = list.type === 'parental'
          ? '/blocked/blocked-parental.html'
          : `/blocked/blocked.html?list=${encodeURIComponent(list.name)}`;
        newRules.push({
          id: idCounter++,
          priority: 1,
          action: isMainFrameBlock
            ? { type: 'redirect', redirect: { extensionPath: blockedPage } }
            : { type: 'block' },
          condition: isMainFrameBlock
            ? { ...cond, resourceTypes: ['main_frame'] }
            : cond
        });
      }
    }
  }

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const oldIds = existing.filter(r => r.id >= BLOCK_RULE_ID_START).map(r => r.id);

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldIds,
      addRules: newRules
    });
    console.log(`[VPS] Blocking rules updated: ${newRules.length} rules active`);
  } catch (err) {
    console.error('[VPS] updateDynamicRules failed:', err);
  }
}

function buildCondition(rule) {
  const cond = {};
  if (rule.matchType === 'domain') {
    cond.requestDomains = [rule.pattern];
  } else if (rule.matchType === 'wildcard') {
    cond.urlFilter = `*${rule.pattern.replace('*.', '.')}*`;
  }
  if (rule.thirdParty) cond.domainType = 'thirdParty';
  if (rule.resourceType) cond.resourceTypes = [rule.resourceType];

  // Safety guard: empty condition matches all URLs → skip
  if (!cond.requestDomains && !cond.urlFilter) return null;

  return cond;
}

// ─── Network Log ───────────────────────────────────────────────────────────

const MAX_LOG_ENTRIES = 200;

async function addLogEntry(entry) {
  const { networkLog = [] } = await chrome.storage.local.get({ networkLog: [] });
  networkLog.unshift({ ...entry, timestamp: Date.now() });
  if (networkLog.length > MAX_LOG_ENTRIES) networkLog.length = MAX_LOG_ENTRIES;
  await chrome.storage.local.set({ networkLog });
}

// ─── Statistics Tracking + Network Log (combined) ─────────────────────────

chrome.webRequest.onErrorOccurred.addListener(
  async (details) => {
    if (details.error === 'net::ERR_BLOCKED_BY_CLIENT') {
      const estimatedBytes = 50000;
      await incrementStats(1, estimatedBytes / (1024 * 1024), calcSavedMs(estimatedBytes));
      await addLogEntry({ type: 'blocked', url: details.url });
    }
  },
  { urls: ['<all_urls>'] }
);

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (details.type === 'main_frame') {
      await addLogEntry({ type: 'allowed', url: details.url, statusCode: details.statusCode });
    }
  },
  { urls: ['<all_urls>'] }
);

// ─── Proxy ─────────────────────────────────────────────────────────────────

async function applyProxy() {
  try {
    const s = await getSettings();
    if (s.proxyEnabled && s.proxyHost && s.proxyPort) {
      await chrome.proxy.settings.set({
        value: {
          mode: 'fixed_servers',
          rules: {
            singleProxy: {
              scheme: 'http',
              host: s.proxyHost,
              port: parseInt(s.proxyPort)
            },
            bypassList: ['localhost', '127.0.0.1']
          }
        },
        scope: 'regular'
      });
    } else {
      await chrome.proxy.settings.clear({ scope: 'regular' });
    }
  } catch (e) {
    console.error('[VPS] Proxy setup failed:', e);
  }
}

// ─── Parental Controls ─────────────────────────────────────────────────────

chrome.alarms.create('parentalCheck', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'parentalCheck') checkParentalTimeBlock();
});

function _toMinutes(hhmm) {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
}

async function checkParentalTimeBlock() {
  const s = await getSettings();
  if (!s.parentalEnabled) return;

  const startMin = _toMinutes(s.parentalStartTime);
  const endMin   = _toMinutes(s.parentalEndTime);

  try {
    const resp = await fetch(`https://worldtimeapi.org/api/timezone/${s.parentalTimezone}`);
    const data = await resp.json();
    const serverDt  = new Date(data.datetime);
    const serverMin = serverDt.getHours() * 60 + serverDt.getMinutes();
    if (serverMin < startMin || serverMin >= endMin) await blockAllTabs();
  } catch {
    // Fallback auf lokale Zeit wenn Zeitserver nicht erreichbar
    const now    = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (nowMin < startMin || nowMin >= endMin) await blockAllTabs();
  }
}

async function blockAllTabs() {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  for (const tab of tabs) {
    chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('blocked/blocked.html') });
  }
}

// ─── In-Memory Domain Sets (webNavigation blocking) ────────────────────────

let blockDomains    = null; // Set<string> — null = not yet built
let parentalDomains = null;
let allowDomains    = null;
let setsBuilding    = false;

function* parseDomains(text) {
  let start = 0;
  while (start < text.length) {
    const end = text.indexOf('\n', start);
    const raw = end === -1 ? text.slice(start) : text.slice(start, end);
    start = end === -1 ? text.length : end + 1;

    const line = raw.trim();
    if (!line || line.startsWith('!') || (line.startsWith('#') && !line.startsWith('##')) || /^\[.+\]$/.test(line)) continue;

    // Hosts file: 0.0.0.0 domain.com
    if (/^(0\.0\.0\.0|127\.0\.0\.1)\s+/.test(line)) {
      const d = line.split(/\s+/)[1];
      if (d && d !== 'localhost' && d !== '0.0.0.0') yield d;
      continue;
    }

    // Whitelist / cosmetic → skip
    if (line.startsWith('@@') || line.includes('##')) continue;

    // AdBlock: ||domain^
    if (line.startsWith('||')) {
      yield line.replace(/^\|\|/, '').replace(/[\^/$].*$/, '').trim();
      continue;
    }

    // Plain domain
    const domain = line.split(/[\s$]/)[0];
    if (domain && domain.includes('.') && !domain.includes('/')) yield domain;
  }
}

async function buildDomainSets() {
  if (setsBuilding) return;
  setsBuilding = true;
  console.log('[VPS] Building in-memory domain sets...');

  const settings   = await getSettings();
  const newBlock    = new Set();
  const newParental = new Set();
  const newAllow    = new Set();

  for (const list of settings.blocklists) {
    if (!list.enabled) continue;
    if (list.type === 'parental' && !settings.parentalEnabled) continue;
    const text = await getBlocklistText(list.id);
    for (const domain of parseDomains(text)) {
      if (list.type === 'allow')         newAllow.add(domain);
      else if (list.type === 'parental') newParental.add(domain);
      else                               newBlock.add(domain);
    }
  }

  blockDomains    = newBlock;
  parentalDomains = newParental;
  allowDomains    = newAllow;
  setsBuilding    = false;
  console.log(`[VPS] Domain sets ready — block: ${blockDomains.size}, parental: ${parentalDomains.size}, allow: ${allowDomains.size}`);
}

chrome.webNavigation.onBeforeNavigate.addListener(details => {
  if (details.frameId !== 0) return;
  if (blockDomains === null) return;

  let hostname;
  try { hostname = new URL(details.url).hostname; } catch { return; }
  if (!hostname) return;

  const parts = hostname.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const domain = parts.slice(i).join('.');
    if (allowDomains.has(domain)) return;
    if (parentalDomains.has(domain)) {
      chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL('blocked/blocked-parental.html') });
      return;
    }
    if (blockDomains.has(domain)) {
      chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL(`blocked/blocked.html?url=${encodeURIComponent(details.url)}`) });
      return;
    }
  }
});

// ─── Event Listeners ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await initPrivacyHeaders();
  await rebuildContentRules();
  await rebuildJsBlockRules();
  await rebuildBlockingRules();
  await applyProxy();
  buildDomainSets();
});

chrome.runtime.onStartup.addListener(() => {
  buildDomainSets();
});

chrome.storage.onChanged.addListener(async (changes) => {
  const privacyKeys = ['dntEnabled', 'userAgentEnabled', 'userAgentString', 'ipHeaderEnabled', 'ipHeaderValue'];
  if (privacyKeys.some(k => k in changes) || 'siteOverrides' in changes) await initPrivacyHeaders();

  const contentKeys = ['blockMedia', 'blockFonts', 'lowBandwidth', 'disableHyperlinkAudit'];
  if (contentKeys.some(k => k in changes)) await rebuildContentRules();

  if ('siteOverrides' in changes) await rebuildJsBlockRules();

  if ('blocklists' in changes || 'parentalEnabled' in changes) {
    await rebuildBlockingRules();
    buildDomainSets();
  }
  if (['proxyEnabled', 'proxyHost', 'proxyPort'].some(k => k in changes)) await applyProxy();
});

console.log('[VPS] Background worker started');
