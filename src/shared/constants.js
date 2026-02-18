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

// Default settings
export const DEFAULT_SETTINGS = {
  enabled: true,
  autocompleteMinChars: 2,
  replaceOnComplete: true,
  showAutocomplete: true,
  maxSuggestions: 8,
  customShortcodes: {},
};
