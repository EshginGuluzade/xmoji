// observer.js — MutationObserver + SPA navigation
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

// URL change detection for SPA navigation
let lastUrl = location.href;

export function initUrlWatcher(onNavigate) {
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
