import { gsap, ScrollTrigger, reducedMotion, fontsReady } from '../../lib/motion';
import { query, queryAll } from '../../lib/dom';
import { onReveal } from '../../lib/reveal';
import { splitChars, splitWords } from '../../lib/text';
import { addLineWipe } from '../../lib/wipe';

/** Pin length in viewport heights; the timeline below is laid out on a 0..1 scale of it. */
const PIN_VIEWPORTS = 2.4;
const SCRUB = 0.5;
const SHOT = { start: 0.1, length: 0.105 } as const;
/** Beats wrap inside their mask on narrow screens, so each char starts below the whole mask, not one line down. */
const BELOW_MASK = { y: (_index: number, char: Element) => char.closest<HTMLElement>('.mask-line')?.offsetHeight ?? 0 };
const BEAT_RISE = { y: 0, stagger: 0.004, duration: 0.07, ease: 'power3.out' } as const;
/** The kicker surfaces word by word out of a blur. */
const WORD_HIDDEN = { autoAlpha: 0, yPercent: 60, filter: 'blur(12px)' } as const;
const WORD_SHOWN = { autoAlpha: 1, yPercent: 0, filter: 'blur(0px)', stagger: 0.01, duration: 0.05, ease: 'power2.out' } as const;

interface CopyParts {
  readonly setup: Element[];
  readonly punchline: Element[];
  readonly kicker: Element[];
}

export function initReel(): void {
  const section = query('[data-reel-root]');
  warmImagesAfterReveal(section);
  if (!reducedMotion) void buildTimeline(section);
}

/** Fast cuts must never land on an undecoded frame: load and decode once the hero has settled. */
function warmImagesAfterReveal(section: HTMLElement): void {
  onReveal(() => {
    const warm = () => {
      for (const image of queryAll<HTMLImageElement>('[data-reel-shot] img', section)) {
        image.loading = 'eager';
        image.decode().catch(() => undefined);
      }
    };
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 2500 });
    else setTimeout(warm, 1500);
  });
}

function splitCopy(copy: HTMLElement): CopyParts {
  const [setup, punchline] = queryAll('[data-reel-beat]', copy).map((beat) => splitChars(beat));
  if (!setup || !punchline) throw new Error('The reel copy needs a setup and a punchline beat');
  return { setup, punchline, kicker: splitWords(query('[data-reel-kicker]', copy)) };
}

async function buildTimeline(section: HTMLElement): Promise<void> {
  await fontsReady();
  const shots = queryAll('[data-reel-shot]', section);
  const copies = queryAll('[data-reel-copy]', section).map(splitCopy);
  gsap.set(queryAll('[data-reel-beat], [data-reel-kicker]', section), { visibility: 'visible' });

  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${window.innerHeight * PIN_VIEWPORTS}`,
      pin: true,
      scrub: SCRUB,
      invalidateOnRefresh: true,
    },
  });

  addLineWipe(timeline, {
    line: query('[data-reel-line]', section),
    target: query('[data-reel-film]', section),
    direction: 'open',
    at: 0,
    lineDuration: 0.05,
    clipDuration: 0.06,
  });

  shots.forEach((shot, index) => {
    const at = SHOT.start + index * SHOT.length;
    timeline
      .set(shots, { opacity: 0 }, at)
      .set(shot, { opacity: 1 }, at)
      .fromTo(query('img', shot), { scale: 1.14 }, { scale: 1.02, duration: SHOT.length, ease: 'power2.out' }, at)
      .fromTo(query('figcaption', shot), { autoAlpha: 0, y: 8 }, { autoAlpha: 0.85, y: 0, duration: SHOT.length / 2 }, at + 0.01);
  });

  const punchlineAt = SHOT.start + shots.length * SHOT.length;
  timeline
    .to(query('[data-reel-wash]', section), { clipPath: 'inset(0% 0 0 0)', duration: 0.06, ease: 'power3.inOut' }, punchlineAt - 0.02)
    .to(
      query('[data-reel-flood]', section),
      { clipPath: 'circle(150% at 50% 55%)', duration: 0.09, ease: 'power2.in' },
      punchlineAt + 0.14,
    );
  // Both copies move in lockstep; the flood's clip decides which one is seen.
  for (const copy of copies) {
    timeline
      .fromTo(copy.setup, BELOW_MASK, BEAT_RISE, punchlineAt + 0.03)
      .fromTo(copy.punchline, BELOW_MASK, BEAT_RISE, punchlineAt + 0.2)
      .fromTo(copy.kicker, WORD_HIDDEN, WORD_SHOWN, punchlineAt + 0.28);
  }
  // Pads the timeline to 1, so the positions above are true pin fractions and the punchline rests before release.
  timeline.set({}, {}, 1);

  ScrollTrigger.refresh();
}
