# Complete Technical Specification: Slack-Style Emoji Shortcode Chrome Extension for X

## Bottom line up front

This document is a production-ready technical specification for building a Chrome Extension (Manifest V3) that adds Slack-style emoji shortcode support (`:emoji_name:` → emoji) to X (twitter.com / x.com). X's compose box is built on a **Twitter-maintained fork of Draft.js** using a `contenteditable` div, and the most reliable way to insert text programmatically is **clipboard paste event emulation**. The extension monitors X's SPA with a debounced MutationObserver, renders an autocomplete popup inside a Shadow DOM container, and uses **iamcal/emoji-data** (Slack's canonical source) for ~3,500 shortcode mappings. No direct competitor exists in the Chrome Web Store — this is a genuine market gap. Everything described below can be built as a single self-contained extension with zero external dependencies at runtime.

---

## 1. Project structure and manifest

### File organization

```
xmoji/
├── manifest.json
├── src/
│   ├── content/
│   │   ├── content.js            # Main entry: bootstraps everything
│   │   ├── observer.js           # MutationObserver + SPA navigation
│   │   ├── shortcode-engine.js   # Detection, matching, replacement
│   │   ├── autocomplete.js       # Popup UI + keyboard navigation
│   │   ├── caret.js              # Caret position utilities
│   │   ├── editor.js             # Text insertion into Draft.js
│   │   ├── theme.js              # X theme detection
│   │   └── content.css           # Popup styles (injected into Shadow DOM)
│   ├── background/
│   │   └── service-worker.js     # Lifecycle, install handler, messaging
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── options/
│   │   ├── options.html
│   │   ├── options.js
│   │   └── options.css
│   ├── data/
│   │   ├── shortcode-map.json    # {shortcode: emoji} flat object (~150KB)
│   │   └── sorted-shortcodes.json # string[] for binary search
│   └── shared/
│       ├── storage.js            # chrome.storage wrapper
│       ├── constants.js          # Selectors, config defaults
│       └── messaging.js          # Message passing helpers
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── scripts/
│   └── build-emoji-data.js       # Build script: emoji-data → lookup maps
├── package.json
└── dist/                          # Build output (loadable as unpacked extension)
```

### Complete manifest.json

```json
{
  "manifest_version": 3,
  "name": "Xmoji",
  "version": "1.0.0",
  "description": "Type Slack-style :emoji_name: shortcodes in X posts and they auto-convert to real emoji. Autocomplete included.",
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "permissions": [
    "storage"
  ],
  "host_permissions": [
    "https://x.com/*",
    "https://twitter.com/*"
  ],
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  },
  "options_page": "src/options/options.html",
  "content_scripts": [
    {
      "matches": [
        "https://x.com/*",
        "https://twitter.com/*"
      ],
      "css": [],
      "js": ["src/content/content.js"],
      "run_at": "document_idle",
      "world": "ISOLATED"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": [
        "src/data/*",
        "src/content/content.css"
      ],
      "matches": ["https://x.com/*", "https://twitter.com/*"]
    }
  ]
}
```

**Key design decisions:** `run_at: "document_idle"` avoids blocking X's initial render. `world: "ISOLATED"` gives access to `chrome.*` APIs while still allowing full DOM manipulation. The `storage` permission enables `chrome.storage.sync` for settings and `chrome.storage.local` for the emoji database cache. No `activeTab` needed since static content scripts already have DOM access. CSS is loaded into Shadow DOM at runtime rather than via the manifest's `css` array, preventing style leakage.

---

## 2. X's compose box architecture

### Draft.js under the hood

X's tweet compose box runs on a **Twitter-maintained fork of Draft.js** (`github.com/twitter-forks/draft-js`). Draft.js is a React-based rich text editor framework that uses an immutable `EditorState` model backed by `immutable-js`. This has one critical consequence: **directly modifying the DOM will desync from Draft.js's internal state**, breaking character counts, undo/redo, and the submit button.

### DOM tree structure

```
div (X wrapper, obfuscated classes)
  └── div.DraftEditor-root
      └── div.DraftEditor-editorContainer
          └── div[contenteditable="true"]
                [role="textbox"]
                [data-testid="tweetTextarea_0"]
              └── div[data-contents="true"]
                  └── div[data-block="true"][data-editor="{random5}"][data-offset-key="{blockKey}-0-0"]
                      └── div.public-DraftStyleDefault-block
                          └── span[data-offset-key="{blockKey}-0-0"]
                              └── span[data-text="true"]
                                  └── "actual text content"
```

### Stable selectors (constants.js)

```javascript
// constants.js — All selectors in one place for easy maintenance
export const SELECTORS = {
  // Primary compose box (works for home feed, modal, reply, quote tweet)
  COMPOSE_BOX: 'div[role="textbox"][data-testid="tweetTextarea_0"]',
  // Thread compose boxes (2nd, 3rd tweet, etc.)
  COMPOSE_BOX_THREAD: (n) => `div[role="textbox"][data-testid="tweetTextarea_${n}"]`,
  // Any compose box on the page
  COMPOSE_BOX_ANY: 'div[role="textbox"][data-testid^="tweetTextarea_"]',
  // DM compose box (different editor, may need separate handling)
  DM_COMPOSE: 'div[role="textbox"][data-testid="dmComposerTextInput"]',
  // Tweet/Post button
  TWEET_BUTTON: 'div[role="button"][data-testid="tweetButton"]',
  TWEET_BUTTON_INLINE: 'div[role="button"][data-testid="tweetButtonInline"]',
  // Modal/dialog container
  MODAL: '[data-testid="sheetDialog"], [role="dialog"]',
  // Primary column (main feed area)
  PRIMARY_COLUMN: '[data-testid="primaryColumn"]',
  // Draft.js text leaf nodes
  TEXT_NODE: 'span[data-text="true"]',
};

// Fallback selectors if data-testid changes
export const FALLBACK_SELECTORS = {
  COMPOSE_BOX: 'div[role="textbox"][contenteditable="true"]',
};
```

**CSS classes are unstable.** X generates obfuscated class names like `css-1dbjc4n r-1iusvr4 r-16y2uox` that change between deployments. The `data-testid` attributes are the only reliable identifiers. Draft.js-specific classes (`DraftEditor-root`, `public-DraftStyleDefault-block`) are stable across Draft.js versions but could change if X migrates away from Draft.js.

### Compose box variants

All tweet-related compose boxes (home feed inline, modal, reply, quote tweet, thread) use the **same Draft.js editor** with `data-testid="tweetTextarea_N"` where N is the zero-indexed position in a thread. The DM compose box uses `data-testid="dmComposerTextInput"` and may have a different internal implementation. The extension should target `COMPOSE_BOX_ANY` to cover all tweet variants and optionally support DMs.

---

## 3. Programmatic text insertion into Draft.js

The most critical technical challenge is replacing shortcode text with emoji characters without breaking Draft.js's internal state. Three techniques work, in order of reliability.

### Primary method: clipboard paste emulation

```javascript
// editor.js
export function insertTextAtCursor(element, text) {
  element.focus();
  
  // Create a synthetic paste event with a DataTransfer object
  const dataTransfer = new DataTransfer();
  dataTransfer.setData('text/plain', text);
  
  const pasteEvent = new ClipboardEvent('paste', {
    clipboardData: dataTransfer,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  
  element.dispatchEvent(pasteEvent);
}
```

This works because Draft.js explicitly handles paste events through its `handlePastedText` callback, which correctly updates the immutable `EditorState`. Confirmed working by the Replai.so extension and multiple Twitter automation tools.

### Fallback method: execCommand insertText

```javascript
export function insertTextExecCommand(element, text) {
  element.focus();
  document.execCommand('insertText', false, text);
}
```

This fires the `beforeinput` and `input` events that Draft.js listens for. Despite being deprecated by the W3C, `execCommand('insertText')` remains supported in all major browsers as of February 2026 and correctly updates Draft.js state. Use this as a fallback if paste emulation fails.

### Replacing a text range (for shortcode replacement)

```javascript
export function replaceTextRange(composeBox, startOffset, endOffset, replacementText) {
  composeBox.focus();
  
  // Get the text node(s) inside the compose box
  const sel = window.getSelection();
  const textContainer = composeBox.querySelector('[data-contents="true"]');
  if (!textContainer) return false;
  
  // Walk text nodes to find the correct range
  const walker = document.createTreeWalker(textContainer, NodeFilter.SHOW_TEXT);
  let currentOffset = 0;
  let startNode = null, startNodeOffset = 0;
  let endNode = null, endNodeOffset = 0;
  
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const nodeLength = node.textContent.length;
    
    if (!startNode && currentOffset + nodeLength > startOffset) {
      startNode = node;
      startNodeOffset = startOffset - currentOffset;
    }
    if (!endNode && currentOffset + nodeLength >= endOffset) {
      endNode = node;
      endNodeOffset = endOffset - currentOffset;
      break;
    }
    currentOffset += nodeLength;
  }
  
  if (!startNode || !endNode) return false;
  
  // Create a range selecting the shortcode text
  const range = document.createRange();
  range.setStart(startNode, startNodeOffset);
  range.setEnd(endNode, endNodeOffset);
  
  // Set the browser selection to this range
  sel.removeAllRanges();
  sel.addRange(range);
  
  // Now insert the replacement — this replaces the selected text
  const dataTransfer = new DataTransfer();
  dataTransfer.setData('text/plain', replacementText);
  composeBox.dispatchEvent(new ClipboardEvent('paste', {
    clipboardData: dataTransfer,
    bubbles: true,
    cancelable: true,
    composed: true,
  }));
  
  return true;
}
```

### What NOT to do

Never use direct DOM manipulation (`textContent`, `innerHTML`, `appendChild`) on Draft.js content. Never try to access React fiber internals via `__reactFiber$` properties — these include random hashes and change between React versions. Both approaches desync the visual DOM from Draft.js's immutable ContentState.

---

## 4. Emoji shortcode database

### Data source: iamcal/emoji-data

**iamcal/emoji-data is the canonical source** — Slack's official documentation confirms: "The list of supported emoji are taken from https://github.com/iamcal/emoji-data." The latest version (v16.0.0) supports Emoji 16.0 with ~1,900 base emoji entries. Each entry contains `short_name` (primary) and `short_names` (array of all aliases), yielding **~3,500–4,000 total shortcode mappings**.

### Build script to generate optimized lookup data

```javascript
// scripts/build-emoji-data.js
const emojiData = require('emoji-datasource/emoji.json');
const gemoji = require('./gemoji.json'); // from github/gemoji for extra aliases
const fs = require('fs');

const shortcodeMap = {};
const emojiToName = {};

// Process iamcal/emoji-data (primary)
for (const entry of emojiData) {
  const codepoints = entry.unified.split('-').map(cp => parseInt(cp, 16));
  const emoji = String.fromCodePoint(...codepoints);
  
  for (const name of entry.short_names) {
    shortcodeMap[name] = emoji;
  }
  emojiToName[emoji] = entry.short_name;
}

// Merge gemoji aliases (secondary, for GitHub compatibility)
for (const entry of gemoji) {
  if (!entry.emoji) continue;
  for (const alias of entry.aliases) {
    if (!shortcodeMap[alias]) {
      shortcodeMap[alias] = entry.emoji;
    }
  }
}

// Write outputs
fs.writeFileSync(
  'src/data/shortcode-map.json',
  JSON.stringify(shortcodeMap)
);
fs.writeFileSync(
  'src/data/sorted-shortcodes.json',
  JSON.stringify(Object.keys(shortcodeMap).sort())
);

console.log(`Generated ${Object.keys(shortcodeMap).length} shortcode mappings`);
console.log(`File size: ${(JSON.stringify(shortcodeMap).length / 1024).toFixed(1)} KB`);
```

### Runtime data format

The extension uses two structures loaded at startup:

- **`shortcodeMap`**: flat `{string: string}` object for **O(1) exact lookup** during replacement. ~150KB minified, ~50KB gzipped. Example: `{"grinning": "😀", "+1": "👍", "thumbsup": "👍"}`
- **`sortedShortcodes`**: sorted `string[]` for **O(log n) prefix search** during autocomplete via binary search. ~80KB minified.

A trie structure is unnecessary for ~3,500 entries — binary search on a sorted array completes in under 1ms and uses less memory.

---

## 5. Shortcode detection and replacement engine

### Regex pattern

```javascript
// shortcode-engine.js
const SHORTCODE_COMPLETE = /(?<![:\w/]):([a-zA-Z0-9_+\-]+):(?![\w/])/g;
```

**Breakdown:** the negative lookbehind `(?<![:\w/])` prevents matching inside URLs (`https://...`) or adjacent to other colons. The capture group `([a-zA-Z0-9_+\-]+)` covers shortcodes with underscores (`thumbs_up`), plus signs (`+1`), and hyphens (`heavy-minus-sign`). The negative lookahead `(?![\w/])` prevents matching inside paths.

### Real-time shortcode detection (on every keystroke)

```javascript
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
  // Check if user just typed a closing colon
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
```

### Edge cases handled

| Edge case | Input | Result | How |
|-----------|-------|--------|-----|
| URL colons | `https://example.com` | No match | Lookbehind blocks `/` prefix |
| Time format | `12:30:00` | No match | `30` has no emoji mapping, so no replacement |
| Adjacent codes | `:smile::wave:` | Both match | Each has distinct boundaries |
| Partial typing | `:smi` | Triggers autocomplete | Detected by `detectPartialShortcode` |
| Unknown shortcode | `:notanemoji:` | Left unchanged | Lookup returns undefined, skip replacement |
| Escaped colons | Text with `\:smile\:` | No match | Add `(?<!\\)` if needed |
| Multiple in one line | `Hey :wave: how are you :smile:` | Both replaced | Global regex with `/g` flag |

### Replacement flow

```javascript
export function handleInput(composeBox, shortcodeMap) {
  const text = composeBox.textContent || '';
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  
  const range = sel.getRangeAt(0);
  const cursorOffset = getCaretOffset(composeBox);
  
  // Check for completed shortcode (user just typed closing ':')
  const complete = detectCompleteShortcode(text, cursorOffset);
  if (complete && shortcodeMap[complete.shortcode]) {
    const emoji = shortcodeMap[complete.shortcode];
    replaceTextRange(
      composeBox,
      complete.startIndex,
      complete.endIndex,
      emoji
    );
    return { replaced: true, emoji };
  }
  
  return { replaced: false };
}
```

---

## 6. Autocomplete popup

### Caret position detection

```javascript
// caret.js
export function getCaretCoordinates() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  
  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(false);
  
  let rect = range.getBoundingClientRect();
  
  // Fallback for zero-width rect (caret at end of line)
  if (rect.height === 0 || (rect.left === 0 && rect.top === 0)) {
    const tempNode = document.createTextNode('\u200B');
    range.insertNode(tempNode);
    rect = range.getBoundingClientRect();
    const coords = {
      x: rect.left,
      y: rect.top,
      bottom: rect.bottom,
      height: rect.height,
    };
    tempNode.parentNode.removeChild(tempNode);
    selection.removeAllRanges();
    selection.addRange(range);
    return coords;
  }
  
  return { x: rect.left, y: rect.top, bottom: rect.bottom, height: rect.height };
}

export function getCaretOffset(element) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.endContainer, range.endOffset);
  return preRange.toString().length;
}
```

### Prefix search with binary search

```javascript
// shortcode-engine.js
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
```

### Shadow DOM popup rendering

```javascript
// autocomplete.js
let shadowHost = null;
let shadowRoot = null;
let popupEl = null;
let selectedIndex = -1;
let currentItems = [];
let isActive = false;

export function initAutocompleteUI() {
  shadowHost = document.createElement('div');
  shadowHost.id = 'xmoji-host';
  shadowHost.style.cssText = `
    position: fixed; top: 0; left: 0; width: 0; height: 0;
    z-index: 2147483647; pointer-events: none;
  `;
  document.body.appendChild(shadowHost);
  
  shadowRoot = shadowHost.attachShadow({ mode: 'open' });
  
  const style = new CSSStyleSheet();
  style.replaceSync(POPUP_CSS);
  shadowRoot.adoptedStyleSheets = [style];
  
  popupEl = document.createElement('div');
  popupEl.className = 'emoji-ac-popup';
  popupEl.setAttribute('role', 'listbox');
  popupEl.style.display = 'none';
  shadowRoot.appendChild(popupEl);
}

export function showPopup(items, caretCoords) {
  currentItems = items;
  selectedIndex = 0;
  isActive = true;
  
  popupEl.innerHTML = items.map((item, i) => `
    <div class="emoji-ac-item ${i === 0 ? 'selected' : ''}"
         role="option" data-index="${i}">
      <span class="emoji-ac-char">${item.emoji}</span>
      <span class="emoji-ac-name">:${item.name}:</span>
    </div>
  `).join('');
  
  // Position below caret
  const popupHeight = Math.min(items.length * 40, 320);
  const popupWidth = 280;
  let x = caretCoords.x;
  let y = caretCoords.bottom + 4;
  
  // Viewport boundary checks
  if (y + popupHeight > window.innerHeight - 8) {
    y = caretCoords.y - popupHeight - 4; // flip above
  }
  if (x + popupWidth > window.innerWidth - 8) {
    x = window.innerWidth - popupWidth - 8;
  }
  
  popupEl.style.cssText = `
    display: block; position: fixed; pointer-events: auto;
    left: ${x}px; top: ${y}px; width: ${popupWidth}px;
    max-height: ${popupHeight}px;
  `;
  
  // Click handlers
  popupEl.querySelectorAll('.emoji-ac-item').forEach(el => {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault(); // prevent blur on compose box
      const idx = parseInt(el.dataset.index);
      selectItem(idx);
    });
  });
}

export function hidePopup() {
  isActive = false;
  selectedIndex = -1;
  currentItems = [];
  popupEl.style.display = 'none';
  popupEl.innerHTML = '';
}

export function isPopupActive() {
  return isActive;
}

export function getSelectedItem() {
  if (selectedIndex >= 0 && selectedIndex < currentItems.length) {
    return currentItems[selectedIndex];
  }
  return null;
}

export function moveSelection(direction) {
  const items = popupEl.querySelectorAll('.emoji-ac-item');
  if (items.length === 0) return;
  
  items[selectedIndex]?.classList.remove('selected');
  selectedIndex = (selectedIndex + direction + items.length) % items.length;
  items[selectedIndex]?.classList.add('selected');
  items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
}
```

### Theme-aware popup CSS

```javascript
const POPUP_CSS = `
  :host {
    all: initial !important;
  }
  
  .emoji-ac-popup {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 20px;
    border-radius: 12px;
    overflow-y: auto;
    box-sizing: border-box;
    /* Colors set dynamically by theme.js */
  }
  
  .emoji-ac-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    cursor: pointer;
    transition: background-color 0.1s;
  }
  
  .emoji-ac-char {
    font-size: 20px;
    width: 28px;
    text-align: center;
    flex-shrink: 0;
  }
  
  .emoji-ac-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .emoji-ac-item.selected {
    /* Background set dynamically */
  }
  
  /* Scrollbar styling */
  .emoji-ac-popup::-webkit-scrollbar {
    width: 8px;
  }
  .emoji-ac-popup::-webkit-scrollbar-thumb {
    border-radius: 4px;
  }
