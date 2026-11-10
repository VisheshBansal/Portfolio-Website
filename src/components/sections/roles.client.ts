/**
 * Range: a split-flap board that scroll turns through every hat, landing on the one that never comes off.
 * Each flap is simulated on the GSAP ticker, and the drum only ever turns forward.
 */
import { gsap, ScrollTrigger, SplitText, reducedMotion, finePointer, fontsReady } from '../../lib/motion';
import { query, queryAll, readDatasetJson } from '../../lib/dom';
import { splitWords } from '../../lib/text';

/** Glyphs on every drum, in turning order; frames append any others. Index 0 is the blank flap. */
const BASE_DRUM = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BLANK = 0;

const FLIP = {
  /** Seconds per flap by glyphs left to turn: slow to land, quick from far away. */
  secondsByDistance: [0.22, 0.1, 0.075, 0.058, 0.046, 0.036],
  detourSeconds: 0.06,
  easePower: 1.6,
  /** A landing flap falls for this share of its flip, then bounces back by `bounceDegrees`. */
  landingFallShare: 0.7,
  bounceDegrees: 13,
  maxTopShade: 0.5,
  maxBottomShine: 0.35,
} as const;
const LANDING_SECONDS = FLIP.secondsByDistance[0];
const HALF_TURN = 180;
const QUARTER_TURN = 90;
/** Caps simulated time per frame, so a long frame never jumps the flaps ahead. */
const MAX_FRAME_SECONDS = 0.05;
const MAX_FLIPS_PER_FRAME = 8;

/** Start delay per flap: a diagonal wave from the top left, plus a little jitter. */
const WAVE = { secondsPerCell: 0.028, rowWeight: 1.6, jitterSeconds: 0.03 } as const;
/** Tap ripple delay by distance; rows weigh more because flaps are 1.4 times taller than wide (--h). */
const RIPPLE = { secondsPerCell: 0.045, rowWeight: 1.4 } as const;
const SPIN_STEP_SECONDS = 0.3;
/** Pause between the rig rising into view and the board following scroll. */
const LIVE_DELAY_SECONDS = 0.3;
/** Dash offset that hides a stroke drawn with pathLength 1 and a `1 1.2` dash. */
const INK_HIDDEN_OFFSET = 1.1;
const INK_RETRACT_SPEED = 2.4;
/** Glyphs are measured at this size so the hinge offset converts straight to em. */
const MEASURE_FONT_PX = 100;

const TRIGGER_START = { title: 'top 72%', rig: 'top 88%' } as const;
/** The TL;DR fills in word by word over this stretch of scroll, from dim to full. */
const SUMMARY_FILL = { range: { start: 'top 85%', end: 'bottom 55%' }, scrub: 0.6, dim: 0.16, word: 0.3, stagger: 0.08 } as const;
const SCRUB_SECONDS = 0.5;
/** Scroll per role change; viewport heights when pinned, a share of the range otherwise. */
const SCROLL_PER_ROLE = 0.26;
/** Keep `media` in sync with the `@media (min-height: 560px)` block in Roles.astro. */
const PIN = { media: '(min-height: 560px)', holdViewports: 0.34 } as const;
/** Short screens skip the pin: the rail scrubs as the rig crosses and lands the last hat 1 / stretch in. */
const UNPINNED = { start: 'top 80%', end: 'bottom 25%', stretch: 1.33 } as const;
/** Absorbs float error so scroll lands exactly on each role. */
const ROLE_EPSILON = 1e-4;

const STATUS_LABELS = { idle: 'Scroll to rotate', busy: 'Changing hats', set: 'Hat on', locked: 'Locked in' } as const;

type BoardState = keyof typeof STATUS_LABELS;
type VisibleLeaf = 'none' | 'top' | 'bottom';

/** One painted surface of a flap. Caches what it shows to skip redundant DOM writes. */
interface Face {
  readonly element: HTMLElement;
  readonly glyph: HTMLElement;
  drumIndex: number | null;
  hot: boolean | null;
}

