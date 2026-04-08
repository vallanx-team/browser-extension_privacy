export function formatElements(blocked) {
	if (blocked > 1000000000) return `${(blocked / 1000000000).toFixed(1)}bn`;
	if (blocked > 1000000) return `${(blocked / 1000000).toFixed(1)}mn`;
	if (blocked > 1000) return `${(blocked / 1000).toFixed(1)}k`;
	return `${blocked}`;
}

export function formatMb(mb) {
  if (mb < 1) return `${Math.round(mb * 1024)} KB`;
  if (mb > 1048576) return `${(mb / 1048576).toFixed(1)} TB`;
  if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

export function formatMs(ms) {
  if (ms > 86400000) return `${(ms / 86400000).toFixed(1)}d`;
  if (ms > 3600000) return `${(ms / 3600000).toFixed(1)}h`;
  if (ms > 60000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms > 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function calcSavedMs(bytes) {
  if (!bytes || bytes <= 0) return 0;
  const bitsPerSec = 99 * 1024 * 1024; // 99 Mbit/s Schätzwert
  return Math.round((bytes * 8) / bitsPerSec * 1000);
}