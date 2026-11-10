import { gsap, finePointer, reducedMotion } from '../../lib/motion';
import { query } from '../../lib/dom';

const CLICKABLE = 'a[href], button, [role="button"], label, summary';
/** Where the native caret comes back (the stylesheet mirrors this list). */
const TYPING = 'input:not([type="checkbox"], [type="radio"], [type="submit"], [type="button"]), textarea, select, [contenteditable="true"]';
/** Spots whose gesture the cursor names, because a swelling ring alone would not say it. */
const LABELS: readonly (readonly [selector: string, label: string])[] = [
  ['.places__globe', 'Drag'],
  ['abbr[title]', '?'],
];
const RING_FOLLOW = { duration: 0.45, ease: 'power3.out' } as const;

type CursorState = 'idle' | 'hover' | 'label' | 'typing';

function stateFor(target: Element): { state: CursorState; label: string } {
  if (target.closest(TYPING)) return { state: 'typing', label: '' };
  for (const [selector, label] of LABELS) if (target.closest(selector)) return { state: 'label', label };
  return { state: target.closest(CLICKABLE) ? 'hover' : 'idle', label: '' };
}

export function initCursor(): void {
  if (!finePointer || reducedMotion) return;
  const root = query('[data-cursor]');
  const ring = query('[data-cursor-ring]', root);
  const dot = query('[data-cursor-dot]', root);
  const label = query('[data-cursor-label]', root);
  const html = document.documentElement;
  const ringX = gsap.quickTo(ring, 'x', RING_FOLLOW);
  const ringY = gsap.quickTo(ring, 'y', RING_FOLLOW);
  const dotX = gsap.quickSetter(dot, 'x', 'px');
  const dotY = gsap.quickSetter(dot, 'y', 'px');

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      // The first move places everything on the pointer, so the ring never sweeps in from the corner.
      if (!html.classList.contains('has-cursor')) {
        gsap.set([ring, dot], { x: event.clientX, y: event.clientY });
        html.classList.add('has-cursor');
      }
      ringX(event.clientX);
      ringY(event.clientY);
      dotX(event.clientX);
      dotY(event.clientY);
    },
    { passive: true },
  );
  document.addEventListener('pointerover', (event) => {
    if (!(event.target instanceof Element)) return;
    const next = stateFor(event.target);
    root.dataset.state = next.state;
    if (next.label) label.textContent = next.label;
  });
  const press = (down: boolean) => () => root.toggleAttribute('data-pressed', down);
  window.addEventListener('pointerdown', press(true));
  window.addEventListener('pointerup', press(false));
  window.addEventListener('blur', press(false));
  html.addEventListener('pointerleave', () => root.toggleAttribute('data-away', true));
  html.addEventListener('pointerenter', () => root.toggleAttribute('data-away', false));
}