/** One split-flap cell: two fixed halves, two moving leaves, and where it sits on the drum. */
interface Cell {
  readonly element: HTMLElement;
  readonly column: number;
  readonly row: number;
  /** The top half shows the next glyph, the bottom half the current one. */
  readonly halfTop: Face;
  readonly halfBottom: Face;
  /** The top leaf folds the current glyph away, the bottom leaf lands the next one. */
  readonly leafTop: Face;
  readonly leafBottom: Face;
  readonly shadeTop: HTMLElement;
  readonly shineBottom: HTMLElement;
  current: number;
  hot: boolean;
  next: number;
  nextHot: boolean;
  target: number;
  targetHot: boolean;
  /** Glyphs to pass through before settling, for flutters. */
  detour: number[];
  /** Progress through the current flip, 0 to 1. */
  progress: number;
  flipSeconds: number;
  landing: boolean;
  delaySeconds: number;
  active: boolean;
  flipping: boolean;
  visibleLeaf: VisibleLeaf;
}

interface FlapBoard {
  readonly cells: readonly Cell[];
  /** Points every flap at its glyph in `frame`; flaps at rest start in a diagonal wave. */
  aim(frame: string, hot: boolean): void;
  /** Flicks a resting flap through two random letters and back. */
  flutter(cell: Cell, delaySeconds: number): void;
  /** Starts the ticker loop unless it is already running. */
  wake(): void;
}

interface HatBoard {
  readonly flaps: FlapBoard;
  readonly roleCount: number;
  /** Turns the board to a role; the last one lands hot and draws the ink. */
  showRole(roleIndex: number): void;
}

/** Shared by the scroll scrub and the toys. */
interface Playback {
  /** Set once the rig has risen; until then scroll only records the role. */
  live: boolean;
  /** Set while spin again owns the board. */
  spinning: boolean;
  scrollRole: number;
}

export function initRoles(): void {
  const section = query('[data-range]');
  const board = query('[data-board]', section);
  const grid = query('[data-grid]', section);
  seatGlyphsOnHinge(board, query('.g', grid));
  if (reducedMotion) return;

  const frames = readDatasetJson<string[]>(board, 'frames');
  if (frames.length < 2) return;

  const hats = createHatBoard(section, board, grid, frames);
  const playback: Playback = { live: false, spinning: false, scrollRole: 0 };
  const stage = query('[data-stage]', section);
  const rig = query('[data-rig]', section);
  playTitleOnEnter(stage);
  revealRigOnEnter(rig, hats, playback);
  scrubRolesWithScroll(stage, rig, hats, playback);
  fillSummaryOnScroll(query('[data-tldr]', section));
  bindSpinAgain(query<HTMLButtonElement>('[data-spin]', rig), hats, playback);
  bindFlutter(grid, hats.flaps, playback);
}

/** Sits the cap height on the hinge for whichever display face is active. */
function seatGlyphsOnHinge(board: HTMLElement, sampleGlyph: HTMLElement): void {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return;
  const measure = () => {
    const style = getComputedStyle(sampleGlyph);
    context.font = `${style.fontWeight} ${MEASURE_FONT_PX}px ${style.fontFamily}`;
    const metrics = context.measureText('H');
    // Engines without font bounding boxes keep the CSS default shift.
    if (!metrics.fontBoundingBoxAscent) return;
    const shift =
      (metrics.fontBoundingBoxDescent - metrics.fontBoundingBoxAscent + metrics.actualBoundingBoxAscent) / (2 * MEASURE_FONT_PX);
    board.style.setProperty('--shift', `${shift.toFixed(4)}em`);
  };
  void fontsReady().then(measure);
  ScrollTrigger.addEventListener('refreshInit', measure);
}

