/**
 * Access review FAQ. Stamps slam onto rows as the reviewer's line scrolls past, the tallies count only what has
 * landed, and "Approve all" rubber-stamps the whole queue until it is undone.
 */
import { gsap, ScrollTrigger, SplitText, reducedMotion, finePointer, fontsReady } from '../../lib/motion';
import { query, queryAll, readDataset, setText } from '../../lib/dom';
import { padNumber } from '../../lib/format';
import { rollText } from '../../lib/text';

const DECISION_KINDS = ['approved', 'denied', 'pending'] as const;

/** Shared with AccessReview.astro, which renders these as data-kind values. */
export type DecisionKind = (typeof DECISION_KINDS)[number];

/** Viewport position of the reviewer's line; a row is stamped as it crosses. */
const REVIEW_LINE = '62%';
/** Same fallback as `var(--rot, -5deg)` in the styles. */
const DEFAULT_TILT_DEG = -5;
const TALLY_DIGITS = 2;
const TOAST_VISIBLE_MS = 6500;

const TITLE = { start: 'top 80%', fromYPercent: 118, duration: 1.3, stagger: 0.045 } as const;
/** Hidden states mirror the `.js:not(.ready)` rules in the styles. */
const HANDWRITING = {
  start: 'top 88%',
  delay: 0.25,
  writeDuration: 1,
  arrowDuration: 0.55,
  arrowStagger: 0.22,
  /** Arrows start drawing this long before the words finish. */
  arrowOverlap: 0.35,
  /** Arrow paths use pathLength="1"; just past 1 also hides the round caps. */
  hiddenDashOffset: 1.01,
  clipHidden: 'inset(-25% 100% -25% -6%)',
  clipShown: 'inset(-25% -6% -25% -6%)',
} as const;
const BEAM = { fadeIn: 0.3, fadeOut: 0.5, lingerAtEnd: 0.6 } as const;
const TALLY_ROLL = { fromYPercent: 85, duration: 0.5 } as const;
const SLAM = {
  drop: { scale: 2.7, tiltDeg: -15, yPx: -24, duration: 0.32 },
  awaitFade: 0.12,
  squash: { scaleX: 1.07, scaleY: 0.9, duration: 0.6, ease: 'elastic.out(1.1, 0.45)' },
  wobble: { xPx: [-3.5, 3, -1.5, 0.8, 0], tiltDeg: [-1.4, 1, -0.4, 0.2, 0], duration: 0.32 },
  ring: { opacity: 0.85, scale: 1.45, duration: 0.7 },
  ink: { scale: 0.2, duration: 0.65 },
  flash: { opacity: 0.09, duration: 0.7 },
  jolt: { yPx: [2, -1, 0.5, 0], duration: 0.3 },
} as const;
const LIFT = { scale: 1.3, yPx: -14, tiltDeg: 9, duration: 0.24, recountAt: 0.01 } as const;
/** Approve all ripples down the queue; a swapped stamp lands sooner than one re-slammed in place. */
const RESTAMP = { rowStagger: 0.12, swapDelay: 0.16, sameStampDelay: 0.26 } as const;
const HOVER = { scale: 1.05, tiltDeg: 3, yPx: -3, enterDuration: 0.45, leaveDuration: 0.7 } as const;

interface Offset {
  readonly x: number;
  readonly y: number;
}

/** Where each of a stamp's six ink dots flies on impact, in document order. */
const INK_SPRAY_PX: readonly Offset[] = [
  { x: -18, y: -6 },
  { x: -15, y: 9 },
  { x: 18, y: -9 },
  { x: 14, y: 8 },
  { x: -5, y: -15 },
  { x: 6, y: 15 },
];
const NO_OFFSET: Offset = { x: 0, y: 0 };

const COPY = {
  approveAll: 'Approve all',
  undoApproveAll: 'Undo approve all',
  waiting: 'Waiting for reviewer',
  complete: 'Review complete',
  reviewing: (id: string) => `Reviewing ${id}`,
  approvedToast: {
    title: 'Rubber stamp detected',
    message: (count: number) => `${count} approvals in one click. Somewhere, an auditor just felt a chill.`,
  },
  restoredToast: { title: 'Decisions restored', message: 'Honest answers are back. Diligence looks good on you.' },
} as const;

interface Stamp {
  readonly element: HTMLElement;
  readonly kind: DecisionKind;
  readonly ring: HTMLElement;
  readonly inkDots: readonly HTMLElement[];
}

