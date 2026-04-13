/**
 * Vallanx UBS Parser — Browser Edition
 * Parst Vallanx Universal Blocklist Syntax und gibt strukturierte Regeln zurück.
 */

export function parseUBS(text, maxRules = Infinity) {
  const rules = [];

  let start = 0;
  while (start < text.length) {
    const end = text.indexOf('\n', start);
    const rawLine = end === -1 ? text.slice(start) : text.slice(start, end);
    start = end === -1 ? text.length : end + 1;

    const line = rawLine.trim();
    if (!line || line.startsWith('!') || (line.startsWith('#') && !line.startsWith('##')) || /^\[.+\]$/.test(line)) {
      continue;
    }
    try {
      const rule = parseLine(line);
      if (rule) {
        rules.push(rule);
        if (rules.length >= maxRules) break;
      }
    } catch (_) {
      // Fehlerhafte Zeilen überspringen
    }
  }
  return rules;
}

function parseLine(line) {
  // Hosts file format: 0.0.0.0 domain.com or 127.0.0.1 domain.com
  if (/^(0\.0\.0\.0|127\.0\.0\.1)\s+/.test(line)) {
    const domain = line.split(/\s+/)[1];
    if (!domain || domain === 'localhost' || domain === '0.0.0.0' || domain === '127.0.0.1' || domain.startsWith('#')) return null;
    return { type: 'block', pattern: domain, matchType: 'domain' };
  }

  // Cosmetic / Element hiding: domain##selector oder ##selector
  if (line.includes('##')) {
    const idx = line.indexOf('##');
    const domain = line.slice(0, idx) || null;
    const selector = line.slice(idx + 2);
    return { type: 'cosmetic', domain, selector };
  }

  // Whitelist: @@||domain^ oder @domain
  if (line.startsWith('@@')) {
    const pattern = extractDomain(line.slice(2));
    return { type: 'allow', pattern, matchType: 'domain' };
  }
  if (line.startsWith('@') && !line.startsWith('@@')) {
    return { type: 'allow', pattern: line.slice(1).trim(), matchType: 'domain' };
  }

  // AdBlock-Stil: ||domain^
  if (line.startsWith('||')) {
    const [base, ...modParts] = line.split(' ');
    const pattern = extractDomain(base);
    const modifiers = parseModifiers(modParts.join(' '), line);
    return { type: 'block', pattern, matchType: 'domain', ...modifiers };
  }

  // Wildcard: *.domain.com
  if (line.startsWith('*.')) {
    const [domainPart, ...modParts] = line.split(' ');
    const modifiers = parseModifiers(modParts.join(' '), line);
    return { type: 'block', pattern: domainPart, matchType: 'wildcard', ...modifiers };
  }

  // Einfache Domain: domain.com oder domain.com :modifier
  const [domainPart, ...modParts] = line.split(' ');
  if (!domainPart || domainPart.includes(':::')) return null;
  const modifiers = parseModifiers(modParts.join(' '), line);
  return { type: 'block', pattern: domainPart, matchType: 'domain', ...modifiers };
}

function extractDomain(str) {
  return str.replace(/^\|\|/, '').replace(/\^.*$/, '').trim();
}

function parseModifiers(modString, fullLine) {
  const result = {};

  // :key=value Modifiers (UBS-Stil)
  for (const match of modString.matchAll(/:(\w[\w-]*)(?:=([^\s:]+))?/g)) {
    const [, key, value] = match;
    switch (key) {
      case 'third-party': result.thirdParty = true; break;
      case 'first-party': result.firstParty = true; break;
      case 'category':    result.category = value; break;
      case 'severity':    result.severity = value; break;
      case 'script':
      case 'image':
      case 'xhr':
      case 'websocket':   result.resourceType = key; break;
    }
  }

  // $modifier1,modifier2 (AdBlock-Syntax) — suche in modString, nicht fullLine
  const dollarIdx = modString.indexOf('$');
  if (dollarIdx !== -1) {
    const adMods = modString.slice(dollarIdx + 1).split(',');
    for (const mod of adMods) {
      const m = mod.trim();
      if (m === 'third-party') result.thirdParty = true;
      if (m === 'first-party') result.firstParty = true;
      if (['script', 'image', 'xhr', 'websocket', 'stylesheet'].includes(m)) result.resourceType = m;
    }
  }

  return result;
}

