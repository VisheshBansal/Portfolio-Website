/**
 * Travel globe, modelled on GitHub's: it auto-rotates while arcs rise between visited places (mostly from HUBS) and
 * ripple where they land. Hovering or tapping a pin or an arc shows its card, and rotation holds while the pointer is on
 * the globe. Drag to spin; the motion can be paused. Reduced motion shows a still globe with every pin; without WebGL2
 * the plain list shows instead.
 */
import { finePointer, gsap, reducedMotion } from '../../lib/motion';
import { query, queryAll, readDataset, setText } from '../../lib/dom';
import { createGlobe, FLIGHT_SECONDS, type Globe, type Hit } from '../../lib/webgl/globe';
import { places, type Place } from '../../data/travel';

/** Hub cities: most arcs start from one of these. */
const HUBS = ['Delhi', 'Dallas'];
const HUB_SHARE = 0.6;
/** Arcs from here run cool, teal to ice; every other arc runs warm. */
const COOL_FROM = 'Dallas';
/** Seconds between new arcs on average; each wait is jittered by this share so launches never tick like a clock. */
const EMIT = { every: 0.9, jitter: 0.45 } as const;
/** Hops shorter than this many degrees are skipped: they would barely leave the ground. */
const MIN_ARC_DEG = 6;
/** Degrees per second the globe turns by itself, and the latitude it settles to. */
const SPIN = { speed: 4, lat: 22, settle: 1.2 } as const;
/** Where a still globe (no motion) looks: most of the pins. */
const STILL_VIEW = { lat: 24, lon: 72 } as const;
/** Seconds after a drag before the globe turns by itself again. */
const IDLE_RESUME = 2;
const DRAG_DEG_PER_PX = 0.3;
const LAT_LIMIT = 70;
/** Pointer travel, in CSS pixels, below which a press counts as a tap. */
const TAP_SLOP = 5;
/** How long a tapped name stays up. */
const TAP_TIP_MS = 2600;
/** The tip keeps this far from the pointer, and at least this far inside the globe's box. */
const TIP = { offset: 14, inset: 6 } as const;
const EARTH_KM = 6371;
const COUNT_UP = { duration: 1.4, start: 'top 75%' } as const;

const DEG = Math.PI / 180;
const angleBetween = (a: Place, b: Place) =>
  Math.acos(
    Math.min(
      1,
      Math.sin(a.lat * DEG) * Math.sin(b.lat * DEG) + Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.cos((b.lon - a.lon) * DEG),
    ),
  );
const kilometres = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const indexOfPlace = (name: string) => places.findIndex((place) => place.name === name);

export function initPlaces(): void {
  const section = query('[data-places]');
  countUpOnEnter(section);

  const wrap = query('[data-globe-wrap]', section);
  const hubs = HUBS.map(indexOfPlace).filter((index) => index >= 0);
  let sky: ReturnType<typeof createSky> | null = null;
  let rehover: (() => void) | null = null;
  const globe = createGlobe(query<HTMLCanvasElement>('[data-globe]', wrap), {
    places,
    hubs,
    animate: !reducedMotion,
    onFrame: (delta) => {
      sky?.tick(delta);
      rehover?.();
    },
    onLost: () => showList(section),
  });
  if (!globe) {
    showList(section);
    return;
  }
  if (reducedMotion) {
    globe.state.lat = STILL_VIEW.lat;
    globe.state.lon = STILL_VIEW.lon;
    globe.render();
  }

  const hint = query('[data-globe-hint]', section);
  if (!finePointer) setText(hint, readDataset(hint, 'touch'));
  hint.hidden = false;

  const activeSky = createSky(globe, hubs);
  sky = activeSky;
  rehover = bindPointer(wrap, globe, activeSky, createTip(wrap, globe));
  // Without a running loop (reduced motion, or paused) nothing else redraws after a resize.
  new ResizeObserver(() => {
    if (activeSky.still()) globe.render();
  }).observe(wrap);
  if (!reducedMotion) bindPause(query<HTMLButtonElement>('[data-tour-toggle]', section), globe, activeSky);
}

/** No globe to look at (no WebGL2, or the GPU gave up): the plain list carries the section. */
function showList(section: HTMLElement): void {
  for (const element of queryAll('.places__stage, [data-globe-hint], [data-tour-toggle]', section)) element.hidden = true;
  query('[data-places-list]', section).setAttribute('data-flat', '');
}

