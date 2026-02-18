// autocomplete.js — Popup UI + keyboard navigation

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
    /* Background set dynamically by theme */
  }

  .emoji-ac-popup::-webkit-scrollbar {
    width: 8px;
  }
  .emoji-ac-popup::-webkit-scrollbar-thumb {
    border-radius: 4px;
  }
`;

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
      selectedIndex = idx;
      // Dispatch a custom event the content script can listen for
      shadowHost.dispatchEvent(new CustomEvent('emoji-select', {
        detail: { item: currentItems[idx] },
      }));
    });
  });
}

export function hidePopup() {
  isActive = false;
  selectedIndex = -1;
  currentItems = [];
  if (popupEl) {
    popupEl.style.display = 'none';
    popupEl.innerHTML = '';
  }
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

  // Update selection background
  const selectedBg = popupEl.dataset.themeBg;
  if (selectedBg) {
    popupEl.querySelectorAll('.emoji-ac-item').forEach(el => {
      el.style.backgroundColor = '';
    });
    items[selectedIndex].style.backgroundColor = selectedBg;
  }
}

export function getShadowHost() {
  return shadowHost;
}
