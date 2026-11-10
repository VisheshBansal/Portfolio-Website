import { gsap, lenis } from '../../lib/motion';
import { focusTarget, query, queryAll, setText } from '../../lib/dom';
import { padNumber } from '../../lib/format';
import { announceReveal } from '../../lib/reveal';
import { INTRO_ACTIVE_CLASS, INTRO_SEEN_KEY, INTRO_START_EVENT } from '../../lib/intro';
import { splitChars } from '../../lib/text';
import { addLineWipe } from '../../lib/wipe';

/** Seconds each city holds the screen. */
const FRAME_SECONDS = 0.46;
/** The first city opens from the accent line, the way the reel does. */
const FIRST_OPEN = { line: 0.3, clip: 0.5 } as const;
/** Every later city wipes up over the last. */
const PANEL = { hidden: 'inset(100% 0% 0% 0%)', shown: 'inset(0% 0% 0% 0%)' } as const;
const PANEL_WIPE = { duration: 0.32, ease: 'power3.inOut' } as const;
const CITY_RISE = { yPercent: 0, duration: 0.42, stagger: 0.014, ease: 'expo.out' } as const;
const DETAIL_IN = { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' } as const;
/** Seconds after a panel starts before its name, catch and tidbit arrive. */
const STAGGER_IN = { city: 0.06, known: 0.12, tidbit: 0.18 } as const;
const LINE_SECONDS = 0.35;
const OPEN_SECONDS = 0.9;
/** Never hold the curtain longer than this waiting for the hero photo. */
const PHOTO_WAIT_MS = 3200;

export function initIntro(): void {
  const root = document.documentElement;
  if (!root.classList.contains(INTRO_ACTIVE_CLASS)) {
    announceReveal();
    return;
  }

  const curtain = query('[data-intro-root]');
  const frames = queryAll('[data-frame]', curtain);
  const counter = query('[data-count]', curtain);
  const [firstFrame] = frames;
  const lastFrame = frames.at(-1);
  if (!firstFrame || !lastFrame) return announceReveal();

  const heroPhoto = document.querySelector<HTMLImageElement>('[data-hero-photo]');
  const photoReady = Promise.race([
    heroPhoto?.decode().catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, PHOTO_WAIT_MS)),
  ]);

  // Behind the curtain the page is inert, so Tab can only reach Skip.
  const behind = [...document.body.children].filter(
    (element): element is HTMLElement => element instanceof HTMLElement && element !== curtain,
  );
  for (const element of behind) element.inert = true;

  lenis?.stop();
  const hud = query('[data-hud]', curtain);
  const timeline = gsap.timeline({ paused: true });
  const firstOpens = addLineWipe(timeline, {
    line: query('[data-line-open]', curtain),
    target: firstFrame,
    direction: 'open',
    at: 0,
    lineDuration: FIRST_OPEN.line,
    clipDuration: FIRST_OPEN.clip,
  });
  const montageStart = timeline.labels[firstOpens] ?? FIRST_OPEN.line;

  frames.forEach((frame, index) => {
    const at = montageStart + index * FRAME_SECONDS;
    if (frame !== firstFrame) timeline.fromTo(frame, { clipPath: PANEL.hidden }, { clipPath: PANEL.shown, ...PANEL_WIPE }, at);
    timeline
      .fromTo(splitChars(query('[data-city]', frame)), { yPercent: 110 }, CITY_RISE, at + STAGGER_IN.city)
      .fromTo(query('[data-known]', frame), { autoAlpha: 0, y: 10 }, DETAIL_IN, at + STAGGER_IN.known)
      .fromTo(query('[data-tidbit]', frame), { autoAlpha: 0, y: 8 }, { ...DETAIL_IN, autoAlpha: 0.85 }, at + STAGGER_IN.tidbit)
      .set(hud, { '--hud-fg': frame.style.getPropertyValue('--frame-fg') }, at)
      .call(() => setText(counter, padNumber(index + 1)), [], at);
  });

  const montageEnd = montageStart + frames.length * FRAME_SECONDS;
  timeline
    .to(query('[data-progress]', curtain), { scaleX: 1, duration: montageEnd, ease: 'none' }, 0)
    .to(queryAll('p', lastFrame), { autoAlpha: 0, y: -10, duration: 0.25, ease: 'power2.in' }, montageEnd);
  const opening = addLineWipe(timeline, {
    line: query('[data-line]', curtain),
    target: curtain,
    direction: 'close',
    at: montageEnd,
    lineDuration: LINE_SECONDS,
    clipDuration: OPEN_SECONDS,
  });
  timeline.call(announceReveal, [], opening).call(finish);

  let finished = false;
  function finish(): void {
    if (finished) return;
    finished = true;
    const skippedByKeyboard = curtain.contains(document.activeElement);
    for (const element of behind) element.inert = false;
    root.classList.remove(INTRO_ACTIVE_CLASS);
    if (skippedByKeyboard) focusTarget(query('#top'));
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // Without storage the montage simply replays next visit.
    }
    lenis?.start();
  }
  const skip = () => {
    if (finished) return;
    timeline.progress(1);
    announceReveal();
    finish();
  };
  query('[data-skip]', curtain).addEventListener('click', skip);
  window.addEventListener('keydown', (event) => event.key === 'Escape' && skip());

  // The montage plays immediately; only the final opening waits for the hero photo to decode.
  timeline.addPause(`${opening}-=0.05`, () => void photoReady.then(() => timeline.play()));
  window.dispatchEvent(new Event(INTRO_START_EVENT));
  timeline.play();
}
