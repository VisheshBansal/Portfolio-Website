/**
 * Ambition: rows rise in like a launch sequence, then one scrubbed pass of a pen strikes through what is done
 * while the countdown ticks down and holds on what is still open.
 */
import { gsap, ScrollTrigger, reducedMotion, fontsReady } from '../../lib/motion';
import { query, queryAll } from '../../lib/dom';

/** Keep in sync with the 1024px breakpoint in Ambition.astro, where the countdown turns sticky. */
const DESKTOP_MEDIA = '(min-width: 1024px)';
const SVG_NS = 'http://www.w3.org/2000/svg';

const TRIGGER_START = { head: 'top 82%', row: 'top 90%', countdown: 'top 82%', foot: 'top 94%' } as const;
/** The scrubbed pass runs from the first crossed item to the last. */
const SCRUB = { start: 'center 70%', end: 'center 38%', smoothing: 0.6 } as const;
const RESIZE_DEBOUNCE_MS = 160;

/** Seconds between rows that enter together. */
const ROW_IGNITION_GAP_S = 0.13;
/** Seconds into a row's entrance before the pen may touch it, and how long the gate takes to open. */
const PEN_GATE = { at: 0.5, duration: 0.9 } as const;
/** Small screens roll the countdown once instead of scrubbing it, in seconds. */
const COUNT_ROLL = { delay: 0.35, base: 0.6, perItem: 0.3 } as const;

/** How one row's 0..1 strike progress is shared out. */
const ROW_PHASES = {
  /** With a note, the strike finishes early and the note is written after it. */
  strikeEndWithNote: 0.68,
  note: { start: 0.6, span: 0.4 },
  /** Within the note, the arrow draws over the first half and the text wipes in from 30%. */
  noteArrowSpan: 0.5,
  noteText: { start: 0.3, span: 0.7 },
  /** A row counts toward the countdown from 45% of its strike. */
  countdown: { start: 0.45, span: 0.55 },
} as const;
/** Struck words fade to 60%, the same as `.is-done .amb__words`. */
const STRUCK_WORDS_FADE = 0.4;
/** "Counting down" hands over to "and holding" across the last stretch of the count. */
const HOLD = { span: 0.4, riseEm: 0.3 } as const;

/** Pen geometry in font-size units: every stroke overshoots both ends, rises slightly and wobbles. */
const PEN = {
  /** Matches `.amb__ink` stroke-width. */
  strokeWidth: 0.085,
  overshootStart: { min: 0.05, random: 0.07 },
  overshootEnd: { min: 0.04, random: 0.09 },
  startDrop: 0.05,
  endRise: 0.04,
  endWobble: 0.025,
  handleWobble: 0.05,
  /** Bezier handles, as fractions of the stroke's width. */
  handleNear: 0.3,
  handleFar: 0.7,
  /** Dash gap in stroke widths, so a hidden stroke never peeks back in. */
  dashGapStrokes: 4,
} as const;
/** A return pass doubles back under the line and ends 10 to 22% of the way along it. */
const RETURN_PASS = {
  reach: { min: 0.1, random: 0.12 },
  drop: 0.12,
  endWobble: 0.02,
  handleWobble: 0.03,
  handleBack: 0.18,
  handleDrop: 0.11,
  handleReach: 0.3,
} as const;
/** A quick upward flick off the end, as a relative quadratic curve in font-size units. */
const FLICK = { control: { x: 0.06, y: -0.01 }, end: { x: 0.04, y: -0.13 } } as const;
/** Rows take turns finishing their last line with each of these. */
const ROW_FINISHES = ['sweep', 'return', 'flick'] as const;
/** Fixed seeds keep the handwriting identical on every visit. */
const STRIKE_SEED = { headline: 5, firstRow: 11, rowStride: 977 } as const;

