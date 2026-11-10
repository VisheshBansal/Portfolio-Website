/**
 * The journey. On wide screens vertical scroll pins the stage and drives the track sideways while the traveler
 * dot strings the cable behind it. With motion allowed, every part of the section also reveals on entry.
 */
import { gsap, ScrollTrigger, SplitText, finePointer, fontsReady } from '../../lib/motion';
import { query, queryAll } from '../../lib/dom';
import { builtMarkup, layoutCable, planMarkup, type Box, type CableLayout } from './journey.cable';
import { tenths, type Point } from './journey.geometry';
import type { Motif } from './journey.motifs';

/** Keep in sync with the rail `@media` block in Journey.astro. */
const RAIL_MEDIA = '(min-width: 1024px) and (min-height: 600px)';
const MOTION_MEDIA = '(prefers-reduced-motion: no-preference)';

const REACHED_CLASS = 'is-reached';
const LIVE_CLASS = 'is-live';
const MULTI_ROLE_CLASS = 'stop--multi';
/** The label that marks where the route starts rather than a stop. */
const ORIGIN_ANCHOR = 'origin';

const RAIL = {
  /** Pinned scroll distance per pixel the track travels. */
  scrollPerPx: 0.9,
  scrub: 0.8,
  /** "this dot is me" fades out over the first stretch of travel. */
  meNoteFadePx: 140,
  /** Slack so a label at the resting dot counts as reached despite rounding. */
  reachSlackPx: 1,
} as const;
/** The origin label sits left of its ring; station labels sit above theirs. */
const LABEL_OFFSET = { originPx: 18, stationPx: 14 } as const;
/** A card's name and plate drift in opposite directions while it crosses the stage. */
const PARALLAX = { orgPx: 22, platePx: 14 } as const;

const REVEAL_EASE = 'expo.out';
/** Reveals play once an element is this far into the viewport and rewind when it drops back out ahead. */
const REVEAL_ROOT_MARGIN = '0px -12% -12% 0px';
/** Motif loops only run near the viewport. */
const LIVE_ROOT_MARGIN = '10%';
/** Split characters rise out of their masks: the section title and every org name. */
const CHAR_RISE_PERCENT = 112;
/** Handwritten lines wipe in from the left. */
const WIPE = { hidden: 'inset(-30% 100% -30% -4%)', shown: 'inset(-30% -4% -30% -4%)', duration: 1.3, ease: 'power2.inOut' } as const;
/** Motif strokes use pathLength="1", so a dash offset of 1 hides a whole stroke. */
const DRAW = { hiddenOffset: 1, ease: 'power2.inOut' } as const;

/** Section intro, in seconds from entry. */
const INTRO = {
  title: { duration: 1.2, stagger: 0.03 },
  copy: { at: 0.15, y: 14, duration: 1, stagger: 0.1 },
  noteAt: 0.55,
  origin: { at: 0.6, x: -12, duration: 0.9 },
} as const;
/** Stack layout only: each card rises through a rounded clip while its timeline segment and pin draw in. */
const STACK_FRAME = {
  rise: { y: 48, duration: 1.3, hiddenInset: '10% 4% 0% 4%', shownInset: '0% 0% 0% 0%' },
  segment: { duration: 1.4 },
  pin: { at: 0.15, duration: 0.7 },
  roleRules: { at: 0.5, duration: 1.1, stagger: 0.15 },
  /** The card's content follows its frame by this much. */
  contentDelay: 0.2,
} as const;
/** Card content, in seconds from the content cue. */
const CARD_CONTENT = {
  org: { duration: 1.15, stagger: 0.032 },
  meta: { y: 10, duration: 0.8 },
  copy: { at: 0.25, y: 16, duration: 0.9, stagger: 0.05 },
  lines: { at: 0.45, stagger: 0.2 },
  motifAt: 0.1,
} as const;
/** The terminal and the fine print fade up. */
const FADE_UP = { y: 22, duration: 1.1, stagger: 0.09 } as const;
/** Stack layout only: the access graph builds in stages on a timer instead of following the rail. */
const GRAPH_BUILD = { stages: 3, delay: 0.2, duration: 2.4 } as const;
/** Fine-pointer tilt per card width or height of pointer travel (the offset runs -0.5 to 0.5 from the centre). */
const TILT = { perspectivePx: 1100, rotationXDeg: -5, rotationYDeg: 7, artShiftXPx: -14, artShiftYPx: -10, duration: 0.7 } as const;