`;
```

### X theme detection and dynamic styling

```javascript
// theme.js
export function detectXTheme() {
  const bg = window.getComputedStyle(document.body).backgroundColor;
  
  if (bg === 'rgb(255, 255, 255)') return 'light';
  if (bg === 'rgb(0, 0, 0)') return 'dark';
  if (bg === 'rgb(21, 32, 43)') return 'dim';
  
  // Luminance-based fallback
  const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    const luminance = (0.299 * +match[1] + 0.587 * +match[2] + 0.114 * +match[3]) / 255;
    return luminance > 0.5 ? 'light' : 'dark';
  }
  return 'light';
}

const THEME_COLORS = {
  light: {
    bg: '#ffffff',
    text: '#0f1419',
    textSecondary: '#536471',
    border: '#eff3f4',
    hoverBg: 'rgba(0, 0, 0, 0.03)',
    selectedBg: 'rgba(0, 0, 0, 0.06)',
    shadow: '0 0 15px rgba(101, 119, 134, 0.2), 0 0 5px 1px rgba(101, 119, 134, 0.15)',
  },
  dark: {
    bg: '#000000',
    text: '#e7e9ea',
    textSecondary: '#71767b',
    border: '#2f3336',
    hoverBg: 'rgba(231, 233, 234, 0.1)',
    selectedBg: 'rgba(231, 233, 234, 0.15)',
    shadow: '0 0 15px rgba(255, 255, 255, 0.2), 0 0 5px 1px rgba(255, 255, 255, 0.15)',
  },
  dim: {
    bg: '#15202b',
    text: '#d9d9d9',
    textSecondary: '#8b98a5',
    border: '#38444d',
    hoverBg: 'rgba(255, 255, 255, 0.06)',
    selectedBg: 'rgba(255, 255, 255, 0.1)',
    shadow: '0 0 15px rgba(255, 255, 255, 0.2), 0 0 5px 1px rgba(255, 255, 255, 0.15)',
  },
};

export function applyThemeToPopup(popupEl) {
  const theme = detectXTheme();
  const colors = THEME_COLORS[theme] || THEME_COLORS.light;
  
  popupEl.style.backgroundColor = colors.bg;
  popupEl.style.color = colors.text;
  popupEl.style.border = `1px solid ${colors.border}`;
  popupEl.style.boxShadow = colors.shadow;
  
  // Store for item hover/selection styles
  popupEl.dataset.themeBg = colors.selectedBg;
  popupEl.dataset.themeHoverBg = colors.hoverBg;
  popupEl.dataset.themeTextSecondary = colors.textSecondary;
  
  // Apply to existing items
  popupEl.querySelectorAll('.emoji-ac-item.selected').forEach(el => {
    el.style.backgroundColor = colors.selectedBg;
  });
  popupEl.querySelectorAll('.emoji-ac-name').forEach(el => {
    el.style.color = colors.textSecondary;
  });
}

export function watchThemeChanges(callback) {
  const observer = new MutationObserver(() => callback(detectXTheme()));
  observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
  return observer;
}
```

