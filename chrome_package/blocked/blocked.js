import { loadI18n, t, applyI18n } from '../resources/js/i18n.js';

(async () => {
  const { language = 'en', simpleLang = false } = await chrome.storage.sync.get({ language: 'en', simpleLang: false });
  await loadI18n(language, simpleLang);
  applyI18n();

  const listName = new URLSearchParams(location.search).get('list');
  if (listName) {
    const el = document.getElementById('blocked-list-info');
    el.textContent = t('blockedByList', { list: listName });
    el.style.display = 'block';
  }

  document.getElementById('btn-continue').addEventListener('click', () => {
    document.getElementById('btn-continue').textContent = t('blockedContinueHint');
  });
})();

document.getElementById('btn-back').addEventListener('click', () => history.back());