type IntroMotif = Exclude<Motif, 'graph'>;

interface MotifStep {
  readonly selector: string;
  /** `from` tweens in from `vars`; `draw` strokes a path in. */
  readonly kind: 'from' | 'draw';
  readonly vars: gsap.TweenVars;
  /** Seconds after the motif's cue. */
  readonly delay?: number;
}

/** Plate art entrances, in order. The graph builds in stages instead (see GRAPH_BUILD). */
const MOTIF_INTROS: Readonly<Record<IntroMotif, readonly MotifStep[]>> = {
  clouds: [{ selector: '.m-clouds__c', kind: 'from', vars: { autoAlpha: 0, y: 18, duration: 1.3, stagger: 0.08 } }],
  rain: [
    { selector: '.m-rain__col', kind: 'from', vars: { autoAlpha: 0, duration: 1, stagger: 0.06 } },
    { selector: '.m-rain__hit', kind: 'from', vars: { autoAlpha: 0, scale: 0.9, svgOrigin: '227 151', duration: 0.9 }, delay: 0.6 },
  ],
  scan: [
    { selector: '.m-scan__grid', kind: 'from', vars: { autoAlpha: 0, duration: 0.8 } },
    { selector: '.m-scan__cell', kind: 'from', vars: { scale: 0, transformOrigin: '50% 50%', duration: 0.7, stagger: 0.006 }, delay: 0.1 },
  ],
  merge: [
    { selector: '.m-merge__in', kind: 'draw', vars: { duration: 1.2, stagger: 0.05 } },
    {
      selector: '.m-merge__node',
      kind: 'from',
      vars: { autoAlpha: 0, scale: 0.6, svgOrigin: '260 150', duration: 0.8, ease: 'back.out(2)' },
      delay: 0.7,
    },
    { selector: '.m-merge__out', kind: 'draw', vars: { duration: 0.6 }, delay: 0.95 },
    {
      selector: '.m-merge__bubble',
      kind: 'from',
      vars: { autoAlpha: 0, scale: 0.5, svgOrigin: '374 150', duration: 0.7, ease: 'back.out(2.5)' },
      delay: 1.25,
    },
    { selector: '.m-merge__pkt', kind: 'from', vars: { autoAlpha: 0, duration: 0.6 }, delay: 1.2 },
  ],
  radar: [
    {
      selector: '.m-radar__grid circle',
      kind: 'from',
      vars: { autoAlpha: 0, scale: 0.4, svgOrigin: '200 150', duration: 1.1, stagger: 0.1 },
    },
    { selector: '.m-radar__scope', kind: 'from', vars: { autoAlpha: 0, duration: 0.8 }, delay: 0.4 },
    {
      selector: '.m-radar__blip, .m-radar__threat, .m-hand',
      kind: 'from',
      vars: { autoAlpha: 0, duration: 0.6, stagger: 0.05 },
      delay: 0.7,
    },
  ],
  nodes: [
    { selector: '.m-nodes__hub', kind: 'from', vars: { scale: 0, svgOrigin: '200 150', duration: 0.8, ease: 'back.out(2.5)' } },
    { selector: '.m-nodes__e', kind: 'from', vars: { autoAlpha: 0, duration: 0.8, stagger: 0.02 }, delay: 0.2 },
    { selector: '.m-nodes__n', kind: 'from', vars: { autoAlpha: 0, duration: 0.6, stagger: 0.03 }, delay: 0.3 },
    { selector: '.m-nodes__arrow, .m-hand', kind: 'from', vars: { autoAlpha: 0, duration: 0.6 }, delay: 0.9 },
  ],
  chart: [
    { selector: '.m-chart__grid', kind: 'from', vars: { autoAlpha: 0, duration: 0.8 } },
    { selector: '.m-chart__line', kind: 'draw', vars: { duration: 1.8 }, delay: 0.1 },
    { selector: '.m-chart__ev', kind: 'from', vars: { autoAlpha: 0, duration: 0.5, stagger: 0.02 }, delay: 0.4 },
    { selector: '.m-chart__area', kind: 'from', vars: { autoAlpha: 0, duration: 1.2 }, delay: 0.8 },
    {
      selector: '.m-chart__end',
      kind: 'from',
      vars: { autoAlpha: 0, scale: 0.3, svgOrigin: '376 70', duration: 0.7, ease: 'back.out(3)' },
      delay: 1.6,
    },
  ],
};