/** Word boxes whose tops differ by less than this share a line. */
const SAME_LINE_TOLERANCE_PX = 2;
/** Line-height ratio used when the computed value is `normal`; matches `.display`. */
const FALLBACK_LINE_HEIGHT = 0.86;
/** A cap middle outside this share of the line box means unusable font metrics. */
const CAP_MIDDLE_BAND = { min: 0.2, max: 0.8 } as const;
/** Note arrow dash padding in path units: a long gap, plus room for the round caps when hidden. */
const ARROW_DASH = { gap: 20, capAllowance: 4 } as const;
/** The correction wipes in from the left; the negative insets keep its handwriting unclipped. */
const CORRECTION_CLIP = { hidden: 'inset(-40% 100% -40% -12%)', shown: 'inset(-40% -12% -40% -12%)' } as const;

const clamp01 = gsap.utils.clamp(0, 1);
const easeInOut = gsap.parseEase('power2.inOut');
const easeOut = gsap.parseEase('power3.out');

type StrikeFinish = (typeof ROW_FINISHES)[number];
type CountdownDisplay = (crossedSoFar: number) => void;

interface StrikeLine {
  top: number;
  left: number;
  right: number;
}

interface InkStroke {
  readonly path: SVGPathElement;
  /** Dash offset that hides the whole stroke, round caps included. */
  readonly hideLength: number;
}

/** A hand-drawn strike through the words of `target`, one stroke per rendered line. */
interface InkStrike {
  readonly svg: SVGSVGElement;
  readonly target: HTMLElement;
  readonly seed: number;
  /** How the stroke on the last line ends. */
  readonly finish: StrikeFinish;
  strokes: InkStroke[];
}

/** The handwritten aside under a row and the arrow that points from it. */
interface RowNote {
  readonly text: HTMLElement;
  readonly arrow: SVGPathElement;
  arrowHideLength: number;
}

interface AmbitionRow {
  readonly element: HTMLElement;
  readonly text: HTMLElement;
  /** Faded as the pen strikes through it. */
  readonly wordGroup: HTMLElement;
  /** Word inners that rise inside their masks. */
  readonly words: readonly HTMLElement[];
  readonly rule: HTMLElement;
  /** The "T-07" label. */
  readonly label: HTMLElement;
  readonly tag: HTMLElement | null;
  readonly strike: InkStrike | null;
  readonly note: RowNote | null;
  /** 0..1, opened by the row's entrance so the pen never runs ahead of the words. */
  gate: number;
  /** Distance below the first crossed row, measured on refresh. */
  offset: number;
}

interface CrossedRow extends AmbitionRow {
  readonly strike: InkStrike;
}

/** The handwritten "most" (or "all") that strikes out "Some" in the headline. */
interface HeadlineCorrection {
  readonly strike: InkStrike;
  readonly word: HTMLElement;
  /** Set once the entrance has drawn it, so refits keep it drawn. */
  drawn: boolean;
}

interface SectionParts {
  readonly section: HTMLElement;
  readonly head: HTMLElement;
  readonly headWords: readonly HTMLElement[];
  readonly kickers: readonly HTMLElement[];
  readonly kickerRule: HTMLElement;
  readonly correction: HeadlineCorrection | null;
  readonly rows: readonly AmbitionRow[];
  readonly crossedRows: readonly CrossedRow[];
  readonly countdown: HTMLElement;
  readonly countdownParts: readonly HTMLElement[];
  readonly foot: HTMLElement;
}

interface Pen {
  readonly render: () => void;
  /** Creates the scrubbed tween. With nothing crossed off there is no pen. */
  readonly attach: () => void;
  /** Re-reads row offsets and the scrub distance. False until the tween exists. */
  readonly measure: () => boolean;
}

export function initAmbition(): void {
  const parts = collectParts(query('[data-amb]'));
  const fitStrikes = createStrikeFitter(parts);
  if (reducedMotion) showStatic(parts, fitStrikes);
  else void animate(parts, fitStrikes);
}

/** Reduced motion: no entrances or scrub. Every strike is drawn and refitted when the layout changes. */
function showStatic(parts: SectionParts, fitStrikes: () => void): void {
  const settle = () => {
    fitStrikes();
    syncCorrection(parts.correction);
    for (const row of parts.crossedRows) {
      for (const stroke of row.strike.strokes) stroke.path.style.strokeDashoffset = '0px';
    }
  };
  void fontsReady().then(settle);
  window.addEventListener('resize', debounce(settle, RESIZE_DEBOUNCE_MS));
  ScrollTrigger.addEventListener('refresh', settle);
}

