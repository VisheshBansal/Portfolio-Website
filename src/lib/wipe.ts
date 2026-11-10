/**
 * The site's signature transition: an accent line draws across the middle, then a clip-path
 * opens (or closes) from it. Used by the intro curtain and the reel.
 */

const CLOSED = 'inset(50% 0% 50% 0%)';
const OPEN = 'inset(0% 0% 0% 0%)';
let wipeCount = 0;

export interface LineWipe {
  line: Element;
  target: Element;
  /** 'open' reveals the target from the line; 'close' collapses it onto the line. */
  direction: 'open' | 'close';
  at: gsap.Position;
  lineDuration: number;
  clipDuration: number;
}

/** Adds the wipe to a timeline and returns the label where the clip starts moving. */
export function addLineWipe(timeline: gsap.core.Timeline, wipe: LineWipe): string {
  const label = `line-wipe-${++wipeCount}`;
  const [from, to] = wipe.direction === 'open' ? [CLOSED, OPEN] : [OPEN, CLOSED];
  timeline
    .fromTo(wipe.line, { scaleX: 0 }, { scaleX: 1, duration: wipe.lineDuration, ease: 'expo.inOut' }, wipe.at)
    .addLabel(label, '>')
    .fromTo(wipe.target, { clipPath: from }, { clipPath: to, duration: wipe.clipDuration, ease: 'expo.inOut' }, label)
    .to(wipe.line, { autoAlpha: 0, duration: Math.min(0.3, wipe.clipDuration / 2) }, label);
  return label;
}
