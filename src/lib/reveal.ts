/**
 * Coordinates the moment the page is "revealed": when the intro montage opens, or immediately
 * on repeat visits. Late subscribers run at once, so script order never matters.
 */

const REVEAL_EVENT = 'vb:reveal';
let revealed = false;

export function announceReveal(): void {
  if (revealed) return;
  revealed = true;
  window.dispatchEvent(new Event(REVEAL_EVENT));
}

export function onReveal(callback: () => void): void {
  if (revealed) callback();
  else window.addEventListener(REVEAL_EVENT, callback, { once: true });
}