async function animate(parts: SectionParts, fitStrikes: () => void): Promise<void> {
  const desktop = window.matchMedia(DESKTOP_MEDIA);
  const doneCount = parts.crossedRows.length;
  const showCount = createCountdown(parts.section, doneCount);
  const pen = createPen(parts.crossedRows, desktop, showCount);
  const refit = () => {
    fitStrikes();
    syncCorrection(parts.correction);
    if (pen.measure()) pen.render();
  };

  hideForEntrance(parts);
  showCount(0);
  await fontsReady();

  const fontsStillLoading = document.fonts.status === 'loading';
  // Strikes must exist before a trigger fires: the headline entrance tweens them.
  refit();
  createEntranceTriggers(parts, pen.render, () => enterCountdown(parts.countdownParts, doneCount, desktop, showCount));
  pen.attach();
  refit();
  ScrollTrigger.addEventListener('refresh', refit);
  desktop.addEventListener('change', () => {
    if (desktop.matches) pen.render();
    else showCount(doneCount);
  });
  // Fonts that missed the timeout reflow the text when they land.
  if (fontsStillLoading) void document.fonts.ready.then(() => ScrollTrigger.refresh());
}

function collectParts(section: HTMLElement): SectionParts {
  const head = query('[data-head]', section);
  const rows = collectRows(section);
  return {
    section,
    head,
    headWords: queryAll('.wi', head),
    kickers: queryAll('[data-kick]', section),
    kickerRule: query('[data-kline]', section),
    correction: findCorrection(section),
    rows,
    crossedRows: rows.filter(isCrossed),
    countdown: query('[data-count]', section),
    countdownParts: queryAll('[data-cin]', section),
    foot: query('[data-foot]', section),
  };
}

function collectRows(section: HTMLElement): AmbitionRow[] {
  return queryAll('[data-row]', section).map((element, index) => {
    const text = query('[data-text]', element);
    const inkSvg = element.querySelector<SVGSVGElement>('[data-ink]');
    const noteText = element.querySelector<HTMLElement>('[data-note]');
    const seed = STRIKE_SEED.firstRow + index * STRIKE_SEED.rowStride;
    const finish = ROW_FINISHES[index % ROW_FINISHES.length] ?? 'sweep';
    return {
      element,
      text,
      wordGroup: query('[data-words]', element),
      words: queryAll('.wi', element),
      rule: query('[data-rule]', element),
      label: query('[data-idx]', element),
      tag: element.querySelector<HTMLElement>('[data-tag]'),
      strike: inkSvg ? createStrike(inkSvg, text, seed, finish) : null,
      note: noteText ? { text: noteText, arrow: query<SVGPathElement>('[data-arrow]', element), arrowHideLength: 0 } : null,
      gate: 0,
      offset: 0,
    };
  });
}

function findCorrection(section: HTMLElement): HeadlineCorrection | null {
  const container = section.querySelector<HTMLElement>('[data-fix]');
  if (!container) return null;
  return {
    strike: createStrike(query<SVGSVGElement>('[data-fix-ink]', container), container, STRIKE_SEED.headline, 'sweep'),
    word: query('[data-fix-word]', container),
    drawn: reducedMotion,
  };
}

function createStrike(svg: SVGSVGElement, target: HTMLElement, seed: number, finish: StrikeFinish): InkStrike {
  return { svg, target, seed, finish, strokes: [] };
}

function isCrossed(row: AmbitionRow): row is CrossedRow {
  return row.strike !== null;
}

function hideForEntrance(parts: SectionParts): void {
  gsap.set(parts.kickerRule, { scaleX: 0 });
  gsap.set(parts.kickers, { opacity: 0, y: 12 });
  gsap.set(parts.headWords, { yPercent: 125, rotation: 3, transformOrigin: '0% 100%' });
  if (parts.correction) gsap.set(parts.correction.word, { clipPath: CORRECTION_CLIP.hidden });
  for (const row of parts.rows) hideRow(row);
  gsap.set(parts.countdownParts, { autoAlpha: 0, y: 28 });
  gsap.set(parts.foot, { opacity: 0, y: 14 });
}

