import { formatMb, formatMs, calcSavedMs } from '../resources/js/stats.js';

describe('stats', () => {
  test('formatMb — unter 1 MB als KB', () => {
    expect(formatMb(0.5)).toBe('512 KB');
  });

  test('formatMb — ab 1 MB mit 2 Dezimalstellen', () => {
    expect(formatMb(2.5)).toBe('2.50 MB');
  });

  test('formatMs — unter 1000ms als ms', () => {
    expect(formatMs(500)).toBe('500 ms');
  });

  test('formatMs — ab 1000ms als Sekunden', () => {
    expect(formatMs(2500)).toBe('2.5 s');
  });

  test('calcSavedMs — gibt 0 zurück wenn kein Content-Length', () => {
    expect(calcSavedMs(null)).toBe(0);
  });

  test('calcSavedMs — schätzt Zeit aus Bytes (angenommene 99 Mbit/s)', () => {
    const bytes = 5 * 1024 * 1024; // 5 MB
    const ms = calcSavedMs(bytes);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeCloseTo(404, -2); // ~404ms bei 99 Mbit/s
  });
});