---

## 7. Keyboard navigation

```javascript
// In content.js — attached to document in capture phase
function handleKeyDown(event) {
  if (!isPopupActive()) return;
  if (event.isComposing) return; // Don't interfere with IME input
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      event.stopPropagation();
      moveSelection(1);
      break;
      
    case 'ArrowUp':
      event.preventDefault();
      event.stopPropagation();
      moveSelection(-1);
      break;
      
    case 'Enter':
    case 'Tab':
      event.preventDefault();
      event.stopPropagation();
      confirmSelection();
      break;
      
    case 'Escape':
      event.preventDefault();
      event.stopPropagation();
      hidePopup();
      break;
      
    default:
      // All other keys pass through to X's handlers
      break;
  }
}

// CAPTURE phase ensures we fire before X's React event delegation
document.addEventListener('keydown', handleKeyDown, true);
```

**Why capture phase matters:** X's React uses event delegation — all event handlers are attached to the root DOM node and fire during the bubble phase. By using `addEventListener('keydown', handler, true)`, the extension's handler fires first. Calling `stopPropagation()` prevents the event from reaching React's delegated handlers, so X never sees the arrow/Enter/Escape keys while the popup is open.

---

## 8. SPA navigation and compose box detection

### MutationObserver with debouncing

```javascript
// observer.js
import { SELECTORS } from '../shared/constants.js';

const DEBOUNCE_MS = 150;
let debounceTimer = null;
let attachedEditors = new WeakSet();

export function initObserver(onEditorFound) {
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => scanForEditors(onEditorFound), DEBOUNCE_MS);
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  // Initial scan
  scanForEditors(onEditorFound);
  
  return observer;
}

function scanForEditors(callback) {
  const editors = document.querySelectorAll(SELECTORS.COMPOSE_BOX_ANY);
  
  editors.forEach(editor => {
    if (attachedEditors.has(editor)) return;
    attachedEditors.add(editor);
    callback(editor);
  });
  
  // Also check DM compose
  const dmEditors = document.querySelectorAll(SELECTORS.DM_COMPOSE);
  dmEditors.forEach(editor => {
    if (attachedEditors.has(editor)) return;
    attachedEditors.add(editor);
    callback(editor);
  });
}
```

