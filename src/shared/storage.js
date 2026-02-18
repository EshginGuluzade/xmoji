// storage.js — Thin chrome.storage wrapper

export function getSettings(defaults = {}) {
  return chrome.storage.sync.get(defaults);
}

export function saveSettings(settings) {
  return chrome.storage.sync.set(settings);
}

export function getLocal(defaults = {}) {
  return chrome.storage.local.get(defaults);
}

export function saveLocal(data) {
  return chrome.storage.local.set(data);
}

export function onSettingsChanged(callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      callback(changes);
    }
  });
}
