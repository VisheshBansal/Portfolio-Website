/** Text splitting presets shared by every section, so reveals look and behave the same everywhere. */
import { gsap, SplitText, reducedMotion } from './motion';

const HEADINGS = 'h1, h2, h3, h4, h5, h6';

/** Readable text of an element: compressed HTML drops the whitespace between its lines, so text nodes join with spaces. */
function spokenText(element: Element): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) parts.push(node.nodeValue ?? '');
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Characters grouped by word, for rises from a `.mask-line` parent. Screen readers must never spell a word out letter
 * by letter, and a plain span may not carry a label: a heading takes GSAP's label itself; a span inside one is hidden
 * and the heading is labelled with its whole text; any other span keeps a visually hidden copy of its text.
 */
export function splitChars(targets: Element | readonly Element[]): Element[] {
  return (targets instanceof Element ? [targets] : targets).flatMap((target) => {
    if (target.matches(HEADINGS)) return new SplitText(target, { type: 'words,chars' }).chars;
    const heading = target.closest(HEADINGS);
    if (heading) {
      if (!heading.hasAttribute('aria-label')) heading.setAttribute('aria-label', spokenText(heading));
    } else if (!target.previousElementSibling?.hasAttribute('data-split-copy')) {
      const copy = document.createElement('span');
      copy.className = 'sr-only';
      copy.dataset.splitCopy = '';
      copy.textContent = target.textContent;
      target.before(copy);
    }
    return new SplitText(target, { type: 'words,chars', aria: 'hidden' }).chars;
  });
}

/**
 * Word and line splits keep their text readable in place (aria 'none'): GSAP's default moves it into an
 * aria-label, which paragraphs cannot carry, and hides the real words.
 */
export function splitWords(target: Element): Element[] {
  return new SplitText(target, { type: 'words', aria: 'none' }).words;
}

/** Lines wrapped in their own overflow masks, for headline rises. Revert after the rise so the lines rewrap on resize. */
export function splitMaskedLines(target: Element): SplitText {
  return new SplitText(target, { type: 'lines,words', mask: 'lines', aria: 'none' });
}

/** Hidden offset for a masked rise; animate back to 0. */
export const RISE_FROM = { yPercent: 110 } as const;

/** How far a changing value travels as it rolls in, and for how long. */
export interface Roll {
  readonly fromYPercent: number;
  readonly duration: number;
}

/** Swaps in new text and rolls it up into place; unchanged text is left alone. */
export function rollText(element: HTMLElement, text: string, roll: Roll, animate = !reducedMotion): void {
  if (element.textContent === text) return;
  element.textContent = text;
  if (!animate) return;
  gsap.fromTo(
    element,
    { yPercent: roll.fromYPercent, opacity: 0 },
    { yPercent: 0, opacity: 1, duration: roll.duration, ease: 'expo.out', overwrite: true },
  );
}
