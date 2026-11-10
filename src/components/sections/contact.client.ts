/**
 * Contact section: the live local clock, the access-request card and the scroll choreography
 * (a pinned iris on wide screens, a scrubbed flow elsewhere).
 */
import { gsap, ScrollTrigger, SplitText, reducedMotion, finePointer, fontsReady, lenis } from '../../lib/motion';
import { SECOND_MS, startClock } from '../../lib/clock';
import { focusTarget, isPlainClick, query, queryAll, readDataset, setText } from '../../lib/dom';
import { rollText } from '../../lib/text';

/** Wide screens pin the stage for this many viewport heights; the timeline runs on a 0..1 scale of it. */
const PIN = { viewportHeights: 1.3, scrub: 0.8, endHold: 0.02 } as const;
const FLOW = { scrub: 0.6, titleScale: 1.3, panelEnd: 'top 25%', titleEnd: 'top 30%', revealStart: 'top 92%' } as const;
const LAYOUT_QUERIES = {
  wide: '(min-width: 1024px) and (min-height: 640px)',
  narrow: '(max-width: 1023.98px), (max-height: 639.98px)',
} as const;
const CLIP = {
  irisClosed: 'inset(15% 33% 15% 33% round 36px)',
  irisOpen: 'inset(0% 0% 0% 0% round 0px)',
  panelInset: 'inset(64px 5% 0px 5% round 32px)',
  panelFull: 'inset(0px 0% 0px 0% round 0px)',
  noteHidden: 'inset(-40% 100% -40% -6%)',
  noteShown: 'inset(-40% -6% -40% -6%)',
} as const;
/** The pinned title starts centred, scaled to roughly fill the viewport height within these bounds. */
const TITLE_START = { minScale: 2, maxScale: 3.4, viewportFill: 1.05 } as const;
/** Title characters start fanned out from their line's centre by this many ems per character. */
const CHAR_SPREAD_EM = 0.1;
const FALLBACK_FONT_SIZE_PX = 100;
const CHAR_CLASS = 'contact__char';

/** Overshoot allowed, in px, when checking that the panel fits the viewport well enough to pin. */
const FIT_TOLERANCE_PX = 1;
/** Scroll targets land this far past the pin end, where the card is fully open. */
const PAST_PIN_END_PX = 1;
/** Focus inside a pinned panel that is not this far along skips to the finished card. */
const FOCUS_SKIP_PROGRESS = 0.92;
const FOCUS_REVEAL_S = 0.3;
const SMOOTH_SCROLL_S = 1.6;
const RESIZE_DEBOUNCE_MS = 200;
const CONTACT_HASH = '#contact';
const CONTACT_LINK = `a[href="${CONTACT_HASH}"]`;

const HOURS_PER_DAY = 24;
const WAKE_HOUR = 7;
const BED_HOUR = 23;

const SUBJECT_OPTIONS = 'input[name="subject"]';
const DEFAULT_SUBJECT = 'Access request: Just say hi';
const REQUEST_ID_RANGE = { min: 1000, max: 9999 } as const;
/** Gap between clearing and filling the live region, so repeated messages are announced again. */
const ANNOUNCE_DELAY_MS = 60;
const COPY_FEEDBACK_MS = { copied: 2400, revealed: 8000 } as const;
const ROLL = { fromYPercent: 80, duration: 0.55 } as const;
const SEND = { flyPx: 26, flyOutS: 0.22, flyInS: 0.6, scanS: 1, scanFadeS: 0.3 } as const;
const MAGNET = { duration: 0.7, pullX: 0.16, pullY: 0.28 } as const;

interface Mood {
  /** The status applies while the local hour is below this. */
  readonly beforeHour: number;
  readonly status: string;
}

const MOODS: readonly Mood[] = [
  { beforeHour: WAKE_HOUR, status: 'Probably asleep' },
  { beforeHour: 9, status: 'Probably on coffee one' },
  { beforeHour: 18, status: 'Probably shipping' },
  { beforeHour: BED_HOUR, status: 'Probably still online' },
  { beforeHour: HOURS_PER_DAY, status: 'Should be asleep' },
];

type ScrollMode = 'instant' | 'smooth';

/** The pinned trigger exists only while the wide layout is active. */
interface PinState {
  trigger: ScrollTrigger | undefined;
}