/** Role-level control: aims the flaps, moves the hat counter, and locks in the last hat with ink. */
function createHatBoard(section: HTMLElement, board: HTMLElement, grid: HTMLElement, frames: readonly string[]): HatBoard {
  const lastRole = frames.length - 1;
  const status = query('[data-status]', board);
  const counter = query('[data-reel]', board);
  const ink = buildInkTimeline(section);
  let currentRole = -1;
  let awaitingRest = false;

  function setState(state: BoardState): void {
    if (board.dataset.state === state) return;
    board.dataset.state = state;
    status.textContent = STATUS_LABELS[state];
  }

  /** Runs once every flap is at rest: name the hat, or lock in the last one with ink and a thud. */
  function settle(): void {
    if (!awaitingRest) return;
    awaitingRest = false;
    if (currentRole !== lastRole) {
      setState(currentRole === 0 ? 'idle' : 'set');
      return;
    }
    if (board.dataset.state === 'locked') return;
    setState('locked');
    ink.timeScale(1).play();
    gsap.fromTo(board, { y: 0 }, { y: 3, duration: 0.07, ease: 'power2.out', yoyo: true, repeat: 1, clearProps: 'transform' });
  }

  const flaps = createFlapBoard(grid, frames, readDatasetJson<number>(board, 'cols'), settle);

  function showRole(roleIndex: number): void {
    const frame = frames[roleIndex];
    if (roleIndex === currentRole || frame === undefined) return;
    const previousRole = currentRole;
    currentRole = roleIndex;
    flaps.aim(frame, roleIndex === lastRole);
    // The counter strip stacks 00 to N, so each role is one slot of its height.
    gsap.to(counter, { yPercent: (-100 * (roleIndex + 1)) / (frames.length + 1), duration: 0.7, ease: 'back.out(1.7)', overwrite: true });
    if (previousRole === lastRole) ink.timeScale(INK_RETRACT_SPEED).reverse();
    awaitingRest = true;
    setState('busy');
    flaps.wake();
  }

  setState('idle');
  gsap.set(counter, { x: 0, y: 0, yPercent: 0 });
  return { flaps, roleCount: frames.length, showRole };
}

