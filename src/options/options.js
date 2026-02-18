// options/options.js
document.addEventListener('DOMContentLoaded', async () => {
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

  document.getElementById('addCustom').addEventListener('click', () => {
    addCustomRow(document.getElementById('customShortcodes'));
  });

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
