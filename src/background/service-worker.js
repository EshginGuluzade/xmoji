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
      customShortcodes: {},
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