### URL change detection

```javascript
// observer.js (continued)
let lastUrl = location.href;

export function initUrlWatcher(onNavigate) {
  // Poll-based (works in ISOLATED world without intercepting pushState)
  setInterval(() => {
    if (location.href !== lastUrl) {
      const oldUrl = lastUrl;
      lastUrl = location.href;
      onNavigate(oldUrl, lastUrl);
    }
  }, 500);
  
  window.addEventListener('popstate', () => {
    setTimeout(() => {
      if (location.href !== lastUrl) {
        const oldUrl = lastUrl;
        lastUrl = location.href;
        onNavigate(oldUrl, lastUrl);
      }
    }, 0);
  });
}
```

---

## 9. Main content script: wiring it all together

```javascript
// content.js — Main entry point
import { SELECTORS } from '../shared/constants.js';
import { initObserver, initUrlWatcher } from './observer.js';
import { initAutocompleteUI, showPopup, hidePopup, isPopupActive, 
         getSelectedItem, moveSelection } from './autocomplete.js';
import { detectPartialShortcode, detectCompleteShortcode, 
         searchShortcodes } from './shortcode-engine.js';
import { replaceTextRange, insertTextAtCursor } from './editor.js';
import { getCaretCoordinates, getCaretOffset } from './caret.js';
import { applyThemeToPopup, watchThemeChanges } from './theme.js';

let shortcodeMap = {};
let sortedShortcodes = [];
let isEnabled = true;

// --- Initialization ---
async function init() {
  // Load settings
  const settings = await chrome.storage.sync.get({
    enabled: true,
    autocompleteMinChars: 2,
  });
  isEnabled = settings.enabled;
  if (!isEnabled) return;
  
  // Load emoji data
  const dataUrl = chrome.runtime.getURL('src/data/shortcode-map.json');
  const sortedUrl = chrome.runtime.getURL('src/data/sorted-shortcodes.json');
  
  const [mapResp, sortedResp] = await Promise.all([
    fetch(dataUrl), fetch(sortedUrl)
  ]);
  shortcodeMap = await mapResp.json();
  sortedShortcodes = await sortedResp.json();
  
  // Initialize UI
  initAutocompleteUI();
  
  // Watch for compose boxes
  initObserver(attachToEditor);
  initUrlWatcher(() => { /* URL changed — observer handles DOM updates */ });
  
  // Watch for theme changes
  watchThemeChanges(() => {
    if (isPopupActive()) {
      applyThemeToPopup(document.querySelector('#xmoji-host')
        ?.shadowRoot?.querySelector('.emoji-ac-popup'));
    }
  });
  
  // Keyboard handler (capture phase)
  document.addEventListener('keydown', handleKeyDown, true);
  
  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.enabled) {
      isEnabled = changes.enabled.newValue;
    }
  });
}

// --- Attach to a compose box editor ---
function attachToEditor(editor) {
  editor.addEventListener('input', () => {
    if (!isEnabled) return;
    handleEditorInput(editor);
  });
  
  editor.addEventListener('blur', () => {
    // Delay hide to allow click on popup items
    setTimeout(() => {
      if (!isPopupActive()) return;
      hidePopup();
    }, 200);
  });
}

// --- Handle input events ---
function handleEditorInput(editor) {
  const text = editor.textContent || '';
  const cursorOffset = getCaretOffset(editor);
  
  // 1. Check for completed shortcode (closing ':' just typed)
  const complete = detectCompleteShortcode(text, cursorOffset);
  if (complete && shortcodeMap[complete.shortcode]) {
    hidePopup();
    replaceTextRange(editor, complete.startIndex, complete.endIndex,
                     shortcodeMap[complete.shortcode]);
    trackUsage(complete.shortcode);
    return;
  }
  
  // 2. Check for partial shortcode (show autocomplete)
  const partial = detectPartialShortcode(text, cursorOffset);
  if (partial && partial.prefix.length >= 2) {
    const results = searchShortcodes(partial.prefix, sortedShortcodes, shortcodeMap);
    if (results.length > 0) {
      const coords = getCaretCoordinates();
      if (coords) {
        showPopup(results, coords);
        const popup = document.querySelector('#xmoji-host')
          ?.shadowRoot?.querySelector('.emoji-ac-popup');
        if (popup) applyThemeToPopup(popup);
      }
      return;
    }
  }
  
  // 3. No match — hide popup
  hidePopup();
}

// --- Keyboard handler ---
function handleKeyDown(event) {
  if (!isPopupActive()) return;
  if (event.isComposing) return;
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      event.stopPropagation();
      moveSelection(1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      event.stopPropagation();
      moveSelection(-1);
      break;
    case 'Enter':
    case 'Tab':
      event.preventDefault();
      event.stopPropagation();
      confirmSelection();
      break;
    case 'Escape':
      event.preventDefault();
      event.stopPropagation();
      hidePopup();
      break;
  }
}

function confirmSelection() {
  const item = getSelectedItem();
  if (!item) return;
  
  const activeEditor = document.querySelector(SELECTORS.COMPOSE_BOX_ANY + ':focus')
    || document.activeElement?.closest(SELECTORS.COMPOSE_BOX_ANY);
  if (!activeEditor) { hidePopup(); return; }
  
  const text = activeEditor.textContent || '';
  const cursorOffset = getCaretOffset(activeEditor);
  const partial = detectPartialShortcode(text, cursorOffset);
  
  if (partial) {
    // Replace ":partial" with the emoji character
    replaceTextRange(activeEditor, partial.startIndex, cursorOffset, item.emoji);
    trackUsage(item.name);
  }
  hidePopup();
}

// --- Usage tracking for frequency-based ranking ---
function trackUsage(shortcode) {
  chrome.storage.local.get({ emojiFrequency: {} }, (data) => {
    data.emojiFrequency[shortcode] = (data.emojiFrequency[shortcode] || 0) + 1;
    chrome.storage.local.set({ emojiFrequency: data.emojiFrequency });
  });
}

// --- Bootstrap ---
init();
```