type Cleanup = () => void;
type SplitChars = (element: Element) => Element[];

/** Something the traveler reaches as it rides: a rail label or a role column. */
interface Milestone {
  readonly element: HTMLElement;
  /** Track x where the traveler reaches it. */
  readonly x: number;
  reached: boolean;
}

interface RailLabel extends Milestone, Point {
  readonly isOrigin: boolean;
}

/** The measured rail, rebuilt on every ScrollTrigger refresh. */
interface RailGeometry {
  /** Track x of the resting traveler. */
  readonly startX: number;
  /** How far the track travels while pinned. */
  readonly travel: number;
  readonly cableY: (x: number) => number;
  readonly labels: readonly RailLabel[];
  readonly roleColumns: readonly Milestone[];
}

interface RailElements {
  readonly root: HTMLElement;
  readonly stage: HTMLElement;
  readonly track: HTMLElement;
  readonly stops: readonly HTMLElement[];
  readonly plan: SVGSVGElement;
  readonly built: HTMLElement;
  readonly builtSvg: SVGSVGElement;
  readonly traveler: HTMLElement;
  readonly meNote: HTMLElement;
  readonly labels: readonly HTMLElement[];
  /** The stop with several roles; reaching its role columns stages the access graph. */
  readonly multiRoleStop: HTMLElement | null;
  readonly roleColumns: readonly HTMLElement[];
}

export function initJourney(): void {
  const root = query('[data-jy="root"]');
  const stops = queryAll('[data-jy="stop"]', root);
  gsap.matchMedia().add({ motion: MOTION_MEDIA, rail: RAIL_MEDIA }, (context) => {
    const conditions: gsap.Conditions = context.conditions ?? {};
    if (!conditions.motion) return;
    return animate(context, root, stops, conditions.rail === true);
  });
}

/** Runs inside a matchMedia context, which also reverts every tween and trigger created here. */
function animate(context: gsap.Context, root: HTMLElement, stops: readonly HTMLElement[], rail: boolean): Cleanup {
  const cleanups: Cleanup[] = [];
  let active = true;
  if (rail) cleanups.push(buildRail(railElements(root, stops)));
  void fontsReady().then(() => {
    if (!active) return;
    // In the context so its tweens revert too; pushed, since a returned function would also become a revert hook.
    context.add(() => {
      cleanups.push(buildReveals(root, stops, rail));
    });
    // Sections above may pin late (after fonts); re-measure so this pin lands after theirs.
    if (rail) ScrollTrigger.refresh();
  });
  if (finePointer) for (const stop of stops) cleanups.push(bindTilt(query('.stop__card', stop)));
  return () => {
    active = false;
    for (const cleanup of cleanups) cleanup();
    for (const stop of stops) delete stop.dataset.stage;
  };
}

function railElements(root: HTMLElement, stops: readonly HTMLElement[]): RailElements {
  const multiRoleStop = stops.find((stop) => stop.classList.contains(MULTI_ROLE_CLASS)) ?? null;
  return {
    root,
    stage: query('[data-jy="stage"]', root),
    track: query('[data-jy="track"]', root),
    stops,
    plan: query<SVGSVGElement>('[data-jy="plan"]', root),
    built: query('[data-jy="built"]', root),
    builtSvg: query<SVGSVGElement>('[data-jy="built-svg"]', root),
    traveler: query('[data-jy="traveler"]', root),
    meNote: query('[data-jy="me"]', root),
    labels: queryAll('[data-anchor]', root),
    multiRoleStop,
    roleColumns: multiRoleStop ? queryAll('[data-jy="role"]', multiRoleStop) : [],
  };
}

