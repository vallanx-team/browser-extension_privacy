import { loadI18n, applyI18n } from '../resources/js/i18n.js';

(async () => {
  const { language = 'en', simpleLang = false } = await chrome.storage.sync.get({ language: 'en', simpleLang: false });
  await loadI18n(language, simpleLang);
  applyI18n();
})();

document.getElementById('btn-back').addEventListener('click', () => history.back());