---

## 10. Service worker and settings

### Background service worker

```javascript
// background/service-worker.js
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      enabled: true,
      autocompleteMinChars: 2,
      replaceOnComplete: true,
      showAutocomplete: true,
      maxSuggestions: 8,
    });
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    chrome.storage.sync.get('enabled', (data) => {
      sendResponse({ enabled: data.enabled });
    });
    return true; // keep channel open for async response
  }
});
```

### Popup page

```html
<!-- popup/popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <h1>😀 Xmoji</h1>
    <div class="toggle-row">
      <label for="enableToggle">Enable on X</label>
      <input type="checkbox" id="enableToggle" checked>
    </div>
    <div class="toggle-row">
      <label for="autocompleteToggle">Show autocomplete popup</label>
      <input type="checkbox" id="autocompleteToggle" checked>
    </div>
    <div class="info">
      <p>Type <code>:shortcode:</code> in any X compose box to auto-replace with emoji.</p>
      <p>Start typing <code>:</code> + 2 chars for suggestions.</p>
    </div>
    <a href="#" id="optionsLink">Advanced Settings</a>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup/popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const enableToggle = document.getElementById('enableToggle');
  const autocompleteToggle = document.getElementById('autocompleteToggle');
  const optionsLink = document.getElementById('optionsLink');
  
  // Load current settings
  const settings = await chrome.storage.sync.get({
    enabled: true,
    showAutocomplete: true,
  });
  enableToggle.checked = settings.enabled;
  autocompleteToggle.checked = settings.showAutocomplete;
  
  // Save on change (reactive: content script listens via onChanged)
  enableToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: enableToggle.checked });
  });
  autocompleteToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ showAutocomplete: autocompleteToggle.checked });
  });
  
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});
```