/** Underline, a second pass, then the handwritten note. Paused until the last hat locks in. */
function buildInkTimeline(section: HTMLElement): gsap.core.Timeline {
  const strokes = queryAll<SVGPathElement>('[data-ul]', section);
  const [underline, secondPass] = strokes;
  if (!underline || !secondPass) throw new Error('Expected two [data-ul] strokes on the hat board');
  const note = query('[data-note]', section);
  const arrow = query<SVGPathElement>('[data-arrow]', section);
  gsap.set([...strokes, arrow], { strokeDashoffset: INK_HIDDEN_OFFSET, autoRound: false });
  gsap.set(note, { autoAlpha: 0 });
  return gsap
    .timeline({ paused: true, defaults: { autoRound: false } })
    .to(underline, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' })
    .to(secondPass, { strokeDashoffset: 0, duration: 0.42, ease: 'power2.out' }, '-=0.1')
    .fromTo(
      note,
      { autoAlpha: 0, y: 12, rotation: -8 },
      { autoAlpha: 1, y: 0, rotation: -3, duration: 0.7, ease: 'back.out(2.2)' },
      '-=0.25',
    )
    .to(arrow, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, '<0.15');
}

/** Simulates every flap on the GSAP ticker; the loop sleeps whenever all flaps are at rest. */
function createFlapBoard(grid: HTMLElement, frames: readonly string[], columns: number, onRest: () => void): FlapBoard {
  const drum = buildDrum(frames);
  const letterIndexes = Array.from(drum).flatMap((glyph, index) => (glyph.trim() ? [index] : []));
  const cells = queryAll('.cell', grid).map((element, index) => createCell(element, index, columns));
  for (const cell of cells) {
    paintFace(cell.halfTop, drum, BLANK, false);
    paintFace(cell.halfBottom, drum, BLANK, false);
  }
  let running = false;

  const tick = (_time: number, deltaMs: number): void => {
    const seconds = Math.min(deltaMs / 1000, MAX_FRAME_SECONDS);
    let busy = false;
    for (const cell of cells) {
      if (cell.active && advanceCell(cell, seconds, drum)) busy = true;
    }
    if (busy) return;
    gsap.ticker.remove(tick);
    running = false;
    onRest();
  };

  const wake = (): void => {
    if (running) return;
    running = true;
    gsap.ticker.add(tick);
  };

  const aim = (frame: string, hot: boolean): void => {
    cells.forEach((cell, index) => {
      const glyph = frame[index] ?? ' ';
      cell.target = Math.max(BLANK, drum.indexOf(glyph));
      cell.targetHot = hot && glyph !== ' ';
      cell.detour.length = 0;
      if (!cell.active && !isSettled(cell)) {
        cell.active = true;
        cell.delaySeconds = (cell.column + cell.row * WAVE.rowWeight) * WAVE.secondsPerCell + Math.random() * WAVE.jitterSeconds;
      }
    });
  };

  const randomLetter = () => letterIndexes[Math.floor(Math.random() * letterIndexes.length)] ?? BLANK;

  const flutter = (cell: Cell, delaySeconds: number): void => {
    if (cell.active) return;
    cell.detour = [randomLetter(), randomLetter(), cell.current];
    cell.active = true;
    cell.delaySeconds = delaySeconds;
    wake();
  };

  return { cells, aim, flutter, wake };
}

function buildDrum(frames: readonly string[]): string {
  const extras = [...new Set(frames.join(''))].filter((glyph) => !BASE_DRUM.includes(glyph));
  return BASE_DRUM + extras.join('');
}

function createFace(element: HTMLElement): Face {
  return { element, glyph: query('.g', element), drumIndex: null, hot: null };
}

function createCell(element: HTMLElement, index: number, columns: number): Cell {
  const leafTop = query('.leaf--top', element);
  const leafBottom = query('.leaf--bot', element);
  return {
    element,
    column: index % columns,
    row: Math.floor(index / columns),
    halfTop: createFace(query('.half--top', element)),
    halfBottom: createFace(query('.half--bot', element)),
    leafTop: createFace(leafTop),
    leafBottom: createFace(leafBottom),
    shadeTop: query('.leaf__fx', leafTop),
    shineBottom: query('.leaf__fx', leafBottom),
    current: BLANK,
    hot: false,
    next: BLANK,
    nextHot: false,
    target: BLANK,
    targetHot: false,
    detour: [],
    progress: 0,
    flipSeconds: 1,
    landing: false,
    delaySeconds: 0,
    active: false,
    flipping: false,
    visibleLeaf: 'none',
  };
}

function paintFace(face: Face, drum: string, drumIndex: number, hot: boolean): void {
  if (face.drumIndex !== drumIndex) {
    face.glyph.textContent = drum.charAt(drumIndex).trim();
    face.drumIndex = drumIndex;
  }
  if (face.hot !== hot) {
    if (hot) face.element.dataset.tone = 'hot';
    else delete face.element.dataset.tone;
    face.hot = hot;
  }
}

function isSettled(cell: Cell): boolean {
  return cell.detour.length === 0 && cell.current === cell.target && cell.hot === cell.targetHot;
}

/** Glyphs the drum must turn to get from one index to another. */
function stepsAhead(from: number, to: number, drumSize: number): number {
  return (to - from + drumSize) % drumSize;
}

function flipSecondsFor(stepsLeft: number): number {
  return FLIP.secondsByDistance[Math.min(stepsLeft, FLIP.secondsByDistance.length - 1)] ?? LANDING_SECONDS;
}

/** Advances one flap by `seconds`, chaining flips a long frame overshoots. Returns whether it still moves. */
function advanceCell(cell: Cell, seconds: number, drum: string): boolean {
  if (!cell.flipping) {
    if (cell.delaySeconds > 0) {
      cell.delaySeconds -= seconds;
      return true;
    }
    if (isSettled(cell)) {
      cell.active = false;
      return false;
    }
    beginFlip(cell, drum);
  }
  cell.progress += seconds / cell.flipSeconds;
  for (let flips = 0; cell.progress >= 1 && flips < MAX_FLIPS_PER_FRAME; flips++) {
    const carrySeconds = (cell.progress - 1) * cell.flipSeconds;
    finishFlip(cell, drum);
    if (isSettled(cell)) {
      cell.active = false;
      return false;
    }
    beginFlip(cell, drum);
    cell.progress = carrySeconds / cell.flipSeconds;
  }
  drawFlip(cell);
  return true;
}

/** Picks the next glyph (a queued detour stop, else one step toward the target) and loads the leaves. */
function beginFlip(cell: Cell, drum: string): void {
  const detourStop = cell.detour.shift();
  if (detourStop === undefined) {
    cell.next = cell.current === cell.target ? cell.current : (cell.current + 1) % drum.length;
    const stepsLeft = stepsAhead(cell.next, cell.target, drum.length);
    cell.landing = stepsLeft === 0;
    cell.flipSeconds = flipSecondsFor(stepsLeft);
  } else {
    cell.next = detourStop;
    cell.landing = cell.detour.length === 0;
    cell.flipSeconds = cell.landing ? LANDING_SECONDS : FLIP.detourSeconds;
  }
  cell.nextHot = cell.landing && cell.targetHot;
  paintFace(cell.halfTop, drum, cell.next, cell.nextHot);
  paintFace(cell.leafTop, drum, cell.current, cell.hot);
  paintFace(cell.leafBottom, drum, cell.next, cell.nextHot);
  cell.flipping = true;
  cell.progress = 0;
}

function finishFlip(cell: Cell, drum: string): void {
  cell.current = cell.next;
  cell.hot = cell.nextHot;
  paintFace(cell.halfBottom, drum, cell.current, cell.hot);
  cell.flipping = false;
  showLeaf(cell, 'none');
}

function showLeaf(cell: Cell, leaf: VisibleLeaf): void {
  if (cell.visibleLeaf === leaf) return;
  cell.visibleLeaf = leaf;
  cell.leafTop.element.style.visibility = leaf === 'top' ? 'visible' : 'hidden';
  cell.leafBottom.element.style.visibility = leaf === 'bottom' ? 'visible' : 'hidden';
}

/** Leaf angle in degrees, 0 resting on top to 180 resting below. Landings fall like a weight, then bounce. */
function flipAngle(progress: number, landing: boolean): number {
  const time = Math.min(progress, 1);
  if (!landing) return HALF_TURN * time ** FLIP.easePower;
  if (time < FLIP.landingFallShare) return HALF_TURN * (time / FLIP.landingFallShare) ** 2;
  const bounce = (time - FLIP.landingFallShare) / (1 - FLIP.landingFallShare);
  return HALF_TURN - FLIP.bounceDegrees * Math.sin(Math.PI * bounce);
}

/** The top leaf folds down to 90 degrees, then the bottom leaf takes over and lands. */
function drawFlip(cell: Cell): void {
  const angle = flipAngle(cell.progress, cell.landing);
  if (angle < QUARTER_TURN) {
    showLeaf(cell, 'top');
    cell.leafTop.element.style.transform = `rotateX(${-angle}deg)`;
    cell.shadeTop.style.opacity = String((angle / QUARTER_TURN) * FLIP.maxTopShade);
  } else {
    const remaining = HALF_TURN - angle;
    showLeaf(cell, 'bottom');
    cell.leafBottom.element.style.transform = `rotateX(${remaining}deg)`;
    cell.shineBottom.style.opacity = String((remaining / QUARTER_TURN) * FLIP.maxBottomShine);
  }
}

/** The kicker draws in, then the headline letters drop on a top hinge like the flaps below. */
function playTitleOnEnter(stage: HTMLElement): void {
  const kicker = query('[data-kicker]', stage);
  const title = query('[data-title]', stage);
  const intro = gsap
    .timeline({ paused: true })
    .from(query('.range__rule', kicker), { scaleX: 0, transformOrigin: '0% 50%', duration: 1.3, ease: 'expo.inOut' }, 0)
    .from(queryAll(':scope > span', kicker), { autoAlpha: 0, y: 10, duration: 0.9, stagger: 0.12, ease: 'expo.out' }, 0.1);
  void fontsReady().then(() => {
    // Once the intro is playing it is too late to split; the title just stays put.
    if (intro.progress() > 0) return;
    const split = new SplitText(title, { type: 'words,chars', tag: 'span', charsClass: 'range__ch' });
    intro
      .from(
        split.chars,
        { rotationX: 96, transformOrigin: '50% 0%', transformPerspective: 700, duration: 1.1, stagger: 0.032, ease: 'back.out(1.5)' },
        0.12,
      )
      .from(split.chars, { autoAlpha: 0, duration: 0.35, stagger: 0.032, ease: 'power1.out' }, 0.12)
      .call(() => split.revert());
  });
  ScrollTrigger.create({ trigger: stage, start: TRIGGER_START.title, once: true, onEnter: () => intro.play() });
}

/** The rig rises into view, then the board starts following scroll. */
function revealRigOnEnter(rig: HTMLElement, hats: HatBoard, playback: Playback): void {
  gsap.set(rig, { autoAlpha: 0 });
  ScrollTrigger.create({
    trigger: rig,
    start: TRIGGER_START.rig,
    once: true,
    onEnter: () => {
      gsap.fromTo(
        rig,
        { autoAlpha: 0, y: 70, rotationX: 18, transformPerspective: 1600, transformOrigin: '50% 100%' },
        { autoAlpha: 1, y: 0, rotationX: 0, duration: 1.4, ease: 'expo.out', clearProps: 'transform' },
      );
      gsap.delayedCall(LIVE_DELAY_SECONDS, () => {
        playback.live = true;
        hats.showRole(playback.scrollRole);
      });
    },
  });
}

/** Signature: a short pin where scroll picks the hat and the flaps chase it. */
function scrubRolesWithScroll(stage: HTMLElement, rig: HTMLElement, hats: HatBoard, playback: Playback): void {
  const lastRole = hats.roleCount - 1;
  const rolesLength = SCROLL_PER_ROLE * lastRole;
  // Rebuilt when the viewport crosses the pin height query; revert drops the pin and rail.
  gsap.matchMedia().add({ pinned: PIN.media, unpinned: `not all and ${PIN.media}` }, (context) => {
    const pinned = context.conditions?.pinned === true;
    const totalLength = pinned ? rolesLength + PIN.holdViewports : rolesLength * UNPINNED.stretch;
    const rail = gsap
      .timeline()
      .fromTo(query('[data-fill]', rig), { scaleX: 0 }, { scaleX: 1, duration: rolesLength, ease: 'none' })
      .to({}, { duration: totalLength - rolesLength });
    const followScroll = (trigger: ScrollTrigger) => {
      const role = Math.min(lastRole, Math.floor(((trigger.progress * totalLength) / rolesLength) * lastRole + ROLE_EPSILON));
      if (role === playback.scrollRole) return;
      playback.scrollRole = role;
      if (playback.live && !playback.spinning) hats.showRole(role);
    };
    ScrollTrigger.create({
      trigger: pinned ? stage : rig,
      start: pinned ? 'top top' : UNPINNED.start,
      end: pinned ? () => `+=${window.innerHeight * totalLength}` : UNPINNED.end,
      pin: pinned,
      anticipatePin: 1,
      scrub: SCRUB_SECONDS,
      animation: rail,
      invalidateOnRefresh: true,
      onUpdate: followScroll,
      // A rebuilt trigger can sit at progress 0, where onUpdate never fires.
      onRefresh: followScroll,
    });
  });
}

/** TL;DR: the summary starts dim and fills in word by word as it scrolls through, keywords in the accent. */
function fillSummaryOnScroll(tldr: HTMLElement): void {
  const label = query('.range__tldr-k', tldr);
  const summary = query('[data-summary]', tldr);
  void fontsReady().then(() => {
    gsap
      .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: summary, ...SUMMARY_FILL.range, scrub: SUMMARY_FILL.scrub } })
      .from(label, { autoAlpha: 0, y: 14, duration: SUMMARY_FILL.word }, 0)
      .fromTo(
        splitWords(summary),
        { opacity: SUMMARY_FILL.dim },
        { opacity: 1, duration: SUMMARY_FILL.word, stagger: SUMMARY_FILL.stagger },
        0,
      );
  });
}

