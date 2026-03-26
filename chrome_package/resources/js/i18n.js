// Vallanx Privacy Shield — Shared i18n Module

let _messages = {};

export async function loadI18n(lang, simpleLang = false) {
  // Standard-Sprachdatei laden
  try {
    const url  = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
    const resp = await fetch(url);
    _messages  = await resp.json();
  } catch (_) {
    _messages = {};
  }

  // Einfache Sprache als Overlay laden (nur abweichende Keys)
  if (simpleLang) {
    try {
      const url    = chrome.runtime.getURL(`_locales/${lang}/${lang}-simple.json`);
      const resp   = await fetch(url);
      const simple = await resp.json();
      _messages    = { ..._messages, ...simple };
    } catch (_) {
      // Kein Simple-Language-File für diese Sprache → Standard bleibt
    }
  }
}

export function t(key, substitutions = {}) {
  const entry = _messages[key];
  if (!entry) return key;
  let text = entry.message;
  for (const [k, v] of Object.entries(substitutions)) {
    text = text.replaceAll(`{{${k}}}`, v);
  }
  return text;
}

export function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
}