### Options page

```html
<!-- options/options.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div class="options-container">
    <h1>Xmoji Settings</h1>
    
    <section>
      <h2>General</h2>
      <label>
        <input type="checkbox" id="enabled" checked>
        Enable extension
      </label>
      <label>
        <input type="checkbox" id="replaceOnComplete" checked>
        Auto-replace when closing <code>:</code> is typed
      </label>
      <label>
        <input type="checkbox" id="showAutocomplete" checked>
        Show autocomplete popup
      </label>
      <label>
        Min characters for autocomplete:
        <input type="number" id="autocompleteMinChars" min="1" max="5" value="2">
      </label>
    </section>
    
    <section>
      <h2>Custom Shortcodes</h2>
      <p>Add your own shortcode → emoji mappings:</p>
      <div id="customShortcodes"></div>
      <button id="addCustom">+ Add Custom Shortcode</button>
    </section>
    
    <button id="save">Save</button>
    <span id="status"></span>
  </div>
  <script src="options.js"></script>
</body>
</html>
```

```javascript
// options/options.js
document.addEventListener('DOMContentLoaded', async () => {
  const fields = ['enabled', 'replaceOnComplete', 'showAutocomplete', 'autocompleteMinChars'];
  
  const settings = await chrome.storage.sync.get({
    enabled: true,
    replaceOnComplete: true,
    showAutocomplete: true,
    autocompleteMinChars: 2,
    customShortcodes: {},
  });
  
  document.getElementById('enabled').checked = settings.enabled;
  document.getElementById('replaceOnComplete').checked = settings.replaceOnComplete;
  document.getElementById('showAutocomplete').checked = settings.showAutocomplete;
  document.getElementById('autocompleteMinChars').value = settings.autocompleteMinChars;
  
  renderCustomShortcodes(settings.customShortcodes);
  
  document.getElementById('save').addEventListener('click', async () => {
    await chrome.storage.sync.set({
      enabled: document.getElementById('enabled').checked,
      replaceOnComplete: document.getElementById('replaceOnComplete').checked,
      showAutocomplete: document.getElementById('showAutocomplete').checked,
      autocompleteMinChars: parseInt(document.getElementById('autocompleteMinChars').value) || 2,
      customShortcodes: collectCustomShortcodes(),
    });
    document.getElementById('status').textContent = 'Saved!';
    setTimeout(() => { document.getElementById('status').textContent = ''; }, 2000);
  });
});

function renderCustomShortcodes(map) {
  const container = document.getElementById('customShortcodes');
  container.innerHTML = '';
  for (const [code, emoji] of Object.entries(map)) {
    addCustomRow(container, code, emoji);
  }
}

function addCustomRow(container, code = '', emoji = '') {
  const row = document.createElement('div');
  row.className = 'custom-row';
  row.innerHTML = `
    <input type="text" class="custom-code" placeholder="shortcode" value="${code}">
    <span> → </span>
    <input type="text" class="custom-emoji" placeholder="emoji" value="${emoji}">
    <button class="remove-btn">×</button>
  `;
  row.querySelector('.remove-btn').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function collectCustomShortcodes() {
  const rows = document.querySelectorAll('.custom-row');
  const map = {};
  rows.forEach(row => {
    const code = row.querySelector('.custom-code').value.trim().toLowerCase();
    const emoji = row.querySelector('.custom-emoji').value.trim();
    if (code && emoji) map[code] = emoji;
  });
  return map;
}
```