interface Row {
  readonly element: HTMLElement;
  readonly id: string;
  /** The honest decision, before any approve-all override. */
  readonly kind: DecisionKind;
  readonly tiltDeg: number;
  readonly base: Stamp;
  /** Hidden "Approved" stamp for approve all; null on rows that already are a plain approval. */
  readonly override: Stamp | null;
  readonly awaiting: HTMLElement;
  readonly flash: HTMLElement;
  readonly joltTargets: readonly HTMLElement[];
  readonly effects: readonly HTMLElement[];
  /** Stamped at least once. With reduced motion every row starts revealed. */
  revealed: boolean;
  /** A stamp is landing; hover leaves it alone. */
  busy: boolean;
  /** What the visible tallies count this row as; null until a stamp lands. */
  shown: DecisionKind | null;
  revealTimeline: gsap.core.Timeline | null;
}

interface Tally {
  readonly kind: DecisionKind;
  /** The rolling two-digit number. */
  readonly digits: HTMLElement;
  /** The final count, for screen readers. */
  readonly spokenCount: HTMLElement;
}

interface Review {
  readonly root: HTMLElement;
  readonly rows: readonly Row[];
  readonly tallies: readonly Tally[];
  readonly button: HTMLButtonElement;
  readonly showToast: (title: string, message: string) => void;
  approvedAll: boolean;
  restampTimeline: gsap.core.Timeline | null;
}

interface StampChange {
  readonly row: Row;
  /** The stamp showing before the toggle; null if the row was not reviewed yet. */
  readonly previous: Stamp | null;
}

export function initAccessReview(): void {
  const review = createReview(query('[data-ar]'));
  review.button.addEventListener('click', () => toggleApproveAll(review));
  if (reducedMotion) return;
  hideStampsUntilReviewed(review);
  void startScrollMotion(review);
}

function createReview(root: HTMLElement): Review {
  return {
    root,
    rows: queryAll('[data-ar-row]', root).map(readRow),
    tallies: DECISION_KINDS.map((kind) => ({
      kind,
      digits: query(`[data-ar-num="${kind}"]`, root),
      spokenCount: query(`[data-ar-sr="${kind}"]`, root),
    })),
    button: query<HTMLButtonElement>('[data-ar-approve]', root),
    showToast: createToast(root),
    approvedAll: false,
    restampTimeline: null,
  };
}

function readRow(element: HTMLElement): Row {
  const kind = readKind(element);
  const [overrideElement] = queryAll('[data-stamp="over"]', element);
  return {
    element,
    id: readDataset(element, 'id'),
    kind,
    tiltDeg: readTilt(element),
    base: readStamp(query('[data-stamp="base"]', element)),
    override: overrideElement ? readStamp(overrideElement) : null,
    awaiting: query('[data-ar-await]', element),
    flash: query('[data-ar-flash]', element),
    joltTargets: queryAll('[data-ar-jolt]', element),
    effects: queryAll('[data-ring], [data-dot]', element),
    revealed: reducedMotion,
    busy: false,
    shown: reducedMotion ? kind : null,
    revealTimeline: null,
  };
}

function readStamp(element: HTMLElement): Stamp {
  return { element, kind: readKind(element), ring: query('[data-ring]', element), inkDots: queryAll('[data-dot]', element) };
}

/** Returns a function that pops the toast and repeats it to the live region. */
function createToast(root: HTMLElement): (title: string, message: string) => void {
  const panel = query('[data-ar-toast]', root);
  const titleElement = query('[data-ar-toast-title]', root);
  const messageElement = query('[data-ar-toast-msg]', root);
  const liveRegion = query('[data-ar-live]', root);
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  return (title, message) => {
    titleElement.textContent = title;
    messageElement.textContent = message;
    liveRegion.textContent = `${title}. ${message}`;
    panel.classList.add('is-on');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => panel.classList.remove('is-on'), TOAST_VISIBLE_MS);
  };
}

function toggleApproveAll(review: Review): void {
  review.restampTimeline?.kill();
  review.restampTimeline = null;
  const changes: StampChange[] = review.rows.map((row) => ({ row, previous: row.revealed ? settle(review, row) : null }));
  review.approvedAll = !review.approvedAll;
  syncDecisionState(review);
  if (reducedMotion) {
    for (const row of review.rows) settle(review, row);
    renderTallies(review);
  } else {
    renderTallies(review);
    review.restampTimeline = restamp(review, changes);
  }
  if (review.approvedAll) review.showToast(COPY.approvedToast.title, COPY.approvedToast.message(review.rows.length));
  else review.showToast(COPY.restoredToast.title, COPY.restoredToast.message);
}