function hideRow(row: AmbitionRow): void {
  gsap.set(row.rule, { scaleX: 0 });
  gsap.set(row.label, { autoAlpha: 0 });
  gsap.set(row.words, { yPercent: 125, rotation: 4, transformOrigin: '0% 100%' });
  if (row.tag) gsap.set(row.tag, { opacity: 0, x: -10 });
  if (row.strike) row.wordGroup.style.opacity = '1';
  if (row.note) hideNote(row.note);
}

function hideNote(note: RowNote): void {
  note.text.style.clipPath = noteClip(0);
  const length = note.arrow.getTotalLength();
  note.arrow.style.strokeDasharray = `${length}px ${length + ARROW_DASH.gap}px`;
  note.arrowHideLength = length + ARROW_DASH.capAllowance;
  note.arrow.style.strokeDashoffset = `${note.arrowHideLength}px`;
}

function createEntranceTriggers(parts: SectionParts, onPenGate: () => void, enterCount: () => void): void {
  const once = { once: true } as const;
  const nextLaunchDelay = createLaunchQueue();
  ScrollTrigger.create({ trigger: parts.head, start: TRIGGER_START.head, onEnter: () => playHeadEntrance(parts), ...once });
  for (const row of parts.rows) {
    ScrollTrigger.create({
      trigger: row.element,
      start: TRIGGER_START.row,
      onEnter: () => launchRow(row, nextLaunchDelay(), onPenGate),
      ...once,
    });
  }
  ScrollTrigger.create({ trigger: parts.countdown, start: TRIGGER_START.countdown, onEnter: enterCount, ...once });
  ScrollTrigger.create({ trigger: parts.foot, start: TRIGGER_START.foot, onEnter: () => revealFoot(parts.foot), ...once });
}

function playHeadEntrance(parts: SectionParts): void {
  const timeline = gsap.timeline({ defaults: { ease: 'expo.out' } });
  timeline
    .to(parts.kickerRule, { scaleX: 1, duration: 1.6 }, 0)
    .to(parts.kickers, { opacity: 1, y: 0, duration: 1.1, stagger: 0.12 }, 0.1)
    .to(parts.headWords, { yPercent: 0, rotation: 0, duration: 1.4, stagger: 0.07 }, 0.12);

  const { correction } = parts;
  if (!correction) return;
  const strikeAt = 1;
  const { strike } = correction;
  timeline
    .add(() => {
      correction.drawn = true;
    }, strikeAt)
    .fromTo(
      strike.strokes.map((stroke) => stroke.path),
      { strokeDashoffset: (index: number) => `${strike.strokes[index]?.hideLength ?? 0}px` },
      { strokeDashoffset: '0px', duration: 0.55, ease: 'power2.inOut' },
      strikeAt,
    )
    .to(correction.word, { clipPath: CORRECTION_CLIP.shown, duration: 0.9, ease: 'power1.inOut' }, 1.45);
}

/** Rows entering together ignite one after another, like a launch sequence. Returns the next row's delay. */
function createLaunchQueue(): () => number {
  let nextSlot = 0;
  return () => {
    const now = gsap.ticker.time;
    const delay = Math.max(0, nextSlot - now);
    nextSlot = Math.max(now, nextSlot) + ROW_IGNITION_GAP_S;
    return delay;
  };
}

function launchRow(row: AmbitionRow, delay: number, onPenGate: () => void): void {
  const timeline = gsap.timeline({ delay, defaults: { ease: 'expo.out' } });
  timeline
    .to(row.rule, { scaleX: 1, duration: 1.5 }, 0)
    .to(row.label, { autoAlpha: 1, duration: 0.45, ease: 'steps(4)' }, 0.08)
    .to(row.words, { yPercent: 0, rotation: 0, duration: 1.25, stagger: 0.05 }, 0.1);
  if (row.tag) timeline.to(row.tag, { opacity: 1, x: 0, duration: 1 }, 0.45);
  if (row.strike) timeline.to(row, { gate: 1, duration: PEN_GATE.duration, ease: 'power1.inOut', onUpdate: onPenGate }, PEN_GATE.at);
}