/** Pinned rail: vertical scroll drives the track sideways while the traveler strings the cable behind it. */
function buildRail(rail: RailElements): Cleanup {
  const { root, multiRoleStop } = rail;
  const setTravelerY = numberSetter(rail.traveler, 'y', 'px');
  const setMeNoteOpacity = numberSetter(rail.meNote, 'opacity');
  let timeline: gsap.core.Timeline | null = null;

  root.dataset.live = '';
  if (multiRoleStop) multiRoleStop.dataset.stage = '1';
  let geometry = measureRail(rail);

  const update = (): void => {
    if (!timeline) return;
    const x = geometry.startX + timeline.progress() * geometry.travel;
    setTravelerY(geometry.cableY(x));
    setMeNoteOpacity(Math.max(0, 1 - (x - geometry.startX) / RAIL.meNoteFadePx));
    for (const label of geometry.labels) markReached(label, x >= label.x - RAIL.reachSlackPx);
    if (!multiRoleStop) return;
    for (const column of geometry.roleColumns) markReached(column, x >= column.x);
    setGraphStage(multiRoleStop, Math.max(1, geometry.roleColumns.filter((column) => column.reached).length));
  };

  timeline = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate: update,
    scrollTrigger: {
      trigger: rail.stage,
      start: 'top top',
      end: () => {
        // ScrollTrigger reverts the pin before evaluating end, so this measures the fresh layout.
        geometry = measureRail(rail);
        return `+=${Math.round(geometry.travel * RAIL.scrollPerPx)}`;
      },
      pin: true,
      scrub: RAIL.scrub,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      // end() re-measures on every refresh; re-place the traveler and reached states on that geometry.
      onRefresh: update,
    },
  });
  timeline.to([rail.track, rail.builtSvg], { x: () => -geometry.travel, duration: 1 });
  for (const stop of rail.stops) addCrossingParallax(stop, timeline);
  update();

  return () => {
    resetRail(rail);
  };
}

/** Measures the rail, lays the cable over the cards and redraws it. */
function measureRail(rail: RailElements): RailGeometry {
  const railOrigin: Point = { x: rail.track.getBoundingClientRect().left, y: rail.stage.getBoundingClientRect().top };
  const cards = rail.stops.map((stop) => boxRelativeTo(stop, railOrigin));
  const cable = layoutCable(cards, rail.built.offsetTop);
  const labels = placeLabels(rail.labels, cable, railOrigin);
  drawCable(rail, cable, labels);
  return {
    startX: cable.start,
    travel: cable.end - cable.start,
    cableY: cable.yAt,
    labels,
    roleColumns: rail.roleColumns.map((element) => ({
      element,
      x: boxRelativeTo(element, railOrigin).left,
      reached: element.classList.contains(REACHED_CLASS),
    })),
  };
}

/** Hangs each label on the cable above its stop or role; the origin label sits beside the first tower. */
function placeLabels(labels: readonly HTMLElement[], cable: CableLayout, railOrigin: Point): RailLabel[] {
  return labels.map((element) => {
    const anchor = element.dataset.anchor;
    const isOrigin = anchor === ORIGIN_ANCHOR;
    const target = isOrigin || anchor === undefined ? null : document.getElementById(anchor);
    const box = target ? boxRelativeTo(target, railOrigin) : null;
    const x = box ? (box.left + box.right) / 2 : cable.start;
    const y = isOrigin ? cable.peakY : cable.yAt(x);
    element.style.left = `${tenths(isOrigin ? x - LABEL_OFFSET.originPx : x)}px`;
    element.style.top = `${tenths(cable.bandTop + (isOrigin ? y : y - LABEL_OFFSET.stationPx))}px`;
    return { element, x, y, isOrigin, reached: isOrigin || element.classList.contains(REACHED_CLASS) };
  });
}