/** The truth changes at once (screen reader counts, exposed stamp, button label); the stamps animate to catch up. */
function syncDecisionState(review: Review): void {
  const { approvedAll } = review;
  const decisionOf = (row: Row): DecisionKind => (approvedAll ? 'approved' : row.kind);
  for (const tally of review.tallies) {
    tally.spokenCount.textContent = String(review.rows.filter((row) => decisionOf(row) === tally.kind).length);
  }
  for (const row of review.rows) {
    if (!row.override) continue;
    setAriaHidden(row.base.element, approvedAll);
    setAriaHidden(row.override.element, !approvedAll);
  }
  review.root.toggleAttribute('data-approved', approvedAll);
  review.button.setAttribute('aria-label', approvedAll ? COPY.undoApproveAll : COPY.approveAll);
}

/** Rolls each visible tally to the number of stamps that have actually landed. */
function renderTallies(review: Review, { animate = !reducedMotion }: { animate?: boolean } = {}): void {
  for (const tally of review.tallies) {
    rollText(tally.digits, formatTally(review.rows.filter((row) => row.shown === tally.kind).length), TALLY_ROLL, animate);
  }
}

/** Jumps a row straight to its current stamp, cancelling anything in flight, and returns that stamp. */
function settle(review: Review, row: Row): Stamp {
  const shownStamp = currentStamp(review, row);
  const hiddenStamp = shownStamp === row.base ? row.override : row.base;
  row.revealTimeline?.kill();
  row.revealTimeline = null;
  gsap.killTweensOf([...stampElements(row), row.awaiting, row.flash, ...row.joltTargets, ...row.effects]);
  gsap.set(shownStamp.element, { visibility: 'visible', opacity: 1, x: 0, y: 0, scale: 1, rotation: row.tiltDeg });
  if (hiddenStamp) gsap.set(hiddenStamp.element, { visibility: 'hidden', opacity: 0 });
  gsap.set([row.awaiting, row.flash, ...row.effects], { opacity: 0 });
  gsap.set(row.joltTargets, { y: 0 });
  row.revealed = true;
  row.busy = false;
  row.shown = shownStamp.kind;
  return shownStamp;
}

function revealRow(review: Review, row: Row): void {
  if (row.revealed) return;
  row.revealed = true;
  row.revealTimeline = slam(review, row, currentStamp(review, row));
}

/** Lifts each changed stamp and slams its replacement, rippling down the queue. */
function restamp(review: Review, changes: readonly StampChange[]): gsap.core.Timeline {
  const timeline = gsap.timeline();
  let offset = 0;
  for (const { row, previous } of changes) {
    const next = currentStamp(review, row);
    // Undo skips rows it does not change; approve all re-slams every row.
    if (previous === next && !review.approvedAll) continue;
    row.revealed = true;
    if (previous) {
      const sameStamp = previous === next;
      timeline.add(lift(review, row, previous, { hide: !sameStamp, recount: previous.kind !== next.kind }), offset);
      timeline.add(slam(review, row, next), offset + (sameStamp ? RESTAMP.sameStampDelay : RESTAMP.swapDelay));
    } else {
      timeline.add(slam(review, row, next), offset);
    }
    offset += RESTAMP.rowStagger;
  }
  return timeline;
}