/** Everything the scroll choreography animates, looked up once. */
interface Scene {
  readonly section: HTMLElement;
  readonly stage: HTMLElement;
  readonly panel: HTMLElement;
  readonly inner: HTMLElement;
  readonly title: HTMLElement;
  /** Split characters, grouped per title line. */
  readonly lineChars: readonly HTMLElement[][];
  readonly meta: HTMLElement;
  readonly note: HTMLElement;
  readonly pitch: HTMLElement;
  readonly card: HTMLElement;
  readonly scanline: HTMLElement;
  readonly arrowPaths: readonly SVGPathElement[];
  readonly identityRows: readonly HTMLElement[];
  /** Fade up one by one in the flowing layout. */
  readonly fadeIns: readonly HTMLElement[];
}

interface TitleStart {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export function initContact(): void {
  const section = query('[data-contact]');
  startLocalClock(section);
  bindAccessRequest(query<HTMLFormElement>('[data-form]', section));
  if (!reducedMotion) startMotion(section);
}

/** Live clock in the section's timezone (data-tz), plus a status line chosen by the hour. */
function startLocalClock(section: HTMLElement): void {
  const timeZone = readDataset(section, 'tz');
  const clock = query('[data-clock]', section);
  const zone = query('[data-zone]', section);
  const status = query('[data-status]', section);
  const dot = query('[data-dot]', section);
  const timeFormat = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone });

  startClock(timeZone, SECOND_MS, (time) => {
    // Normalise the narrow no-break space some engines put before AM/PM.
    clock.textContent = timeFormat.format(time.date).replace(/\s/g, ' ');
    if (time.zone) setText(zone, time.zone);
    setText(status, MOODS.find((mood) => time.hour < mood.beforeHour)?.status ?? '');
    const mood = time.hour >= WAKE_HOUR && time.hour < BED_HOUR ? 'awake' : 'asleep';
    if (dot.dataset.mood !== mood) dot.dataset.mood = mood;
  });
}

function bindAccessRequest(form: HTMLFormElement): void {
  const email = readDataset(form, 'email');
  const live = query('[data-live]', form);
  query('[data-req-id]', form).textContent = randomRequestId();
  previewPolicy(form);
  countCharacters(form);
  bindSubmit(form, email, live);
  bindCopyButton(query<HTMLButtonElement>('[data-copy]', form), email, live);
  if (finePointer && !reducedMotion) bindMagneticButton(query<HTMLButtonElement>('[data-btn]', form));
}

/** Choosing an access type rolls its duration and risk into the policy lines. */
function previewPolicy(form: HTMLFormElement): void {
  const duration = query('[data-out-duration]', form);
  const risk = query('[data-out-risk]', form);
  for (const option of queryAll<HTMLInputElement>(SUBJECT_OPTIONS, form)) {
    option.addEventListener('change', () => {
      rollText(duration, option.dataset.duration ?? '', ROLL);
      rollText(risk, option.dataset.risk ?? '', ROLL);
    });
  }
}

function countCharacters(form: HTMLFormElement): void {
  const justification = query<HTMLTextAreaElement>('[data-body]', form);
  const count = query('[data-count]', form);
  justification.addEventListener('input', () => {
    count.textContent = String(justification.value.length);
  });
}

/** Opens the visitor's mail app with the request prefilled, then marks the card pending. */
function bindSubmit(form: HTMLFormElement, email: string, live: HTMLElement): void {
  const options = queryAll<HTMLInputElement>(SUBJECT_OPTIONS, form);
  const justification = query<HTMLTextAreaElement>('[data-body]', form);
  const status = query('[data-req-status]', form);
  const statusText = query('[data-req-status-text]', form);
  const arrowIcon = query<SVGElement>('[data-fly]', form);
  const scanline = query('[data-scan]', form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const subject = options.find((option) => option.checked)?.value ?? DEFAULT_SUBJECT;
    window.location.href = mailtoUrl(email, subject, justification.value);
    status.dataset.state = 'pending';
    statusText.textContent = 'Pending approval';
    announce(live, `Request drafted in your mail app: ${subject}. Typical approval time: under 24 hours.`);
    if (!reducedMotion) playSendFeedback(arrowIcon, scanline);
  });
}