/** The headline numbers count up the first time the section comes into view. */
function countUpOnEnter(section: HTMLElement): void {
  if (reducedMotion) return;
  for (const number of queryAll('[data-count-to]', section)) {
    const value = { n: 0 };
    const to = Number(number.dataset.countTo);
    setText(number, '0');
    gsap.to(value, {
      n: to,
      duration: COUNT_UP.duration,
      ease: 'power2.out',
      snap: { n: 1 },
      onUpdate: () => setText(number, String(value.n)),
      scrollTrigger: { trigger: section, start: COUNT_UP.start, once: true },
    });
  }
}

/** Arcs in the air, and the globe's own turning. */
function createSky(globe: Globe, hubs: readonly number[]) {
  const state = globe.state;
  const coolFrom = indexOfPlace(COOL_FROM);
  const anyPlace = () => Math.floor(Math.random() * places.length);
  let untilEmit = 0;
  let holds = 0;
  let idle = -1;
  let paused = false;

  /** A route worth drawing: from a hub most of the time, never a hop too short to lift. */
  const route = (): [number, number] | null => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const from = Math.random() < HUB_SHARE ? (hubs[Math.floor(Math.random() * hubs.length)] ?? anyPlace()) : anyPlace();
      const to = anyPlace();
      const [a, b] = [places[from], places[to]];
      if (a && b && from !== to && angleBetween(a, b) >= MIN_ARC_DEG * DEG) return [from, to];
    }
    return null;
  };

  return {
    tick(delta: number) {
      state.flights.forEach((flight, slot) => {
        if (!flight) return;
        flight.age += delta;
        if (flight.age >= FLIGHT_SECONDS) state.flights[slot] = null;
      });
      untilEmit -= delta;
      const slot = state.flights.indexOf(null);
      const next = untilEmit <= 0 && slot >= 0 ? route() : null;
      if (next) {
        state.flights[slot] = { from: next[0], to: next[1], tone: next[0] === coolFrom ? 'cool' : 'warm', age: 0 };
        untilEmit = EMIT.every * (1 + EMIT.jitter * (2 * Math.random() - 1));
      }
      if (idle >= 0) {
        idle += delta;
        if (idle >= IDLE_RESUME) idle = -1;
      }
      if (holds === 0 && idle < 0) {
        state.lon += SPIN.speed * delta;
        state.lat += (SPIN.lat - state.lat) * (1 - Math.exp(-delta / SPIN.settle));
      }
    },
    /** While held (pointer on the globe, or a drag) the globe stops turning by itself. */
    hold(on: boolean) {
      holds = Math.max(0, holds + (on ? 1 : -1));
      if (!on) idle = 0;
    },
    nudge(dx: number, dy: number) {
      state.lon -= dx * DRAG_DEG_PER_PX;
      state.lat = Math.max(-LAT_LIMIT, Math.min(LAT_LIMIT, state.lat + dy * DRAG_DEG_PER_PX));
      if (reducedMotion || paused) globe.render();
    },
    setPaused(value: boolean) {
      paused = value;
    },
    /** Nothing is animating, so a change must draw itself. */
    still: () => reducedMotion || paused,
  };
}

interface Tip {
  show(hit: Hit, x: number, y: number): void;
  hide(): void;
}

/** The little card that names a pin or an arc beside the pointer. */
function createTip(wrap: HTMLElement, globe: Globe): Tip {
  const tip = query('[data-globe-tip]', wrap);
  const main = query('[data-tip-main]', tip);
  const sub = query('[data-tip-sub]', tip);
  let shown = '';
  let size = { width: 0, height: 0 };
  return {
    show(hit, x, y) {
      // Arcs are keyed by route, not slot: a slot is reused for a new route as soon as its arc lands.
      const flight = 'arc' in hit ? globe.state.flights[hit.arc] : null;
      const key = 'pin' in hit ? `p${hit.pin}` : `a${flight?.from ?? -1}-${flight?.to ?? -1}`;
      if (key !== shown) {
        shown = key;
        const [title, detail] = describe(hit);
        setText(main, title);
        setText(sub, detail);
        size = { width: tip.offsetWidth, height: tip.offsetHeight };
      }
      const left = Math.min(Math.max(x + TIP.offset, TIP.inset), wrap.clientWidth - size.width - TIP.inset);
      const top = Math.max(y - TIP.offset - size.height, TIP.inset);
      tip.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
      tip.setAttribute('data-on', '');
    },
    hide() {
      shown = '';
      tip.removeAttribute('data-on');
    },
  };

  function describe(hit: Hit): [string, string] {
    if ('pin' in hit) {
      const place = places[hit.pin];
      // A city-state names itself once.
      return place ? [place.name, place.country === place.name ? '' : place.country] : ['', ''];
    }
    const flight = globe.state.flights[hit.arc];
    const [from, to] = [flight && places[flight.from], flight && places[flight.to]];
    return from && to ? [`${from.name} → ${to.name}`, `${kilometres.format(angleBetween(from, to) * EARTH_KM)} km`] : ['', ''];
  }
}