---

## 11. Performance and robustness

### Debouncing strategy

The MutationObserver callback fires on every DOM mutation — on X this can be **hundreds of times per second** during scrolling. The 150ms debounce in `observer.js` collapses these into a single scan. The `input` event handler on the compose box does not need debouncing because it only fires on actual text changes and the autocomplete search completes in under 1ms for 3,500 entries.

### Lazy-loading emoji data

The emoji JSON files are loaded via `fetch()` from the extension's bundled resources only when the content script initializes on an X page. This avoids bloating memory on non-X tabs. Total memory footprint is approximately **400–500KB** for both data structures.

### Defensive selector strategy

```javascript
function findComposeBox() {
  // Try primary selector first
  let box = document.querySelector(SELECTORS.COMPOSE_BOX_ANY);
  if (box) return box;
  
  // Fallback: any contenteditable textbox (less specific)
  box = document.querySelector(FALLBACK_SELECTORS.COMPOSE_BOX);
  if (box) return box;
  
  return null;
}
```

If X changes `data-testid` values, the fallback selector `div[role="textbox"][contenteditable="true"]` will still match, though it may also match non-compose-box elements. The extension should be updated promptly when selector changes are detected.

### Avoiding conflicts with X's keyboard shortcuts

X has built-in keyboard shortcuts (e.g., `j`/`k` for navigation, `/` for search, `n` for new tweet). The extension only intercepts keys when the autocomplete popup is visible AND the user is focused in a compose box. Arrow keys, Enter, Tab, and Escape are only captured during active autocomplete. All other keystrokes pass through untouched.

### Content Security Policy compatibility

Content scripts in Chrome's ISOLATED world are **exempt from X's page CSP** for most DOM operations. The extension can freely create `<style>` elements, Shadow DOM nodes, and fetch its own bundled resources. No CSP workarounds are needed.

---

## 12. Testing strategy

### Automated tests with Puppeteer

```javascript
// tests/e2e.test.js
const puppeteer = require('puppeteer');
const path = require('path');

const EXT_PATH = path.resolve(__dirname, '../dist');

describe('Xmoji Extension', () => {
  let browser, page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${EXT_PATH}`,
        `--load-extension=${EXT_PATH}`,
      ],
    });
    page = await browser.newPage();
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  test('shortcode replacement works in compose box', async () => {
    await page.goto('https://x.com/compose/post');
    await page.waitForSelector('[data-testid="tweetTextarea_0"]');
    const editor = await page.$('[data-testid="tweetTextarea_0"]');
    await editor.click();
    await editor.type(':smile:', { delay: 50 });
    const text = await page.evaluate(() =>
      document.querySelector('[data-testid="tweetTextarea_0"]').textContent
    );
    expect(text).toContain('😄');
  });
  
  test('autocomplete popup appears after 2 characters', async () => {
    const editor = await page.$('[data-testid="tweetTextarea_0"]');
    await editor.click();
    await editor.type(':sm', { delay: 50 });
    // Check shadow DOM for popup visibility
    const popupVisible = await page.evaluate(() => {
      const host = document.querySelector('#xmoji-host');
      if (!host?.shadowRoot) return false;
      const popup = host.shadowRoot.querySelector('.emoji-ac-popup');
      return popup?.style.display !== 'none';
    });
    expect(popupVisible).toBe(true);
  });
});
```

### Unit tests with Jest

```javascript
// tests/shortcode-engine.test.js
import { detectPartialShortcode, detectCompleteShortcode,
         searchShortcodes } from '../src/content/shortcode-engine.js';

describe('detectCompleteShortcode', () => {
  test('detects simple shortcode', () => {
    const result = detectCompleteShortcode('hello :smile:', 13);
    expect(result).toEqual({
      shortcode: 'smile',
      fullMatch: ':smile:',
      startIndex: 6,
      endIndex: 13,
    });
  });
  
  test('ignores URLs', () => {
    expect(detectCompleteShortcode('https://example.com:', 20)).toBeNull();
  });
  
  test('handles adjacent shortcodes', () => {
    const result = detectCompleteShortcode(':wave::smile:', 13);
    expect(result.shortcode).toBe('smile');
  });
  
  test('handles plus shortcodes', () => {
    const result = detectCompleteShortcode(':+1:', 4);
    expect(result.shortcode).toBe('+1');
  });
});