/** RFC 6068: percent-encoded fields and CRLF line breaks; an empty body is left out. */
function mailtoUrl(email: string, subject: string, body: string): string {
  const text = body.trim().replace(/\r?\n/g, '\r\n');
  const bodyParam = text ? `&body=${encodeURIComponent(text)}` : '';
  return `mailto:${email}?subject=${encodeURIComponent(subject)}${bodyParam}`;
}

/** The arrow flies out and back while a scanline sweeps the card. */
function playSendFeedback(arrowIcon: SVGElement, scanline: HTMLElement): void {
  gsap
    .timeline()
    .to(arrowIcon, { x: SEND.flyPx, opacity: 0, duration: SEND.flyOutS, ease: 'power2.in' })
    .fromTo(arrowIcon, { x: -SEND.flyPx }, { x: 0, opacity: 1, duration: SEND.flyInS, ease: 'expo.out', clearProps: 'transform,opacity' });
  gsap
    .timeline()
    .fromTo(scanline, { yPercent: -100, opacity: 1 }, { yPercent: 0, duration: SEND.scanS, ease: 'power2.inOut' })
    .to(scanline, { opacity: 0, duration: SEND.scanFadeS });
}

/** Copies the address. Without clipboard access the button shows the address itself, for longer. */
function bindCopyButton(button: HTMLButtonElement, email: string, live: HTMLElement): void {
  const feedback = query('[data-copy-done]', button);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  const copyAddress = async () => {
    const copied = await writeClipboard(email);
    feedback.textContent = copied ? 'Copied' : email;
    button.setAttribute('data-copied', '');
    announce(live, copied ? `Copied ${email} to your clipboard.` : `My address is ${email}.`);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => button.removeAttribute('data-copied'), copied ? COPY_FEEDBACK_MS.copied : COPY_FEEDBACK_MS.revealed);
  };
  button.addEventListener('click', () => void copyAddress());
}

/** False when the Clipboard API is missing (insecure context) or the write is refused. */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** The submit button leans toward a fine pointer. */
function bindMagneticButton(button: HTMLButtonElement): void {
  const toX = gsap.quickTo(button, 'x', { duration: MAGNET.duration, ease: 'power3.out' });
  const toY = gsap.quickTo(button, 'y', { duration: MAGNET.duration, ease: 'power3.out' });
  button.addEventListener('pointermove', (event) => {
    const bounds = button.getBoundingClientRect();
    toX((event.clientX - bounds.left - bounds.width / 2) * MAGNET.pullX);
    toY((event.clientY - bounds.top - bounds.height / 2) * MAGNET.pullY);
  });
  button.addEventListener('pointerleave', () => {
    toX(0);
    toY(0);
  });
}

function startMotion(section: HTMLElement): void {
  const pin: PinState = { trigger: undefined };
  bindContactLinks(section, pin);
  void fontsReady().then(() => {
    const scene = collectScene(section);
    animatePerLayout(scene, pin);
    skipAheadOnFocus(scene, pin);
    ScrollTrigger.refresh();
  });
}

/**
 * In-page links to the section land on the finished card rather than the closed iris. Listens in the
 * capture phase, so the generic anchor glide in lib/motion sees the click as handled.
 */
function bindContactLinks(section: HTMLElement, pin: PinState): void {
  document.addEventListener(
    'click',
    (event) => {
      if (!pin.trigger || !isPlainClick(event) || !(event.target instanceof Element) || !event.target.closest(CONTACT_LINK)) return;
      event.preventDefault();
      history.replaceState(null, '', CONTACT_HASH);
      landOnCard(pin, 'smooth', () => focusTarget(section));
    },
    { capture: true },
  );
}

function collectScene(section: HTMLElement): Scene {
  const title = query('[data-title]', section);
  const meta = query('[data-meta]', section);
  const note = query('[data-note]', section);
  const pitch = query('[data-pitch]', section);
  const card = query('[data-card]', section);
  const identityRows = queryAll('[data-id-row]', section);
  return {
    section,
    stage: query('[data-stage]', section),
    panel: query('[data-panel]', section),
    inner: query('[data-inner]', section),
    title,
    lineChars: splitTitleLines(title),
    meta,
    note,
    pitch,
    card,
    scanline: query('[data-scan]', section),
    arrowPaths: queryAll<SVGPathElement>('[data-draw]', section),
    identityRows,
    fadeIns: [meta, note, pitch, card, ...identityRows],
  };
}