/**
 * Hover names what is under the mouse; a press either spins the globe or, if it barely moves, taps to name. Returns a
 * per-frame refresh: arcs come and go under a resting mouse, so its hover is read again.
 */
function bindPointer(wrap: HTMLElement, globe: Globe, sky: ReturnType<typeof createSky>, tip: Tip): () => void {
  /** One pointer drives a press; a second finger on the globe is ignored rather than double-counted. */
  let press: { id: number; x: number; y: number; moved: number } | null = null;
  let tapTimer = 0;
  /** Where the mouse rests over the globe, or null when it is elsewhere. */
  let hover: { x: number; y: number } | null = null;

  const local = (event: PointerEvent) => {
    const box = wrap.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  const point = (x: number, y: number) => {
    const hit = globe.hitTest(x, y);
    const active = hit && 'pin' in hit ? hit.pin : -1;
    if (active !== globe.state.active) {
      globe.state.active = active;
      if (sky.still()) globe.render();
    }
    if (hit) tip.show(hit, x, y);
    else tip.hide();
  };

  wrap.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') sky.hold(true);
  });
  wrap.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return;
    hover = null;
    sky.hold(false);
    globe.state.active = -1;
    tip.hide();
    if (sky.still()) globe.render();
  });
  wrap.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || press) return;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: 0 };
    wrap.setPointerCapture(event.pointerId);
    if (event.pointerType !== 'mouse') sky.hold(true);
  });
  wrap.addEventListener('pointermove', (event) => {
    if (press) {
      if (event.pointerId !== press.id) return;
      const [dx, dy] = [event.clientX - press.x, event.clientY - press.y];
      press = { ...press, x: event.clientX, y: event.clientY, moved: press.moved + Math.hypot(dx, dy) };
      // A drag drops the hover with its card; the rehover or the next move brings it back.
      globe.state.active = -1;
      sky.nudge(dx, dy);
      tip.hide();
      return;
    }
    if (event.pointerType === 'mouse') {
      hover = local(event);
      point(hover.x, hover.y);
    }
  });
  const release = (event: PointerEvent) => {
    if (!press || event.pointerId !== press.id) return;
    const tapped = press.moved < TAP_SLOP;
    press = null;
    if (event.pointerType === 'mouse') hover = local(event);
    else sky.hold(false);
    if (!tapped) return;
    const { x, y } = local(event);
    point(x, y);
    window.clearTimeout(tapTimer);
    if (event.pointerType !== 'mouse') {
      tapTimer = window.setTimeout(() => {
        tip.hide();
        globe.state.active = -1;
        if (sky.still()) globe.render();
      }, TAP_TIP_MS);
    }
  };
  wrap.addEventListener('pointerup', release);
  wrap.addEventListener('pointercancel', (event) => {
    if (!press || event.pointerId !== press.id) return;
    press = null;
    if (event.pointerType !== 'mouse') sky.hold(false);
  });
  return () => {
    if (hover && !press) point(hover.x, hover.y);
  };
}

/** Pause and play for the motion (WCAG 2.2.2); a paused globe still answers drags and hovers. */
function bindPause(toggle: HTMLButtonElement, globe: Globe, sky: ReturnType<typeof createSky>): void {
  let paused = false;
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    paused = !paused;
    sky.setPaused(paused);
    globe.setPaused(paused);
    setText(toggle, readDataset(toggle, paused ? 'play' : 'pause'));
  });
}