/** Sizes both SVG layers to the track, redraws the planned and built cable and parks the traveler. */
function drawCable(rail: RailElements, cable: CableLayout, labels: readonly RailLabel[]): void {
  const trackWidth = Math.ceil(rail.track.scrollWidth);
  const bandHeight = tenths(cable.bandHeight);
  const startX = `${tenths(cable.start)}px`;
  sizeSvg(rail.plan, trackWidth, rail.stage.clientHeight);
  rail.plan.innerHTML = planMarkup(cable, labels);
  sizeSvg(rail.builtSvg, trackWidth, bandHeight);
  rail.builtSvg.innerHTML = builtMarkup(
    cable,
    labels.filter((label) => !label.isOrigin),
  );
  rail.built.style.width = startX;
  rail.built.style.height = `${bandHeight}px`;
  rail.traveler.style.left = startX;
}

function resetRail(rail: RailElements): void {
  delete rail.root.dataset.live;
  rail.plan.innerHTML = '';
  rail.builtSvg.innerHTML = '';
  for (const element of [...rail.labels, ...rail.roleColumns]) {
    element.classList.remove(REACHED_CLASS);
    element.style.left = '';
    element.style.top = '';
  }
  rail.built.style.width = '';
  rail.built.style.height = '';
  rail.traveler.style.left = '';
  rail.traveler.style.transform = '';
  rail.meNote.style.opacity = '';
}

/** x from the track's left edge, y from the stage's top edge. */
function boxRelativeTo(element: Element, railOrigin: Point): Box {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left - railOrigin.x,
    right: rect.right - railOrigin.x,
    top: rect.top - railOrigin.y,
    bottom: rect.bottom - railOrigin.y,
  };
}

function sizeSvg(svg: SVGSVGElement, width: number, height: number): void {
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
}

function markReached(milestone: Milestone, reached: boolean): void {
  if (milestone.reached === reached) return;
  milestone.reached = reached;
  milestone.element.classList.toggle(REACHED_CLASS, reached);
}

/** The access graph motif ghosts whatever belongs to a later stage. */
function setGraphStage(stop: HTMLElement, stage: number): void {
  const value = String(stage);
  if (stop.dataset.stage !== value) stop.dataset.stage = value;
}

function addCrossingParallax(stop: HTMLElement, railTimeline: gsap.core.Timeline): void {
  const crossing = () => ({ trigger: stop, containerAnimation: railTimeline, start: 'left right', end: 'right left', scrub: true });
  gsap.fromTo(query('.stop__org', stop), { x: PARALLAX.orgPx }, { x: -PARALLAX.orgPx, ease: 'none', scrollTrigger: crossing() });
  gsap.fromTo(query('.plate', stop), { x: -PARALLAX.platePx }, { x: PARALLAX.platePx, ease: 'none', scrollTrigger: crossing() });
}