function splitTitleLines(title: HTMLElement): HTMLElement[][] {
  new SplitText(title, { type: 'chars', charsClass: CHAR_CLASS, tag: 'span', aria: 'none' });
  return queryAll('[data-line]', title).map((line) => queryAll(`.${CHAR_CLASS}`, line));
}

/**
 * Pins only when the layout is wide and the whole panel fits on screen. gsap.matchMedia rebuilds when a
 * breakpoint flips; whether the panel fits has no media query, so a resize re-checks it.
 */
function animatePerLayout(scene: Scene, pin: PinState): void {
  let coldLoad = true;
  const build = () => {
    const layouts = gsap.matchMedia();
    layouts.add(LAYOUT_QUERIES, (context) => {
      if (context.conditions?.wide && fitsViewport(scene.inner)) pin.trigger = buildPinnedTimeline(scene);
      else buildFlow(scene);
      if (coldLoad && pin.trigger && window.location.hash === CONTACT_HASH) requestAnimationFrame(() => landOnCard(pin, 'instant'));
      return () => {
        pin.trigger = undefined;
      };
    });
    return layouts;
  };
  let layouts = build();
  coldLoad = false;

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const wantsPin = window.matchMedia(LAYOUT_QUERIES.wide).matches && fitsViewport(scene.inner);
      if (wantsPin === Boolean(pin.trigger)) return;
      layouts.revert();
      layouts = build();
      ScrollTrigger.refresh();
    }, RESIZE_DEBOUNCE_MS);
  });
}

function fitsViewport(inner: HTMLElement): boolean {
  return inner.offsetHeight <= window.innerHeight + FIT_TOLERANCE_PX;
}

/** Pinned: the panel opens like an iris while the oversized title flies into place, then the card assembles. */
function buildPinnedTimeline(scene: Scene): ScrollTrigger | undefined {
  const { stage, panel, title, lineChars, meta, card, pitch, identityRows, note, arrowPaths, scanline } = scene;
  const titleStart = () => measureTitleStart(title, stage);
  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: stage,
      start: 'top top',
      end: () => `+=${Math.round(window.innerHeight * PIN.viewportHeights)}`,
      pin: true,
      scrub: PIN.scrub,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  timeline
    .fromTo(panel, { clipPath: CLIP.irisClosed }, { clipPath: CLIP.irisOpen, duration: 0.6, ease: 'power2.inOut' }, 0)
    .fromTo(
      title,
      { x: () => titleStart().x, y: () => titleStart().y, scale: () => titleStart().scale },
      { x: 0, y: 0, scale: 1, duration: 0.72, ease: 'power3.inOut', force3D: false },
      0,
    );
  for (const chars of lineChars) {
    timeline.fromTo(chars, { x: fanOut(title, chars.length) }, { x: 0, duration: 0.62, ease: 'power3.inOut', force3D: false }, 0.04);
  }
  timeline
    .fromTo(meta, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' }, 0.5)
    .fromTo(
      card,
      { opacity: 0, y: 110, rotateX: 16, transformPerspective: 1400 },
      { opacity: 1, y: 0, rotateX: 0, duration: 0.42, ease: 'power3.out' },
      0.5,
    )
    .fromTo(pitch, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.26, ease: 'power2.out' }, 0.58)
    .fromTo(identityRows, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.26, stagger: 0.035, ease: 'power2.out' }, 0.62)
    .fromTo(note, { clipPath: CLIP.noteHidden }, { clipPath: CLIP.noteShown, duration: 0.18 }, 0.74)
    .fromTo(arrowPaths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.12, stagger: 0.05 }, 0.84)
    .fromTo(scanline, { yPercent: -100, opacity: 1 }, { yPercent: 0, duration: 0.14, ease: 'power1.inOut' }, 0.84)
    .to(scanline, { opacity: 0, duration: 0.03 }, 0.98)
    // The finished card rests briefly before the pin releases.
    .to({}, { duration: PIN.endHold });
  return timeline.scrollTrigger;
}

