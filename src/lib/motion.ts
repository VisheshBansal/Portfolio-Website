/**
 * Motion runtime: GSAP plugins, Lenis smooth scroll wired into ScrollTrigger, and shared helpers.
 * Every animated component imports from here so the runtime is initialised exactly once.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { focusTarget, isPlainClick } from './dom';
import { onReveal } from './reveal';

gsap.registerPlugin(ScrollTrigger, SplitText);
/** Any refreshPriority makes ScrollTrigger refresh in page order; sections create triggers after fonts load, out of order. */
ScrollTrigger.defaults({ refreshPriority: 0 });

const LENIS_LERP = 0.085;
const ANCHOR_SCROLL_SECONDS = 1.6;
const FONT_WAIT_MS = 1800;
/** Longest a queued section setup waits for an idle slot. */
const SETUP_IDLE_TIMEOUT_MS = 300;

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(pointer: fine)').matches;

export const lenis: Lenis | null = reducedMotion ? null : new Lenis({ lerp: LENIS_LERP, smoothWheel: true });

if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((seconds) => lenis.raf(seconds * 1000));
  gsap.ticker.lagSmoothing(0);
}

/** Resolves when webfonts are ready (or after a timeout, so motion never waits forever). */
export function fontsReady(timeoutMs = FONT_WAIT_MS): Promise<void> {
  return Promise.race([document.fonts.ready.then(() => undefined), new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}

void fontsReady().then(() => ScrollTrigger.refresh());

/** Below-the-fold section setups waiting for an idle slot, in page order. */
const setups: (() => void)[] = [];
// A cold deep link needs every pin in place before the curtain opens, so it builds at once; otherwise wait for the reveal.
let revealed = hashTarget(location.hash) !== null;
// Module scripts can run with idle gaps between them; DOMContentLoaded follows the last, so every setup is queued by then.
let allQueued = false;
let setupQueued = false;
let landed = false;

/**
 * Runs a below-the-fold section's setup in an idle slot of its own, in page order, once the page is revealed: after the
 * montage on a first visit, so it never stutters, and at once on a repeat visit. No single task builds every section.
 */
export function whenIdle(setup: () => void): void {
  setups.push(setup);
  queueSetup();
}

function queueSetup(): void {
  if (!revealed || !allQueued || setupQueued || setups.length === 0) return;
  setupQueued = true;
  if ('requestIdleCallback' in window) requestIdleCallback(runSetup, { timeout: SETUP_IDLE_TIMEOUT_MS });
  else setTimeout(runSetup, 1);
}

function runSetup(): void {
  setupQueued = false;
  setups.shift()?.();
  if (setups.length > 0) queueSetup();
  // Sections finish their pins on fontsReady (some a frame later), so measure and land after that.
  else void fontsReady().then(() => requestAnimationFrame(settle));
}

function settle(): void {
  ScrollTrigger.refresh();
  if (landed) return;
  landed = true;
  landOnHash();
}

document.addEventListener(
  'DOMContentLoaded',
  () => {
    allQueued = true;
    queueSetup();
  },
  { once: true },
);
onReveal(() => {
  revealed = true;
  queueSetup();
});

function hashTarget(hash: string): HTMLElement | null {
  return hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
}

/** A cold deep link (/#work): the browser jumped before the pins above it existed, so jump again. */
function landOnHash(): void {
  const target = hashTarget(location.hash);
  if (!target) return;
  if (lenis) {
    // Lenis measures the page on a debounce: read the pins just built first, or the jump is clamped short of them.
    lenis.resize();
    lenis.scrollTo(target, { immediate: true, force: true });
  } else target.scrollIntoView();
}

/** Same-page anchors glide through Lenis, then hand over focus and the URL as a native jump would. */
document.addEventListener('click', (event) => {
  if (!lenis || !isPlainClick(event)) return;
  const hash = (event.target as Element | null)?.closest('a[href^="#"]')?.getAttribute('href') ?? '';
  const target = hashTarget(hash);
  if (!target) return;
  event.preventDefault();
  history.replaceState(null, '', hash);
  lenis.scrollTo(target, { duration: ANCHOR_SCROLL_SECONDS, onComplete: () => focusTarget(target) });
});

declare global {
  interface Window {
    /** Dev-only handle used by offline snapshot tooling to settle animations. */
    __vb?: { gsap: typeof gsap; ScrollTrigger: typeof ScrollTrigger; lenis: Lenis | null };
  }
}
if (import.meta.env.DEV) window.__vb = { gsap, ScrollTrigger, lenis };

export { gsap, ScrollTrigger, SplitText };