function enterCountdown(
  countdownParts: readonly HTMLElement[],
  doneCount: number,
  desktop: MediaQueryList,
  showCount: CountdownDisplay,
): void {
  gsap.to(countdownParts, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.08, ease: 'expo.out' });
  // On desktop the scrubbed pen drives the count instead.
  if (desktop.matches || doneCount === 0) return;
  const tally = { crossed: 0 };
  gsap.to(tally, {
    crossed: doneCount,
    duration: COUNT_ROLL.base + doneCount * COUNT_ROLL.perItem,
    delay: COUNT_ROLL.delay,
    ease: 'power3.inOut',
    onUpdate: () => showCount(tally.crossed),
  });
}

function revealFoot(foot: HTMLElement): void {
  gsap.to(foot, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' });
}

/**
 * The signature: one scrubbed pass where the pen crosses things off and the clock counts down.
 * Every row's strike spans the same stretch of scroll, shifted by the row's offset.
 */
function createPen(rows: readonly CrossedRow[], desktop: MediaQueryList, showCount: CountdownDisplay): Pen {
  const first = rows[0];
  const last = rows.at(-1);
  const scrub = { progress: 0 };
  let trigger: ScrollTrigger | undefined;
  let measured = false;
  let distance = 1;
  let strokeWindow = 1;

  const render = () => {
    if (!measured) return;
    const travelled = scrub.progress * distance;
    let crossedSoFar = 0;
    for (const row of rows) {
      // The pen waits for the words to land, even after a fast scroll.
      const progress = Math.min(row.gate, progressThrough(travelled, row.offset, strokeWindow));
      drawRow(row, progress);
      crossedSoFar += easeInOut(progressThrough(progress, ROW_PHASES.countdown.start, ROW_PHASES.countdown.span));
    }
    if (desktop.matches) showCount(crossedSoFar);
  };

  const attach = () => {
    if (!first || !last) return;
    trigger = gsap.to(scrub, {
      progress: 1,
      ease: 'none',
      onUpdate: render,
      scrollTrigger: {
        trigger: first.text,
        start: SCRUB.start,
        endTrigger: last.text,
        end: SCRUB.end,
        scrub: SCRUB.smoothing,
      },
    }).scrollTrigger;
  };

  const measure = () => {
    if (!trigger || !first || !last) return false;
    const firstCenter = verticalCenter(first.text);
    for (const row of rows) row.offset = verticalCenter(row.text) - firstCenter;
    distance = Math.max(1, trigger.end - trigger.start);
    strokeWindow = Math.max(1, distance - last.offset);
    measured = true;
    return true;
  };

  return { render, attach, measure };
}

/** Draws a crossed row at 0..1 progress: its strokes line by line, then its note if it has one. */
function drawRow(row: CrossedRow, progress: number): void {
  const strikeEnd = row.note ? ROW_PHASES.strikeEndWithNote : 1;
  const { strokes } = row.strike;
  const totalLength = strokes.reduce((sum, stroke) => sum + stroke.hideLength, 0) || 1;
  let drawnLength = 0;
  for (const stroke of strokes) {
    const start = (drawnLength / totalLength) * strikeEnd;
    drawnLength += stroke.hideLength;
    const end = (drawnLength / totalLength) * strikeEnd;
    const strokeProgress = easeInOut(progressThrough(progress, start, end - start || 1));
    stroke.path.style.strokeDashoffset = `${stroke.hideLength * (1 - strokeProgress)}px`;
  }
  row.wordGroup.style.opacity = String(1 - STRUCK_WORDS_FADE * clamp01(progress / strikeEnd));
  if (row.note) drawNote(row.note, progressThrough(progress, ROW_PHASES.note.start, ROW_PHASES.note.span));
}

function drawNote(note: RowNote, progress: number): void {
  const arrowProgress = easeInOut(clamp01(progress / ROW_PHASES.noteArrowSpan));
  note.arrow.style.strokeDashoffset = `${note.arrowHideLength * (1 - arrowProgress)}px`;
  note.text.style.clipPath = noteClip(easeOut(progressThrough(progress, ROW_PHASES.noteText.start, ROW_PHASES.noteText.span)));
}

/** Wipes the note in from the left; the negative insets keep its handwriting unclipped. */
function noteClip(revealed: number): string {
  return `inset(-30% ${100 - 110 * revealed}% -45% -10%)`;
}

/** Keeps the headline correction hidden until its entrance has drawn it. */
function syncCorrection(correction: HeadlineCorrection | null): void {
  if (!correction) return;
  for (const stroke of correction.strike.strokes) {
    stroke.path.style.strokeDashoffset = `${correction.drawn ? 0 : stroke.hideLength}px`;
  }
}

/** Shows `crossedSoFar` items on the clock, bar and caption. Fractional while the pen is moving. */
function createCountdown(section: HTMLElement, doneCount: number): CountdownDisplay {
  const setStripPercent = quickYPercentSetter(query('[data-strip]', section));
  const doneFills = queryAll('[data-fill]', section).slice(0, doneCount);
  const countingCaption = query('[data-run]', section);
  const holdingCaption = query('[data-hold]', section);
  return (crossedSoFar) => {
    // The strip holds one reading per crossed item plus the start, and slides back one per item.
    setStripPercent((-100 * (doneCount - crossedSoFar)) / (doneCount + 1));
    doneFills.forEach((fill, index) => {
      fill.style.transform = `scaleX(${clamp01(crossedSoFar - index)})`;
    });
    const holding = clamp01((crossedSoFar - doneCount + HOLD.span) / HOLD.span);
    countingCaption.style.opacity = String(1 - holding);
    holdingCaption.style.opacity = String(holding);
    holdingCaption.style.transform = `translateY(${oneDecimal((1 - holding) * HOLD.riseEm)}em)`;
  };
}

/** gsap.quickSetter is typed as a bare Function; this pins down its signature. */
function quickYPercentSetter(target: HTMLElement): (percent: number) => void {
  const setter = gsap.quickSetter(target, 'yPercent');
  return (percent) => {
    setter(percent);
  };
}

/** Refits every strike to the current layout: the headline first, then the crossed rows. */
function createStrikeFitter(parts: SectionParts): () => void {
  const capMiddleOf = createCapMiddleMeasurer();
  const strikes = parts.crossedRows.map((row) => row.strike);
  if (parts.correction) strikes.unshift(parts.correction.strike);
  return () => {
    for (const strike of strikes) fitStrike(strike, capMiddleOf);
  };
}

/** One stroke per rendered line. Existing paths are reused so running tweens keep their targets. */
function fitStrike(strike: InkStrike, capMiddleOf: (element: Element) => number): void {
  const fontSize = parseFloat(getComputedStyle(strike.target).fontSize);
  const capMiddle = capMiddleOf(strike.target);
  const lines = measureLines(strike.target);
  const pool = strike.strokes.map((stroke) => stroke.path);
  for (const unused of pool.slice(lines.length)) unused.remove();

  const random = mulberry32(strike.seed);
  const strokeWidth = fontSize * PEN.strokeWidth;
  strike.strokes = lines.map((line, index) => {
    const path = pool[index] ?? strike.svg.appendChild(document.createElementNS(SVG_NS, 'path'));
    const finish = index === lines.length - 1 ? strike.finish : 'sweep';
    path.setAttribute('d', strikePath(line, line.top + capMiddle, fontSize, random, finish));
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}px ${length + strokeWidth * PEN.dashGapStrokes}px`;
    return { path, hideLength: length + strokeWidth };
  });
}

/** Groups the word masks inside `target` into rendered lines, in `target`'s offset coordinates. */
function measureLines(target: HTMLElement): StrikeLine[] {
  const masks = queryAll('.w', target);
  const [firstMask] = masks;
  const paddingTop = firstMask ? parseFloat(getComputedStyle(firstMask).paddingTop) : 0;
  const lines: StrikeLine[] = [];
  for (const mask of masks) {
    const top = mask.offsetTop + paddingTop;
    const left = mask.offsetLeft;
    const right = left + mask.offsetWidth;
    const line = lines.at(-1);
    if (line && Math.abs(line.top - top) < SAME_LINE_TOLERANCE_PX) line.right = Math.max(line.right, right);
    else lines.push({ top, left, right });
  }
  return lines;
}

/** Vertical middle of the capitals inside a line box, from the live font's metrics. */
function createCapMiddleMeasurer(): (element: Element) => number {
  const context = document.createElement('canvas').getContext('2d');
  return (element) => {
    const style = getComputedStyle(element);
    const fontSize = parseFloat(style.fontSize);
    const lineHeight = parseFloat(style.lineHeight) || fontSize * FALLBACK_LINE_HEIGHT;
    if (context) {
      context.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
      const metrics = context.measureText('H');
      const baseline = (lineHeight - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 + metrics.fontBoundingBoxAscent;
      const capMiddle = baseline - metrics.actualBoundingBoxAscent / 2;
      if (capMiddle > lineHeight * CAP_MIDDLE_BAND.min && capMiddle < lineHeight * CAP_MIDDLE_BAND.max) return capMiddle;
    }
    return lineHeight / 2;
  };
}

/**
 * A wobbly hand-drawn stroke through one line of words at height `y`.
 * Keep the order of `random()` draws: the seed replays the same handwriting.
 */
function strikePath(line: StrikeLine, y: number, fontSize: number, random: () => number, finish: StrikeFinish): string {
  const jitter = (amount: number) => (random() * 2 - 1) * amount * fontSize;
  const startX = line.left - fontSize * (PEN.overshootStart.min + random() * PEN.overshootStart.random);
  const startY = y + fontSize * PEN.startDrop + jitter(PEN.endWobble);
  const endX = line.right + fontSize * (PEN.overshootEnd.min + random() * PEN.overshootEnd.random);
  const endY = y - fontSize * PEN.endRise + jitter(PEN.endWobble);
  const width = endX - startX;
  const nearHandle = svgPoint(startX + width * PEN.handleNear, startY + jitter(PEN.handleWobble));
  const farHandle = svgPoint(startX + width * PEN.handleFar, endY + jitter(PEN.handleWobble));
  const sweep = `M${svgPoint(startX, startY)}C${nearHandle} ${farHandle} ${svgPoint(endX, endY)}`;

  if (finish === 'return') {
    const returnX = startX + width * (RETURN_PASS.reach.min + random() * RETURN_PASS.reach.random);
    const returnY = y + fontSize * RETURN_PASS.drop + jitter(RETURN_PASS.endWobble);
    const backHandle = svgPoint(endX - width * RETURN_PASS.handleBack, endY + fontSize * RETURN_PASS.handleDrop);
    const returnHandle = svgPoint(returnX + width * RETURN_PASS.handleReach, returnY + jitter(RETURN_PASS.handleWobble));
    return `${sweep}C${backHandle} ${returnHandle} ${svgPoint(returnX, returnY)}`;
  }
  if (finish === 'flick') {
    const control = svgPoint(fontSize * FLICK.control.x, fontSize * FLICK.control.y);
    const end = svgPoint(fontSize * FLICK.end.x, fontSize * FLICK.end.y);
    return `${sweep}q${control} ${end}`;
  }
  return sweep;
}

/** mulberry32: a tiny seeded PRNG. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** 0..1 progress of `value` through the window that opens at `start` and lasts `span`. */
function progressThrough(value: number, start: number, span: number): number {
  return clamp01((value - start) / span);
}

function verticalCenter(element: Element): number {
  const box = element.getBoundingClientRect();
  return box.top + box.height / 2;
}

function svgPoint(x: number, y: number): string {
  return `${oneDecimal(x)} ${oneDecimal(y)}`;
}

function oneDecimal(value: number): string {
  return value.toFixed(1);
}

function debounce(callback: () => void, waitMs: number): () => void {
  let timer: number | undefined;
  return () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(callback, waitMs);
  };
}
