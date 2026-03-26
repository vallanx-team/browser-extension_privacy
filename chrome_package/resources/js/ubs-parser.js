/**
 * Vallanx UBS Parser — Browser Edition
 * Parst Vallanx Universal Blocklist Syntax und gibt strukturierte Regeln zurück.
 */

export function parseUBS(text) {
  const rules = [];
  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('!') || (line.startsWith('#') && !line.startsWith('##')) || /^\[.+\]$/.test(line)) {
      continue;
    }
    try {
      const rule = parseLine(line);
      if (rule) rules.push(rule);
    } catch (_) {
      // Fehlerhafte Zeilen überspringen
    }
  }
  return rules;
}

function parseLine(line) {
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