/** Drops a stamp onto its row: a hard landing, squash, wobble, ink spray and a jolt through the row. */
function slam(review: Review, row: Row, stamp: Stamp): gsap.core.Timeline {
  const { element, ring, inkDots } = stamp;
  const tilt = row.tiltDeg;
  const impact = 'impact';
  return gsap
    .timeline({ onStart: () => (row.busy = true), onComplete: () => (row.busy = false) })
    .set(element, { visibility: 'visible' }, 0)
    .fromTo(
      element,
      { opacity: 0, scale: SLAM.drop.scale, rotation: tilt + SLAM.drop.tiltDeg, x: 0, y: SLAM.drop.yPx },
      { opacity: 1, scale: 1, rotation: tilt, y: 0, duration: SLAM.drop.duration, ease: 'power4.in', immediateRender: false },
      0,
    )
    .addLabel(impact)
    .call(() => land(review, row, stamp), [], impact)
    .to(row.awaiting, { opacity: 0, duration: SLAM.awaitFade }, impact)
    .fromTo(
      element,
      { scaleX: SLAM.squash.scaleX, scaleY: SLAM.squash.scaleY },
      { scaleX: 1, scaleY: 1, duration: SLAM.squash.duration, ease: SLAM.squash.ease, immediateRender: false },
      impact,
    )
    .to(
      element,
      {
        keyframes: { x: SLAM.wobble.xPx, rotation: SLAM.wobble.tiltDeg.map((offset) => tilt + offset) },
        duration: SLAM.wobble.duration,
        ease: 'none',
      },
      impact,
    )
    .fromTo(
      ring,
      { opacity: SLAM.ring.opacity, scale: 1 },
      { opacity: 0, scale: SLAM.ring.scale, duration: SLAM.ring.duration, ease: 'expo.out', immediateRender: false },
      impact,
    )
    .fromTo(
      inkDots,
      { opacity: 1, x: 0, y: 0, scale: 1 },
      {
        opacity: 0,
        x: (index: number) => inkSpray(index).x,
        y: (index: number) => inkSpray(index).y,
        scale: SLAM.ink.scale,
        duration: SLAM.ink.duration,
        ease: 'expo.out',
        immediateRender: false,
      },
      impact,
    )
    .fromTo(
      row.flash,
      { opacity: SLAM.flash.opacity },
      { opacity: 0, duration: SLAM.flash.duration, ease: 'power2.out', immediateRender: false },
      impact,
    )
    .fromTo(
      row.joltTargets,
      { y: 0 },
      { keyframes: { y: SLAM.jolt.yPx }, duration: SLAM.jolt.duration, ease: 'none', immediateRender: false },
      impact,
    );
}

/** On impact the row flashes in the stamp's ink and the tallies count it. */
function land(review: Review, row: Row, stamp: Stamp): void {
  row.shown = stamp.kind;
  row.flash.style.color = getComputedStyle(stamp.element).color;
  renderTallies(review);
}

/** Peels a stamp off before the next lands: `hide` takes it out of view, `recount` takes it off the tallies. */
function lift(review: Review, row: Row, stamp: Stamp, { hide, recount }: { hide: boolean; recount: boolean }): gsap.core.Timeline {
  const timeline = gsap.timeline();
  if (recount) {
    timeline.call(
      () => {
        row.shown = null;
        renderTallies(review);
      },
      [],
      LIFT.recountAt,
    );
  }
  timeline.to(
    stamp.element,
    { opacity: 0, scale: LIFT.scale, y: LIFT.yPx, rotation: row.tiltDeg + LIFT.tiltDeg, duration: LIFT.duration, ease: 'power2.in' },
    0,
  );
  if (hide) timeline.set(stamp.element, { visibility: 'hidden' });
  return timeline;
}

/** Rows start as "Awaiting review" with empty tallies; stamps land as the reviewer scrolls. */
function hideStampsUntilReviewed(review: Review): void {
  for (const row of review.rows) {
    gsap.set(row.base.element, { opacity: 0 });
    gsap.set(row.awaiting, { opacity: 1 });
  }
  renderTallies(review, { animate: false });
}

