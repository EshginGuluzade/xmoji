// caret.js — Caret position utilities

export function getCaretCoordinates() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(false);

  let rect = range.getBoundingClientRect();

  // Fallback for zero-width rect (caret at end of line)
  if (rect.height === 0 || (rect.left === 0 && rect.top === 0)) {
    const tempNode = document.createTextNode('\u200B');
    range.insertNode(tempNode);
    rect = range.getBoundingClientRect();
    const coords = {
      x: rect.left,
      y: rect.top,
      bottom: rect.bottom,
      height: rect.height,
    };
    tempNode.parentNode.removeChild(tempNode);
    selection.removeAllRanges();
    selection.addRange(range);
    return coords;
  }

  return { x: rect.left, y: rect.top, bottom: rect.bottom, height: rect.height };
}

export function getCaretOffset(element) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.endContainer, range.endOffset);
  return preRange.toString().length;
}
