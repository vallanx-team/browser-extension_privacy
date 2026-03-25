// Vallanx Privacy Shield — Background Service Worker

import { getSettings, incrementStats } from './resources/js/storage.js';
import { parseUBS } from './resources/js/ubs-parser.js';
import { calcSavedMs } from './resources/js/stats.js';

// Privacy Header Rule IDs (reserved 1-3)
const PRIVACY_RULE_ID_DNT = 1;
const PRIVACY_RULE_ID_UA  = 2;
const PRIVACY_RULE_ID_IP  = 3;

// Blocking rules start at ID 100
const BLOCK_RULE_ID_START = 100;

// ─── Privacy Headers ───────────────────────────────────────────────────────

async function initPrivacyHeaders() {
  const settings = await getSettings();
  const rules = [];

  if (settings.dntEnabled) {
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
      // No urlFilter needed — empty condition matches all URLs
      condition: { resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'] }
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
      condition: { resourceTypes: ['main_frame'] }
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
      condition: { resourceTypes: ['main_frame', 'xmlhttprequest'] }
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [PRIVACY_RULE_ID_DNT, PRIVACY_RULE_ID_UA, PRIVACY_RULE_ID_IP],
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
    const parsed = parseUBS(list.text || '');

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
        // For main_frame domain blocks: redirect to blocked.html
        const isMainFrameBlock = rule.matchType === 'domain' && !cond.resourceTypes;
        newRules.push({
          id: idCounter++,
          priority: 1,
          action: isMainFrameBlock
            ? { type: 'redirect', redirect: { extensionPath: '/blocked/blocked.html' } }
            : { type: 'block' },
          condition: isMainFrameBlock
            ? { ...cond, resourceTypes: ['main_frame'] }
            : cond
        });
      }

      if (idCounter > 29000) break;
    }
  }

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const oldIds = existing.filter(r => r.id >= BLOCK_RULE_ID_START).map(r => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldIds,
    addRules: newRules
  });
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

async function checkParentalTimeBlock() {
  const s = await getSettings();
  if (!s.parentalEnabled) return;
  try {
    const resp = await fetch('https://worldtimeapi.org/api/timezone/Europe/Berlin');
    const data = await resp.json();
    const serverHour = new Date(data.datetime).getHours();
    if (serverHour < s.parentalStartHour || serverHour >= s.parentalEndHour) {
      await blockAllTabs();
    }
  } catch {
    const h = new Date().getHours();
    if (h < s.parentalStartHour || h >= s.parentalEndHour) {
      await blockAllTabs();
    }
  }
}

async function blockAllTabs() {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  for (const tab of tabs) {
    chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('blocked/blocked.html') });
  }
}

// ─── Event Listeners ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await initPrivacyHeaders();
  await rebuildBlockingRules();
  await applyProxy();
});

chrome.storage.onChanged.addListener(async (changes) => {
  const privacyKeys = ['dntEnabled', 'userAgentEnabled', 'userAgentString', 'ipHeaderEnabled', 'ipHeaderValue'];
  if (privacyKeys.some(k => k in changes)) await initPrivacyHeaders();
  if ('blocklists' in changes || 'parentalEnabled' in changes) await rebuildBlockingRules();
  if (['proxyEnabled', 'proxyHost', 'proxyPort'].some(k => k in changes)) await applyProxy();
});

console.log('[VPS] Background worker started');