/** Flowing: the same beats, scrubbed as the panel scrolls in, with no pin. */
function buildFlow(scene: Scene): void {
  const { section, panel, title, lineChars, note, arrowPaths, fadeIns } = scene;
  const scrubbed = { start: 'top bottom', scrub: FLOW.scrub };
  gsap.fromTo(
    panel,
    { clipPath: CLIP.panelInset },
    { clipPath: CLIP.panelFull, ease: 'none', scrollTrigger: { ...scrubbed, trigger: section, end: FLOW.panelEnd } },
  );
  gsap.fromTo(
    title,
    { scale: FLOW.titleScale, transformOrigin: '0% 50%' },
    { scale: 1, ease: 'none', force3D: false, scrollTrigger: { ...scrubbed, trigger: title, end: FLOW.titleEnd } },
  );
  for (const chars of lineChars) {
    gsap.fromTo(
      chars,
      { x: fanOut(title, chars.length) },
      { x: 0, ease: 'none', force3D: false, scrollTrigger: { ...scrubbed, trigger: title, end: FLOW.titleEnd, invalidateOnRefresh: true } },
    );
  }
  for (const element of fadeIns) {
    gsap.fromTo(
      element,
      { opacity: 0, y: 36 },
      { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: element, start: FLOW.revealStart, once: true } },
    );
  }
  gsap.fromTo(
    arrowPaths,
    { strokeDashoffset: 1 },
    {
      strokeDashoffset: 0,
      duration: 0.7,
      delay: 0.35,
      stagger: 0.18,
      ease: 'power2.out',
      scrollTrigger: { trigger: note, start: FLOW.revealStart, once: true },
    },
  );
}

/** Keyboard users skip straight to the finished state. */
function skipAheadOnFocus(scene: Scene, pin: PinState): void {
  scene.section.addEventListener('focusin', () => {
    if (!pin.trigger) gsap.to(scene.fadeIns, { opacity: 1, y: 0, duration: FOCUS_REVEAL_S, overwrite: 'auto' });
    else if (pin.trigger.progress < FOCUS_SKIP_PROGRESS) landOnCard(pin, 'instant');
  });
}

function landOnCard(pin: PinState, mode: ScrollMode, onComplete?: () => void): void {
  if (pin.trigger) scrollToOffset(pin.trigger.end + PAST_PIN_END_PX, mode, onComplete);
}

function scrollToOffset(top: number, mode: ScrollMode, onComplete: () => void = () => undefined): void {
  const smooth = mode === 'smooth';
  if (lenis) {
    lenis.scrollTo(top, smooth ? { duration: SMOOTH_SCROLL_S, onComplete } : { immediate: true, force: true, onComplete });
  } else {
    window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    onComplete();
  }
}

/** Centres the title on the stage and scales it up. Layout offsets ignore transforms, so this is safe mid-tween. */
function measureTitleStart(title: HTMLElement, stage: HTMLElement): TitleStart {
  const offset = offsetWithin(title, stage);
  const visibleHeight = Math.min(stage.offsetHeight, window.innerHeight);
  return {
    x: stage.offsetWidth / 2 - (offset.left + title.offsetWidth / 2),
    y: visibleHeight / 2 - (offset.top + title.offsetHeight / 2),
    scale: gsap.utils.clamp(TITLE_START.minScale, TITLE_START.maxScale, (visibleHeight * TITLE_START.viewportFill) / title.offsetHeight),
  };
}

function offsetWithin(element: HTMLElement, ancestor: HTMLElement): { left: number; top: number } {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = element;
  while (node && node !== ancestor) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
  }
  return { left, top };
}

/** Function-based gsap value: each character starts pushed away from its line's centre. */
function fanOut(title: HTMLElement, charCount: number): (index: number) => number {
  const centre = (charCount - 1) / 2;
  return (index) => (index - centre) * titleFontSize(title) * CHAR_SPREAD_EM;
}

function titleFontSize(title: HTMLElement): number {
  return Number.parseFloat(getComputedStyle(title).fontSize) || FALLBACK_FONT_SIZE_PX;
}

/** Clears the live region first so screen readers repeat identical messages. */
function announce(region: HTMLElement, message: string): void {
  region.textContent = '';
  setTimeout(() => {
    region.textContent = message;
  }, ANNOUNCE_DELAY_MS);
}

/** Cosmetic ticket number, new on every visit. */
function randomRequestId(): string {
  const { min, max } = REQUEST_ID_RANGE;
  return `REQ-${min + Math.floor(Math.random() * (max - min + 1))}`;
}