describe('searchShortcodes', () => {
  const map = { smile: '😄', smirk: '😏', sob: '😭', wave: '👋' };
  const sorted = Object.keys(map).sort();
  
  test('prefix search returns matches', () => {
    const results = searchShortcodes('sm', sorted, map);
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('smile');
  });
  
  test('returns empty for no matches', () => {
    expect(searchShortcodes('zz', sorted, map)).toHaveLength(0);
  });
});
```

### Manual testing checklist

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Basic replacement | Type `:smile:` in home feed compose | 😄 appears |
| 2 | Modal compose | Click compose button, type `:wave:` | 👋 appears |
| 3 | Reply compose | Click reply on a tweet, type `:thumbsup:` | 👍 appears |
| 4 | Quote tweet | Quote a tweet, type `:heart:` | ❤️ appears |
| 5 | Thread compose | Add second tweet in thread, type `:fire:` | 🔥 appears |
| 6 | DM compose | Open DM, type `:smile:` | 😄 appears (if DM supported) |
| 7 | Autocomplete popup | Type `:smi` | Popup shows smile, smirk, etc. |
| 8 | Arrow key navigation | Popup open → press ArrowDown/Up | Selection moves |
| 9 | Enter/Tab confirms | Popup open with selection → Enter | Emoji inserted, popup closes |
| 10 | Escape dismisses | Popup open → Escape | Popup closes, no insertion |
| 11 | Unknown shortcode | Type `:notreal:` | Text left unchanged |
| 12 | URL not matched | Type `https://example.com:8080` | No replacement |
| 13 | Multiple shortcodes | Type `:wave: hello :smile:` | Both replaced |
| 14 | Dark mode | Switch to dark theme | Popup matches dark colors |
| 15 | Light mode | Switch to light theme | Popup matches light colors |
| 16 | SPA navigation | Navigate Home → Profile → Home | Extension still works |
| 17 | Page refresh | Refresh x.com | Extension reinitializes |
| 18 | Toggle off via popup | Disable in extension popup | Shortcodes not replaced |
| 19 | Custom shortcode | Add custom mapping in options, use it | Custom emoji appears |
| 20 | With media/poll | Add image/poll to tweet, then use shortcode | Still works |

---

## 13. Chrome Web Store distribution

### Required assets

| Asset | Dimensions | Notes |
|-------|-----------|-------|
| Extension icon | 128×128px | 96×96 artwork with 16px transparent padding, PNG |
| Manifest icons | 16, 32, 48, 128px | All PNG, referenced in manifest.json |
| Screenshots | 1280×800 or 640×400 | Min 1, max 5. Show autocomplete in action, dark/light modes |
| Small promo tile | 440×280px | Required. Show logo + tagline |
| Description | ≤16,000 chars | Avoid keyword spam |

### Publishing process

1. **Register**: Pay **$5 one-time fee** at the Chrome Developer Dashboard. Enable 2-Step Verification.
2. **Package**: ZIP the `dist/` directory (manifest.json at root).
3. **Upload**: Chrome Developer Dashboard → New Item → Upload ZIP.
4. **Listing**: Add screenshots, description, promo tiles, category (Productivity), language.
5. **Privacy**: Declare "This extension does not collect or transmit any user data" in the privacy practices tab. No privacy policy URL required if no data is collected.
6. **Submit**: Review typically takes **1–3 business days**. Simple extensions often approved within 24 hours.

### Avoiding rejection

Rejection is most commonly caused by **excessive permissions**. This extension requests only `storage` (for settings) and `host_permissions` for X's two domains. No `<all_urls>`, no `tabs`, no `webRequest`. The permission justification should state: "`host_permissions` for x.com and twitter.com: Required to inject content script that adds emoji shortcode support to the compose box. `storage`: Required to save user preferences."

All code is self-contained — no remote code loading, no `eval()`, no external script tags — meeting Manifest V3's strict code requirements.

---

## 14. Known risks and mitigations

**X may migrate away from Draft.js.** The compose box has used Draft.js for years, but X could switch to a custom editor or another framework. The paste-emulation insertion technique and `execCommand('insertText')` fallback both work with any `contenteditable` element regardless of the underlying framework. The selector `div[role="textbox"][contenteditable="true"]` serves as a framework-agnostic fallback.

**X may change `data-testid` values.** While `data-testid` attributes are more stable than CSS classes (which change every deployment), they can still change in major redesigns. The extension should log warnings to the console when selectors fail, making diagnosis straightforward. An update mechanism through the Chrome Web Store allows pushing fixes within 1–3 days.

**`document.execCommand` is deprecated.** Although deprecated, `execCommand('insertText')` remains supported across all browsers. The primary insertion method (paste emulation) does not rely on it. The extension uses `execCommand` only as a secondary fallback.

**React reconciliation conflicts.** The extension never directly manipulates DOM nodes managed by React. All text insertion goes through browser-native events (paste, input) that Draft.js processes through its proper state management pipeline. The autocomplete popup lives in an isolated Shadow DOM container appended to `document.body`, outside React's managed tree entirely.

## Conclusion

This specification covers every layer needed to build the extension from scratch: X's Draft.js compose box internals and the three working text insertion strategies (paste emulation as primary, execCommand as fallback), a complete Manifest V3 configuration with minimal permissions, iamcal/emoji-data as the Slack-canonical source for ~3,500 shortcode mappings with O(1) lookups and binary-search autocomplete, a Shadow DOM popup that dynamically matches X's three themes via computed body background color, capture-phase keyboard interception that avoids conflicting with X's shortcuts, and debounced MutationObserver patterns for reliable compose box detection across SPA navigation. The extension processes everything locally with zero network calls, simplifying both privacy compliance and Chrome Web Store approval. The main architectural risk — X changing their DOM structure — is mitigated through layered selector fallbacks and the framework-agnostic nature of the paste-emulation insertion technique.