async function startScrollMotion(review: Review): Promise<void> {
  await fontsReady();
  animateTitle(review.root);
  animateHandwriting(review.root);
  trackReviewLine(review);
  if (finePointer) bindStampHover(review);
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

function animateTitle(root: HTMLElement): void {
  const title = query('[data-ar-title]', root);
  const split = SplitText.create(title, { type: 'lines,chars', mask: 'lines', tag: 'span', linesClass: 'ar-line', charsClass: 'ar-char' });
  gsap.set(split.chars, { yPercent: TITLE.fromYPercent });
  gsap.set(title, { visibility: 'visible' });
  onceInView(title, TITLE.start, () => {
    gsap.to(split.chars, {
      yPercent: 0,
      duration: TITLE.duration,
      ease: 'expo.out',
      stagger: TITLE.stagger,
      onComplete: () => split.revert(),
    });
  });
}

/** The handwritten asides write themselves in, then their arrows draw. */
function animateHandwriting(root: HTMLElement): void {
  for (const hand of queryAll('[data-ar-hand]', root)) {
    const words = queryAll('[data-ar-write]', hand);
    const arrows = queryAll<SVGPathElement>('path', hand);
    gsap.set(words, { clipPath: HANDWRITING.clipHidden });
    gsap.set(arrows, { strokeDashoffset: HANDWRITING.hiddenDashOffset });
    onceInView(hand, HANDWRITING.start, () => {
      gsap
        .timeline({ delay: HANDWRITING.delay })
        .to(words, { clipPath: HANDWRITING.clipShown, duration: HANDWRITING.writeDuration, ease: 'power2.inOut' })
        .to(
          arrows,
          { strokeDashoffset: 0, duration: HANDWRITING.arrowDuration, ease: 'power2.out', stagger: HANDWRITING.arrowStagger },
          `-=${HANDWRITING.arrowOverlap}`,
        );
    });
  }
}

/** The reviewer's beam scrubs down the queue, names the row under review, and stamps each row it crosses. */
function trackReviewLine(review: Review): void {
  const queue = query('[data-ar-queue]', review.root);
  const beam = query('[data-ar-beam]', review.root);
  const tag = query('[data-ar-tag]', review.root);
  const setTag = (text: string) => setText(tag, text);
  const showBeam = (visible: boolean, delay = 0) =>
    gsap.to(beam, { opacity: visible ? 1 : 0, duration: visible ? BEAM.fadeIn : BEAM.fadeOut, delay, overwrite: 'auto' });

  gsap.fromTo(
    beam,
    { y: 0 },
    {
      y: () => queue.offsetHeight,
      ease: 'none',
      scrollTrigger: {
        trigger: queue,
        start: `top ${REVIEW_LINE}`,
        end: `bottom ${REVIEW_LINE}`,
        scrub: true,
        invalidateOnRefresh: true,
        onEnter: () => showBeam(true),
        onEnterBack: () => showBeam(true),
        onLeave: () => {
          setTag(COPY.complete);
          showBeam(false, BEAM.lingerAtEnd);
        },
        onLeaveBack: () => {
          setTag(COPY.waiting);
          showBeam(false);
        },
      },
    },
  );

  for (const row of review.rows) {
    ScrollTrigger.create({
      trigger: row.element,
      start: `top ${REVIEW_LINE}`,
      end: `bottom ${REVIEW_LINE}`,
      onToggle: (self) => {
        if (self.isActive) setTag(COPY.reviewing(row.id));
      },
    });
    onceInView(row.element, `center ${REVIEW_LINE}`, () => revealRow(review, row));
  }
}

/** Stamps lean in under a fine pointer, but never while one is landing. */
function bindStampHover(review: Review): void {
  for (const row of review.rows) {
    const tweenStamp = (vars: gsap.TweenVars) => {
      if (!row.revealed || row.busy || review.restampTimeline?.isActive()) return;
      gsap.to(currentStamp(review, row).element, { ...vars, ease: 'expo.out', overwrite: 'auto' });
    };
    const cell = query('[data-ar-decision]', row.element);
    cell.addEventListener('pointerenter', () =>
      tweenStamp({ scale: HOVER.scale, rotation: row.tiltDeg + HOVER.tiltDeg, y: HOVER.yPx, duration: HOVER.enterDuration }),
    );
    cell.addEventListener('pointerleave', () => tweenStamp({ scale: 1, rotation: row.tiltDeg, y: 0, duration: HOVER.leaveDuration }));
  }
}

/** Runs `callback` the first time `trigger` reaches `start`, including when the page loads already past it. */
function onceInView(trigger: Element, start: string, callback: () => void): void {
  let fired = false;
  let scrollTrigger: ScrollTrigger | null = null;
  const fire = () => {
    if (fired) return;
    fired = true;
    callback();
    scrollTrigger?.kill();
  };
  scrollTrigger = ScrollTrigger.create({ trigger, start, onEnter: fire, onEnterBack: fire, onLeave: fire });
  // create() can fire synchronously, before the handle above was assigned.
  if (fired) scrollTrigger.kill();
}

/** The stamp a row should show now: the override while everything is approved. */
function currentStamp(review: Review, row: Row): Stamp {
  return review.approvedAll && row.override ? row.override : row.base;
}

function stampElements(row: Row): HTMLElement[] {
  return row.override ? [row.base.element, row.override.element] : [row.base.element];
}

function inkSpray(index: number): Offset {
  return INK_SPRAY_PX[index] ?? NO_OFFSET;
}

function formatTally(count: number): string {
  return padNumber(count, TALLY_DIGITS);
}

function setAriaHidden(element: Element, hidden: boolean): void {
  if (hidden) element.setAttribute('aria-hidden', 'true');
  else element.removeAttribute('aria-hidden');
}

function readKind(element: HTMLElement): DecisionKind {
  const value = readDataset(element, 'kind');
  const kind = DECISION_KINDS.find((candidate) => candidate === value);
  if (!kind) throw new Error(`Unknown data-kind "${value}" on <${element.tagName.toLowerCase()}>`);
  return kind;
}

function readTilt(row: HTMLElement): number {
  const tilt = Number.parseFloat(row.style.getPropertyValue('--rot'));
  return Number.isNaN(tilt) ? DEFAULT_TILT_DEG : tilt;
}
