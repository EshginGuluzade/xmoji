// shortcode-engine.js — Detection, matching, replacement

export function detectPartialShortcode(text, cursorPos) {
  const beforeCursor = text.substring(0, cursorPos);

  // Don't trigger inside URLs
  const urlPattern = /https?:\/\/\S*$/;
  if (urlPattern.test(beforeCursor)) return null;

  // Look for opening colon followed by 2+ valid characters
  const match = beforeCursor.match(/:([a-zA-Z0-9_+\-]{2,})$/);
  if (!match) return null;

  return {
    prefix: match[1],
    startIndex: match.index,
    length: match[0].length,
  };
}

export function detectCompleteShortcode(text, cursorPos) {
  const beforeCursor = text.substring(0, cursorPos);
  const match = beforeCursor.match(/:([a-zA-Z0-9_+\-]+):$/);
  if (!match) return null;

  return {
    shortcode: match[1],
    fullMatch: match[0],
    startIndex: match.index,
    endIndex: cursorPos,
  };
}

export function searchShortcodes(prefix, sortedList, shortcodeMap, limit = 8) {
  const lower = prefix.toLowerCase();
  const results = [];

  // Tier 1: Prefix match via binary search
  let lo = 0, hi = sortedList.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedList[mid] < lower) lo = mid + 1;
    else hi = mid;
  }
  for (let i = lo; i < sortedList.length && sortedList[i].startsWith(lower); i++) {
    results.push({ name: sortedList[i], emoji: shortcodeMap[sortedList[i]], tier: 0 });
    if (results.length >= limit) return results;
  }

  // Tier 2: Substring match (only if prefix results insufficient)
  if (results.length < limit) {
    for (const sc of sortedList) {
      if (sc.includes(lower) && !sc.startsWith(lower)) {
        results.push({ name: sc, emoji: shortcodeMap[sc], tier: 1 });
        if (results.length >= limit) break;
      }
    }
  }

  // Sort: prefix matches first, then by name length (shorter = more common)
  results.sort((a, b) => a.tier - b.tier || a.name.length - b.name.length);
  return results.slice(0, limit);
}
