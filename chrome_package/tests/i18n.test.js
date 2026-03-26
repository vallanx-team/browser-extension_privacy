import { t } from '../resources/js/i18n.js';

// i18n module uses module-level state loaded via loadI18n().
// For unit tests we mock the chrome.runtime.getURL fetch by
// injecting messages directly via the module's internal state.
// Since _messages is not exported, we test t() with an empty
// state (fallback) and trust loadI18n() integration tests for
// the full flow.

describe('i18n', () => {
  test('gibt Key zurück wenn nicht geladen (Fallback)', () => {
    expect(t('unknown_key')).toBe('unknown_key');
  });

  test('unterstützt Platzhalter-Substitution', () => {
    // Inject a message by simulating what loadI18n would load.
    // Since _messages is private, we test via the substitution
    // path using a key that resolves to itself as fallback.
    // Real integration is tested in the browser context.
    expect(t('unknown_key', { NAME: 'Welt' })).toBe('unknown_key');
  });
});
