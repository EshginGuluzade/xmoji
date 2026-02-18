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

  // Save on change
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
