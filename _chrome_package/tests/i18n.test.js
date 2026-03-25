import { t } from '../resources/js/i18n.js';

describe('i18n', () => {
  const messages = {
    greeting: { message: 'Hallo $NAME$', placeholders: { name: { content: '$1' } } },
    simple: { message: 'Einfach' }
  };

  test('gibt einfache Nachricht zurück', () => {
    expect(t(messages, 'simple')).toBe('Einfach');
  });

  test('ersetzt Platzhalter', () => {
    expect(t(messages, 'greeting', { NAME: 'Welt' })).toBe('Hallo Welt');
  });

  test('gibt Key zurück wenn nicht gefunden', () => {
    expect(t(messages, 'unknown_key')).toBe('unknown_key');
  });
});