/** Spin again replays every hat in order, then hands the board back to scroll. */
function bindSpinAgain(button: HTMLButtonElement, hats: HatBoard, playback: Playback): void {
  button.hidden = false;
  button.addEventListener('click', () => {
    if (playback.spinning || !playback.live) return;
    playback.spinning = true;
    const replay = gsap.timeline({
      onComplete: () => {
        playback.spinning = false;
      },
    });
    for (let roleIndex = 0; roleIndex < hats.roleCount; roleIndex++) {
      replay.call(hats.showRole, [roleIndex], roleIndex * SPIN_STEP_SECONDS);
    }
  });
}

/** Hover flutters one flap; a tap ripples out from the tapped one. */
function bindFlutter(grid: HTMLElement, flaps: FlapBoard, playback: Playback): void {
  const flutter = (cell: Cell, delaySeconds = 0) => {
    if (playback.live) flaps.flutter(cell, delaySeconds);
  };
  if (finePointer) {
    for (const cell of flaps.cells) cell.element.addEventListener('pointerenter', () => flutter(cell));
  }
  grid.addEventListener('click', (event) => {
    if (!(event.target instanceof Node)) return;
    const tapped = event.target;
    const origin = flaps.cells.find((cell) => cell.element.contains(tapped));
    if (!origin) return;
    for (const cell of flaps.cells) {
      const distance = Math.hypot(cell.column - origin.column, (cell.row - origin.row) * RIPPLE.rowWeight);
      flutter(cell, distance * RIPPLE.secondsPerCell);
    }
  });
}
