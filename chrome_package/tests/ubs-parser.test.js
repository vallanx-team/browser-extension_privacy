import { parseUBS } from '../resources/js/ubs-parser.js';

describe('parseUBS', () => {
  test('ignoriert Kommentarzeilen', () => {
    const rules = parseUBS('! This is a comment\n# Also a comment');
    expect(rules).toHaveLength(0);
  });

  test('ignoriert Sektions-Header', () => {
    const rules = parseUBS('[Malware]');
    expect(rules).toHaveLength(0);
  });

  test('ignoriert leere Zeilen', () => {
    const rules = parseUBS('\n\n\n');
    expect(rules).toHaveLength(0);
  });

  test('parst einfache Domain', () => {
    const [rule] = parseUBS('evil.com');
    expect(rule).toMatchObject({ type: 'block', pattern: 'evil.com', matchType: 'domain' });
  });

  test('parst Wildcard-Domain', () => {
    const [rule] = parseUBS('*.ads.example.com');
    expect(rule).toMatchObject({ type: 'block', pattern: '*.ads.example.com', matchType: 'wildcard' });
  });

  test('parst AdBlock-Stil ||domain^', () => {
    const [rule] = parseUBS('||tracker.net^');
    expect(rule).toMatchObject({ type: 'block', pattern: 'tracker.net', matchType: 'domain' });
  });

  test('parst AdBlock-Stil mit Modifier third-party', () => {
    const [rule] = parseUBS('||analytics.google.com^ :third-party');
    expect(rule).toMatchObject({ type: 'block', pattern: 'analytics.google.com', thirdParty: true });
  });

  test('parst Whitelist @@', () => {
    const [rule] = parseUBS('@@||paypal.com^');
    expect(rule).toMatchObject({ type: 'allow', pattern: 'paypal.com' });
  });

  test('parst Whitelist Kurzform @domain', () => {
    const [rule] = parseUBS('@trusted.com');
    expect(rule).toMatchObject({ type: 'allow', pattern: 'trusted.com' });
  });

  test('parst Element-Hiding-Regel ##', () => {
    const [rule] = parseUBS('##.advertisement');
    expect(rule).toMatchObject({ type: 'cosmetic', selector: '.advertisement', domain: null });
  });

  test('parst domain##selector', () => {
    const [rule] = parseUBS('facebook.com##div[data-testid="sponsored"]');
    expect(rule).toMatchObject({ type: 'cosmetic', domain: 'facebook.com', selector: 'div[data-testid="sponsored"]' });
  });

  test('extrahiert :category Modifier', () => {
    const [rule] = parseUBS('evil.com :category=malware');
    expect(rule.category).toBe('malware');
  });

  test('extrahiert :severity Modifier', () => {
    const [rule] = parseUBS('evil.com :severity=critical');
    expect(rule.severity).toBe('critical');
  });

  test('parst $-Modifier (AdBlock-Syntax)', () => {
    const [rule] = parseUBS('||ads.net^ $third-party,script');
    expect(rule).toMatchObject({ thirdParty: true, resourceType: 'script' });
  });

  test('verarbeitet mehrzeiligen Input', () => {
    const input = `
! Header
[Section]
evil.com
@@good.com
##.ad
    `;
    const rules = parseUBS(input);
    expect(rules).toHaveLength(3);
    expect(rules[0].type).toBe('block');
    expect(rules[1].type).toBe('allow');
    expect(rules[2].type).toBe('cosmetic');
  });

  test('behandelt fehlerhafte Zeilen ohne Absturz', () => {
    expect(() => parseUBS(':::invalid:::')).not.toThrow();
  });
});