/** Entrances for the intro, every stop, the terminal and the fine print; motif loops run only while in view. */
function buildReveals(root: HTMLElement, stops: readonly HTMLElement[], rail: boolean): Cleanup {
  const splits: SplitText[] = [];
  const splitChars: SplitChars = (element) => {
    const split = SplitText.create(element, { type: 'chars', mask: 'chars', charsClass: 'jy-ch', aria: 'auto' });
    splits.push(split);
    return split.chars;
  };
  const cleanups: Cleanup[] = [
    () => {
      for (const split of splits) split.revert();
    },
  ];
  cleanups.push(playOnEntry(query('[data-jy="intro"]', root), introTimeline(root, rail, splitChars)));
  for (const stop of stops) cleanups.push(playOnEntry(stop, stopTimeline(stop, rail, splitChars)));
  cleanups.push(playOnEntry(query('[data-jy="terminal"]', root), fadeUpTimeline(queryAll('.journey__terminal > *', root))));
  cleanups.push(playOnEntry(query('[data-jy="also"]', root), fadeUpTimeline(queryAll('.also__head, [data-jy="also-item"]', root))));
  cleanups.push(runMotifsWhileVisible(stops));
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

function introTimeline(root: HTMLElement, rail: boolean, splitChars: SplitChars): gsap.core.Timeline {
  const { title, copy, noteAt, origin } = INTRO;
  const timeline = gsap
    .timeline({ paused: true, defaults: { ease: REVEAL_EASE } })
    .from(
      splitChars(query('[data-jy="title"]', root)),
      { yPercent: CHAR_RISE_PERCENT, duration: title.duration, stagger: title.stagger },
      0,
    )
    .from(
      queryAll('.journey__eyebrow, .journey__lede', root),
      { autoAlpha: 0, y: copy.y, duration: copy.duration, stagger: copy.stagger },
      copy.at,
    );
  wipeIn(timeline, query('.journey__note', root), noteAt);
  if (!rail) timeline.from(query('.journey__origin', root), { autoAlpha: 0, x: origin.x, duration: origin.duration }, origin.at);
  return timeline;
}

/** A stop's entrance: in the stack layout its frame first, then its name, copy, handwriting and plate art. */
function stopTimeline(stop: HTMLElement, rail: boolean, splitChars: SplitChars): gsap.core.Timeline {
  const { org, meta, copy, lines, motifAt } = CARD_CONTENT;
  const timeline = gsap.timeline({ paused: true, defaults: { ease: REVEAL_EASE } });
  if (!rail) addStackFrame(stop, timeline);
  const cue = rail ? 0 : STACK_FRAME.contentDelay;
  fromAny(
    timeline,
    splitChars(query('[data-jy="org"]', stop)),
    { yPercent: CHAR_RISE_PERCENT, duration: org.duration, stagger: org.stagger },
    cue,
  );
  fromAny(timeline, queryAll('.stop__meta', stop), { autoAlpha: 0, y: meta.y, duration: meta.duration }, cue);
  fromAny(
    timeline,
    queryAll('.stop__title, .stop__detail, .role__when, .role__title, .role__detail', stop),
    { autoAlpha: 0, y: copy.y, duration: copy.duration, stagger: copy.stagger },
    cue + copy.at,
  );
  const handwriting = queryAll('.stop__line, .role__line', stop);
  if (handwriting.length > 0) wipeIn(timeline, handwriting, cue + lines.at, { stagger: lines.stagger });
  addMotifIntro(stop, timeline, cue + motifAt, rail);
  return timeline;
}

function addStackFrame(stop: HTMLElement, timeline: gsap.core.Timeline): void {
  const { rise, segment, pin, roleRules } = STACK_FRAME;
  const card = query('.stop__card', stop);
  const radius = getComputedStyle(card).borderTopLeftRadius || '0px';
  timeline
    .fromTo(
      card,
      { y: rise.y, clipPath: `inset(${rise.hiddenInset} round ${radius})` },
      { y: 0, clipPath: `inset(${rise.shownInset} round ${radius})`, duration: rise.duration },
      0,
    )
    .fromTo(
      query('.stop__seg', stop),
      { scaleY: 0 },
      { scaleY: 1, transformOrigin: '50% 0%', duration: segment.duration, ease: 'power2.inOut' },
      0,
    )
    .from(query('.stop__pin', stop), { scale: 0, duration: pin.duration, ease: 'back.out(3)' }, pin.at);
  fromAny(
    timeline,
    queryAll('.role__rule', stop),
    { scaleX: 0, transformOrigin: '0% 50%', duration: roleRules.duration, stagger: roleRules.stagger },
    roleRules.at,
  );
}

function addMotifIntro(stop: HTMLElement, timeline: gsap.core.Timeline, cue: number, rail: boolean): void {
  const motif = stop.dataset.motif;
  if (motif === 'graph') {
    if (!rail) addGraphBuild(stop, timeline, cue + GRAPH_BUILD.delay);
    return;
  }
  if (!isIntroMotif(motif)) return;
  for (const step of MOTIF_INTROS[motif]) {
    const targets = queryAll(step.selector, stop);
    if (targets.length === 0) continue;
    const position = cue + (step.delay ?? 0);
    if (step.kind === 'draw') {
      timeline.fromTo(targets, { strokeDashoffset: DRAW.hiddenOffset }, { strokeDashoffset: 0, ease: DRAW.ease, ...step.vars }, position);
    } else {
      timeline.from(targets, { ...step.vars }, position);
    }
  }
}

function addGraphBuild(stop: HTMLElement, timeline: gsap.core.Timeline, position: number): void {
  stop.dataset.stage = '0';
  const progress = { stage: 0 };
  timeline.to(
    progress,
    {
      stage: GRAPH_BUILD.stages,
      duration: GRAPH_BUILD.duration,
      ease: 'none',
      onUpdate: () => setGraphStage(stop, Math.ceil(progress.stage)),
    },
    position,
  );
}

function fadeUpTimeline(targets: readonly Element[]): gsap.core.Timeline {
  return gsap
    .timeline({ paused: true })
    .from(targets, { autoAlpha: 0, y: FADE_UP.y, duration: FADE_UP.duration, stagger: FADE_UP.stagger, ease: REVEAL_EASE });
}

function wipeIn(timeline: gsap.core.Timeline, targets: gsap.TweenTarget, position: number, extra: gsap.TweenVars = {}): void {
  timeline.fromTo(
    targets,
    { clipPath: WIPE.hidden },
    { clipPath: WIPE.shown, duration: WIPE.duration, ease: WIPE.ease, ...extra },
    position,
  );
}

/** Skips empty target lists, which GSAP warns about. */
function fromAny(timeline: gsap.core.Timeline, targets: readonly Element[], vars: gsap.TweenVars, position: number): void {
  if (targets.length > 0) timeline.from(targets, vars, position);
}

/** Plays on the way in; rewinds only when the element drops back out ahead of the reader. */
function playOnEntry(element: Element, timeline: gsap.core.Timeline): Cleanup {
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries.at(-1);
      if (!entry) return;
      if (entry.isIntersecting) timeline.play();
      else if (isAheadOfReader(entry)) timeline.reverse();
    },
    { rootMargin: REVEAL_ROOT_MARGIN },
  );
  observer.observe(element);
  return () => observer.disconnect();
}

