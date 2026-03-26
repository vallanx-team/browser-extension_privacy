export function formatMb(mb) {
  if (mb < 1) return `${Math.round(mb * 1024)} KB`;
  return `${mb.toFixed(2)}`;
}

export function formatMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function calcSavedMs(bytes) {
  if (!bytes || bytes <= 0) return 0;
  const bitsPerSec = 99 * 1024 * 1024; // 99 Mbit/s Schätzwert
  return Math.round((bytes * 8) / bitsPerSec * 1000);
}