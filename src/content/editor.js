// editor.js — Text insertion into Draft.js

// Primary method: clipboard paste emulation
export function insertTextAtCursor(element, text) {
  element.focus();

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

// Fallback method: execCommand insertText
export function insertTextExecCommand(element, text) {
  element.focus();
  document.execCommand('insertText', false, text);
}

// Replace a text range (for shortcode replacement)
export function replaceTextRange(composeBox, startOffset, endOffset, replacementText) {
  composeBox.focus();

  const sel = window.getSelection();
  const textContainer = composeBox.querySelector('[data-contents="true"]');
  if (!textContainer) {
    // Fallback: try the composeBox itself
    return replaceTextRangeInElement(composeBox, sel, startOffset, endOffset, replacementText);
  }

  return replaceTextRangeInElement(textContainer, sel, startOffset, endOffset, replacementText);
}

function replaceTextRangeInElement(container, sel, startOffset, endOffset, replacementText) {
  // Walk text nodes to find the correct range
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
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

  // Primary: execCommand — fires beforeinput which Draft.js handles with current selection
  const success = document.execCommand('insertText', false, replacementText);
  if (!success) {
    // Fallback: paste emulation
    const composeBox = container.closest('[role="textbox"]') || container;
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', replacementText);
    composeBox.dispatchEvent(new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true,
      composed: true,
    }));
  }

  return true;
}
