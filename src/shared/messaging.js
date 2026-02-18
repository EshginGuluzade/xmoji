// messaging.js — Message passing helpers

export function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

export function onMessage(callback) {
  chrome.runtime.onMessage.addListener(callback);
}