function isAheadOfReader(entry: IntersectionObserverEntry): boolean {
  const viewport = entry.rootBounds;
  return viewport !== null && (entry.boundingClientRect.top >= viewport.bottom || entry.boundingClientRect.left >= viewport.right);
}

function runMotifsWhileVisible(stops: readonly HTMLElement[]): Cleanup {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) entry.target.classList.toggle(LIVE_CLASS, entry.isIntersecting);
    },
    { rootMargin: LIVE_ROOT_MARGIN },
  );
  for (const stop of stops) observer.observe(stop);
  return () => {
    observer.disconnect();
    for (const stop of stops) stop.classList.remove(LIVE_CLASS);
  };
}

/** Tilts the card toward the pointer and nudges its plate art the other way. */
function bindTilt(card: HTMLElement): Cleanup {
  const art = query<SVGSVGElement>('.plate__art > svg', card);
  const smoothing = { duration: TILT.duration, ease: 'power3.out' };
  gsap.set(card, { transformPerspective: TILT.perspectivePx, transformOrigin: '50% 0%' });
  const toRotationX = gsap.quickTo(card, 'rotationX', smoothing);
  const toRotationY = gsap.quickTo(card, 'rotationY', smoothing);
  const toArtX = gsap.quickTo(art, 'x', smoothing);
  const toArtY = gsap.quickTo(art, 'y', smoothing);
  const onMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    const rect = card.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
    toRotationY(offsetX * TILT.rotationYDeg);
    toRotationX(offsetY * TILT.rotationXDeg);
    toArtX(offsetX * TILT.artShiftXPx);
    toArtY(offsetY * TILT.artShiftYPx);
  };
  const onLeave = (): void => {
    toRotationX(0);
    toRotationY(0);
    toArtX(0);
    toArtY(0);
  };
  card.addEventListener('pointermove', onMove);
  card.addEventListener('pointerleave', onLeave);
  return () => {
    card.removeEventListener('pointermove', onMove);
    card.removeEventListener('pointerleave', onLeave);
  };
}

function isIntroMotif(motif: string | undefined): motif is IntroMotif {
  return motif !== undefined && Object.hasOwn(MOTIF_INTROS, motif);
}

/** gsap types quickSetter as a bare Function; this narrows it to the numeric setter it returns here. */
function numberSetter(target: Element, property: string, unit?: string): (value: number) => void {
  const set = gsap.quickSetter(target, property, unit);
  return (value) => {
    set(value);
  };
}
