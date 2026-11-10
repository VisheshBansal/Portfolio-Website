import { gsap, ScrollTrigger, reducedMotion, finePointer, fontsReady } from '../../lib/motion';
import { MINUTE_MS, startClock } from '../../lib/clock';
import { query, queryAll, readDataset, readDatasetJson, setText } from '../../lib/dom';
import { onReveal } from '../../lib/reveal';
import { drawStrokes, primeStrokes } from '../../lib/strokes';
import { RISE_FROM, splitChars } from '../../lib/text';
import { cssVar, onThemeChange } from '../../lib/theme';
import { createFog, type Fog } from '../../lib/webgl/fog';
import type { HeroSceneClient, NoteId } from './types';

const AMBIENT_FOG_COLOR = '#f7fafd';
const FOG_RESOLUTION = 0.45;
const POINTER_SMOOTHING_S = 1.2;
const TYPEWRITER = { typeMs: 42, eraseMs: 22, holdMs: 2200, gapMs: 380, startDelayMs: 2400 } as const;
const PUSH_IN = { viewportHeights: 1.35, scale: 1.34, scrub: 0.7 } as const;

export function initHero(): void {
  const hero = query('[data-hero]');
  const ambient = createFog(query<HTMLCanvasElement>('[data-fog="ambient"]', hero), {
    mode: 'ambient',
    color: AMBIENT_FOG_COLOR,
    resolution: FOG_RESOLUTION,
    animate: !reducedMotion,
  });
  const cover = reducedMotion
    ? null
    : createFog(query<HTMLCanvasElement>('[data-fog="cover"]', hero), {
        mode: 'cover',
        color: cssVar('--bg'),
        density: 0,
        resolution: FOG_RESOLUTION,
      });
  onThemeChange(() => cover?.setColor(cssVar('--bg')));

  startLocalTime(hero);
  pinNotesToPhoto(hero);
  if (finePointer && !reducedMotion) bindPointerParallax(hero, ambient);
  onReveal(() => void playReveal(hero));
  if (!reducedMotion) buildScrollTimeline(hero, ambient, cover);
  ScrollTrigger.refresh();
}

/** Live clock in the hero's timezone, beside the status line; it updates on the minute. */
function startLocalTime(hero: HTMLElement): void {
  const clock = query('[data-clock]', hero);
  const timeZone = readDataset(clock, 'timezone');
  const format = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
  startClock(timeZone, MINUTE_MS, (time) => setText(clock, format.format(time.date)));
}

/** Notes are anchored in image space, so they stay on target at any aspect ratio. */
function pinNotesToPhoto(hero: HTMLElement): void {
  const scenes = readDatasetJson<HeroSceneClient[]>(hero, 'scenes');
  const defaultScene = scenes.at(-1);
  if (!defaultScene) throw new Error('Hero needs at least one scene');
  const frame = query('[data-parallax]', hero);
  const notes = queryAll('[data-note]', hero);
  const activeScene = () => scenes.find((scene) => scene.media === null || window.matchMedia(scene.media).matches) ?? defaultScene;

  const place = () => {
    const scene = activeScene();
    const box = { width: frame.clientWidth, height: frame.clientHeight };
    // Replicates object-fit: cover + object-position to find the photo's on-screen rectangle.
    let width = box.width;
    let height = box.width / scene.aspect;
    if (height < box.height) {
      height = box.height;
      width = box.height * scene.aspect;
    }
    const left = (box.width - width) * scene.objectPosition[0];
    const top = (box.height - height) * scene.objectPosition[1];
    for (const note of notes) {
      const anchor = scene.anchors[note.dataset.note as NoteId];
      note.hidden = !anchor;
      if (!anchor) continue;
      note.style.setProperty('--x', `${left + anchor[0] * width}px`);
      note.style.setProperty('--y', `${top + anchor[1] * height}px`);
    }
  };
  place();
  window.addEventListener('resize', place);
}

