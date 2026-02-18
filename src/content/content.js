// content.js — Main entry point
import { SELECTORS } from '../shared/constants.js';
import { initObserver, initUrlWatcher } from './observer.js';
import { initAutocompleteUI, showPopup, hidePopup, isPopupActive,
         getSelectedItem, moveSelection, getShadowHost } from './autocomplete.js';
import { detectPartialShortcode, detectCompleteShortcode,
         searchShortcodes } from './shortcode-engine.js';
import { replaceTextRange } from './editor.js';
import { getCaretCoordinates, getCaretOffset } from './caret.js';
import { applyThemeToPopup, watchThemeChanges } from './theme.js';

let shortcodeMap = {};
let sortedShortcodes = [];
let isEnabled = true;
let showAutocomplete = true;
let autocompleteMinChars = 2;
let customShortcodes = {};

// --- Initialization ---
async function init() {
  try {
    // Load settings
    const settings = await chrome.storage.sync.get({
      enabled: true,
      showAutocomplete: true,
      autocompleteMinChars: 2,
      customShortcodes: {},
    });
    isEnabled = settings.enabled;
    showAutocomplete = settings.showAutocomplete;
    autocompleteMinChars = settings.autocompleteMinChars;
    customShortcodes = settings.customShortcodes || {};

    if (!isEnabled) return;

    // Load emoji data
    const dataUrl = chrome.runtime.getURL('src/data/shortcode-map.json');
    const sortedUrl = chrome.runtime.getURL('src/data/sorted-shortcodes.json');

    const [mapResp, sortedResp] = await Promise.all([
      fetch(dataUrl), fetch(sortedUrl)
    ]);
    shortcodeMap = await mapResp.json();
    sortedShortcodes = await sortedResp.json();

    // Merge custom shortcodes
    mergeCustomShortcodes();

    // Initialize autocomplete UI
    initAutocompleteUI();

    // Watch for compose boxes
    initObserver(attachToEditor);
    initUrlWatcher(() => { /* URL changed — observer handles DOM updates */ });

    // Watch for theme changes
    watchThemeChanges(() => {
      if (isPopupActive()) {
        const popup = getPopupElement();
        if (popup) applyThemeToPopup(popup);
      }
    });

    // Keyboard handler (capture phase — fires before X's React handlers)
    document.addEventListener('keydown', handleKeyDown, true);

    // Listen for popup item clicks
    const host = getShadowHost();
    if (host) {
      host.addEventListener('emoji-select', (e) => {
        confirmSelectionWithItem(e.detail.item);
      });
    }

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.enabled) {
        isEnabled = changes.enabled.newValue;
      }
      if (changes.showAutocomplete) {
        showAutocomplete = changes.showAutocomplete.newValue;
        if (!showAutocomplete) hidePopup();
      }
      if (changes.autocompleteMinChars) {
        autocompleteMinChars = changes.autocompleteMinChars.newValue;
      }
      if (changes.customShortcodes) {
        customShortcodes = changes.customShortcodes.newValue || {};
        mergeCustomShortcodes();
      }
    });
  } catch (err) {
    console.warn('[Xmoji] Init error:', err);
  }
}

function mergeCustomShortcodes() {
  // Add custom shortcodes to the map (overrides built-in)
  for (const [code, emoji] of Object.entries(customShortcodes)) {
    shortcodeMap[code] = emoji;
  }
  // Rebuild sorted list
  sortedShortcodes = Object.keys(shortcodeMap).sort();
}

function getPopupElement() {
  return document.querySelector('#xmoji-host')
    ?.shadowRoot?.querySelector('.emoji-ac-popup');
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
  if (showAutocomplete) {
    const partial = detectPartialShortcode(text, cursorOffset);
    if (partial && partial.prefix.length >= autocompleteMinChars) {
      const results = searchShortcodes(partial.prefix, sortedShortcodes, shortcodeMap);
      if (results.length > 0) {
        const coords = getCaretCoordinates();
        if (coords) {
          showPopup(results, coords);
          const popup = getPopupElement();
          if (popup) applyThemeToPopup(popup);
        }
        return;
      }
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
  confirmSelectionWithItem(item);
}

function confirmSelectionWithItem(item) {
  const activeEditor = document.querySelector(SELECTORS.COMPOSE_BOX_ANY + ':focus')
    || document.activeElement?.closest(SELECTORS.COMPOSE_BOX_ANY)
    || document.querySelector(SELECTORS.DM_COMPOSE + ':focus')
    || document.activeElement?.closest(SELECTORS.DM_COMPOSE);

  if (!activeEditor) { hidePopup(); return; }

  const text = activeEditor.textContent || '';
  const cursorOffset = getCaretOffset(activeEditor);
  const partial = detectPartialShortcode(text, cursorOffset);

  if (partial) {
    replaceTextRange(activeEditor, partial.startIndex, cursorOffset, item.emoji);
    trackUsage(item.name);
  }
  hidePopup();
}

// --- Usage tracking for frequency-based ranking ---
function trackUsage(shortcode) {
  try {
    chrome.storage.local.get({ emojiFrequency: {} }, (data) => {
      data.emojiFrequency[shortcode] = (data.emojiFrequency[shortcode] || 0) + 1;
      chrome.storage.local.set({ emojiFrequency: data.emojiFrequency });
    });
  } catch (e) {
    // Non-critical — ignore
  }
}

// --- Bootstrap ---
init();
