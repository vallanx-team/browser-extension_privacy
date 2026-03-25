/**
 * t() — Lokalisierungsfunktion für Browser Extension
 * Ersetzt $KEY$ Platzhalter in Nachrichten.
 */
export function t(messages, key, substitutions = {}) {
  const entry = messages[key];
  if (!entry) return key;
  let text = entry.message;
  for (const [k, v] of Object.entries(substitutions)) {
    text = text.replaceAll(`$${k}$`, v);
  }
  return text;
}