function bindPointerParallax(hero: HTMLElement, ambient: Fog | null): void {
  const pointer = { x: 0, y: 0 };
  const apply = () => {
    hero.style.setProperty('--mx', pointer.x.toFixed(4));
    hero.style.setProperty('--my', pointer.y.toFixed(4));
    if (ambient) {
      ambient.state.pointerX = (pointer.x + 1) / 2;
      ambient.state.pointerY = (pointer.y + 1) / 2;
    }
  };
  const toX = gsap.quickTo(pointer, 'x', { duration: POINTER_SMOOTHING_S, ease: 'power3.out', onUpdate: apply });
  const toY = gsap.quickTo(pointer, 'y', { duration: POINTER_SMOOTHING_S, ease: 'power3.out', onUpdate: apply });
  window.addEventListener(
    'pointermove',
    (event) => {
      toX((event.clientX / window.innerWidth) * 2 - 1);
      toY((event.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true },
  );
}

function startTypewriter(element: HTMLElement): void {
  const lines = readDatasetJson<string[]>(element, 'lines');
  const [firstLine] = lines;
  if (firstLine === undefined) return;
  let lineIndex = 0;
  let length = firstLine.length;
  let direction: 1 | -1 = -1;
  const step = () => {
    const line = lines[lineIndex] ?? firstLine;
    length += direction;
    element.textContent = line.slice(0, length);
    let wait: number = direction > 0 ? TYPEWRITER.typeMs : TYPEWRITER.eraseMs;
    if (direction > 0 && length >= line.length) {
      direction = -1;
      wait = TYPEWRITER.holdMs;
    } else if (direction < 0 && length <= 0) {
      direction = 1;
      lineIndex = (lineIndex + 1) % lines.length;
      wait = TYPEWRITER.gapMs;
    }
    setTimeout(step, wait);
  };
  setTimeout(step, TYPEWRITER.startDelayMs);
}

async function playReveal(hero: HTMLElement): Promise<void> {
  await fontsReady(1200);
  const hidden = queryAll('[data-intro]', hero);
  if (reducedMotion) {
    gsap.set(hidden, { visibility: 'visible' });
    return;
  }
  const arrows = queryAll<SVGPathElement>('.note__arrow path', hero);
  primeStrokes(arrows);
  const chars = splitChars(queryAll('[data-chars]', hero));

  gsap
    .timeline()
    .fromTo(query('[data-settle]', hero), { scale: 1.1 }, { scale: 1, duration: 2.6, ease: 'expo.out' }, 0)
    .set(query('[data-name]', hero), { visibility: 'visible' }, 0)
    .from(chars, { ...RISE_FROM, duration: 1.15, stagger: 0.035, ease: 'expo.out' }, 0.15)
    .set(hidden, { visibility: 'visible' }, 0.5)
    .from(queryAll('.hero__copy [data-intro]', hero), { y: 22, autoAlpha: 0, duration: 1.1, stagger: 0.12, ease: 'expo.out' }, 0.55)
    .add(drawStrokes(arrows, { stagger: 0.12 }), 1)
    .from(queryAll('.note__text', hero), { autoAlpha: 0, scale: 0.85, rotate: -8, duration: 0.8, stagger: 0.25, ease: 'back.out(2)' }, 1.25)
    .from(queryAll('.hero__meta [data-intro]', hero), { autoAlpha: 0, duration: 1, stagger: 0.1 }, 1.1);

  startTypewriter(query('[data-typewriter]', hero));
}

/** Scroll: push in toward the subject and the tower, then fog rolls in and hands over to the page. */
function buildScrollTimeline(hero: HTMLElement, ambient: Fog | null, cover: Fog | null): void {
  const timeline = gsap.timeline({
    defaults: { ease: 'none', immediateRender: false },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: () => `+=${window.innerHeight * PUSH_IN.viewportHeights}`,
      pin: true,
      scrub: PUSH_IN.scrub,
      invalidateOnRefresh: true,
    },
  });
  timeline
    .fromTo(query('[data-scene]', hero), { scale: 1 }, { scale: PUSH_IN.scale, duration: 1 }, 0)
    .fromTo(query('[data-name-wrap]', hero), { yPercent: 0, autoAlpha: 1 }, { yPercent: -28, autoAlpha: 0, duration: 0.38 }, 0)
    // Opacity, not autoAlpha: the notes carry the intro gate, and the scrub's first render must not lift it.
    .fromTo(query('[data-notes]', hero), { opacity: 1 }, { opacity: 0, duration: 0.25 }, 0)
    .fromTo(query('[data-copy-wrap]', hero), { y: 0, autoAlpha: 1 }, { y: -50, autoAlpha: 0, duration: 0.42 }, 0)
    .fromTo(query('[data-meta-wrap]', hero), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.2 }, 0)
    .fromTo(query('[data-veil]', hero), { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.94);
  if (ambient) timeline.fromTo(ambient.state, { boost: 0 }, { boost: 0.7, duration: 1 }, 0);
  if (cover) timeline.fromTo(cover.state, { density: 0 }, { density: 1, duration: 0.42, ease: 'power1.in', onUpdate: cover.render }, 0.58);
}
