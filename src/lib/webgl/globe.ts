/**
 * The travel globe, after GitHub's: a night planet in either theme, lit from the top left, with pale land dots, place
 * pins, and arcs of light that draw out between places, hold, then retract into where they land, with a ring at either
 * end. All points on an orthographic sphere, drawn by one WebGL2 program over the CSS disc that is the planet's body.
 * The caller drives the camera, the flights and the hover through `state`; this module draws and hit-tests.
 */
import { LAND } from './land';
import { createProgram, hexToRgb, loopWhileVisible, type Rgb } from './shared';

export interface LatLon {
  readonly lat: number;
  readonly lon: number;
}

/** Warm arcs run from the accent to white-hot, cool ones from teal to ice. */
export type Tone = 'warm' | 'cool';

export interface Flight {
  readonly from: number;
  readonly to: number;
  readonly tone: Tone;
  /** Seconds since launch; the flight is over at FLIGHT_SECONDS. */
  age: number;
}

export interface GlobeState {
  /** The point facing the viewer, in degrees. */
  lat: number;
  lon: number;
  /** Highlighted place, or -1. */
  active: number;
  /** One slot per arc that can be in the air at once; null is a free slot. */
  readonly flights: (Flight | null)[];
}

/** What sits under a point: a place pin, or the arc in a flight slot. */
export type Hit = { readonly pin: number } | { readonly arc: number };

export interface Globe {
  readonly state: GlobeState;
  /** The pin or lit arc under a point, in CSS pixels from the canvas's top left. Pins win over arcs. */
  hitTest(x: number, y: number): Hit | null;
  /** Stops or restarts the frame loop (a visitor's pause); a paused globe still renders on demand. */
  setPaused(paused: boolean): void;
  render(): void;
  destroy(): void;
}

export interface GlobeOptions {
  readonly places: readonly LatLon[];
  /** Places most arcs leave from: their pins draw larger, with a slow pulse. */
  readonly hubs: readonly number[];
  /** When false nothing runs by itself: change `state`, then call render(). */
  readonly animate: boolean;
  /** Runs before every animated frame with the seconds since the last one. */
  readonly onFrame?: (deltaSeconds: number) => void;
  /** Called if the GPU drops the context; the globe has stopped for good. */
  readonly onLost?: () => void;
}

/** A flight in seconds: the arc draws out to its destination, holds, then its tail follows it in. */
const FLIGHT = { draw: 1.5, hold: 0.5, retract: 1.2 } as const;
export const FLIGHT_SECONDS = FLIGHT.draw + FLIGHT.hold + FLIGHT.retract;
/** Arcs that can be in the air at once. */
export const MAX_FLIGHTS = 5;

/** The planet's colours, the same in both themes: the page around it changes, the night does not. */
const LAND_RGB = { shade: hexToRgb('#5b7690'), lit: hexToRgb('#d5e3f3') } as const;
const PIN_RGB = { core: hexToRgb('#e5533a'), rim: hexToRgb('#fff0e6') } as const;
const TONES: Record<Tone, { readonly base: Rgb; readonly hot: Rgb }> = {
  warm: { base: hexToRgb('#e5533a'), hot: hexToRgb('#ffd9bd') },
  cool: { base: hexToRgb('#3fb8a8'), hot: hexToRgb('#bff0ea') },
};
/** Rings where an arc leaves, where it lands, and the slow beat on each hub: seconds, growth in dot sizes, opacity. */
const RING = {
  launch: { seconds: 0.8, spread: 5, opacity: 0.6 },
  landing: { seconds: 1, spread: 8, opacity: 0.85 },
  hub: { seconds: 2.4, spread: 5, opacity: 0.35 },
} as const;
/** The white-hot tint on an arc's head cools over this many seconds after it lands, down to this share. */
const HEAT = { cools: 0.6, rest: 0.3 } as const;

const DEG = Math.PI / 180;
/** Sphere radius as a share of the canvas's shorter side; the margin is headroom for arcs. */
const RADIUS = 0.4;
/**
 * How high an arc climbs, as a share of the radius: a share of its chord, capped so the highest arc stays inside the
 * headroom even with the lean below: hypot(1.16, 0.35 * 0.16) < 0.5 / RADIUS.
 */
const ARC_LIFT = { perChord: 0.38, max: 0.16 } as const;
/**
 * Height also leans up the screen by this share of itself, easing off toward the top of the globe where the lift
 * already shows. Without it, an arc facing the viewer climbs straight at them and reads as a flat line.
 */
const LEAN = 0.35;
/**
 * Points per radius of arc length: about 1.3 device px apart at the largest canvas, so the line of light stays smooth,
 * between a floor for the shortest hops and a cap for the longest.
 */
const ARC_SAMPLES = { perRadius: 480, min: 40, max: 1024 } as const;
/** Land dots and pins scale with the planet (a share of the radius, with a floor in CSS px); hubs and the hovered pin draw larger. */
const DOT = { share: 0.0095, minCss: 1.6 } as const;
const PIN = { share: 0.028, minCss: 8, hub: 1.3, active: 1.6 } as const;
/** Arc and spark sprites in CSS px, so every line keeps one weight: an arc is a core of about 1.8 px in a soft halo. */
const SPRITE_CSS = { arc: 8, spark: 12, max: 48 } as const;
/** How close, in CSS pixels, the pointer must be to a pin or an arc, and how visible it must be, to hit it. */
const HIT = { pin: 14, arc: 12, minAlpha: 0.25 } as const;
const MAX_DPR = 2;
const OPACITY = { land: 0.85, arc: 1, pin: 1, spark: 1 } as const;
const KIND = { land: 0, pin: 1, arc: 2, ring: 3, glow: 4 } as const;
/** Light falls from the top left, toward the viewer, where the CSS body has its highlight. */
const LIGHT = [-0.45, 0.55, 0.7].map((value) => value / Math.hypot(-0.45, 0.55, 0.7));

const glsl = (value: number) => value.toFixed(4);

const VERTEX_SHADER = `#version 300 es
in vec3 aPosition;
in float aParam;
uniform mat3 uRotation;
uniform vec2 uScale;
uniform float uSize;
uniform float uMaxSize;
uniform int uKind;
uniform float uActive;
uniform vec2 uHubs;
uniform vec2 uLit;
uniform float uHeat;
uniform float uPulse;
uniform float uSpread;
out float vAlpha;
out float vMix;
out float vFacing;
out vec2 vDir;
void main() {
  vec3 p = uRotation * aPosition;
  float r = length(p);
  float z = p.z / r;
  vec2 xy = p.xy + vec2(0.0, ${glsl(LEAN)} * max(r - 1.0, 0.0) * (1.0 - clamp(p.y / r, 0.0, 1.0)));
  // Fades as it turns behind the globe; lifted points past the limb stay visible.
  float alpha = max(smoothstep(-0.1, 0.06, z), smoothstep(0.97, 1.05, dot(xy, xy)));
  float size = uSize;
  vMix = 0.0;
  if (uKind == 0) {
    // Land shrinks and fades toward the limb, and takes its shade from the light.
    float facing = max(z, 0.0);
    size *= mix(0.4, 1.0, sqrt(facing));
    alpha = smoothstep(0.02, 0.55, facing);
    vMix = 0.25 + 0.75 * clamp(dot(p, vec3(${LIGHT.map(glsl).join(', ')})), 0.0, 1.0);
  } else if (uKind == 1) {
    bool hub = abs(aParam - uHubs.x) < 0.5 || abs(aParam - uHubs.y) < 0.5;
    size *= abs(aParam - uActive) < 0.5 ? ${glsl(PIN.active)} : (hub ? ${glsl(PIN.hub)} : 1.0);
    alpha = smoothstep(0.0, 0.25, z);
  } else if (uKind == 2) {
    // Lit from nothing at the tail to full at the head, and white-hot right at the head.
    float lit = smoothstep(uLit.x, max(uLit.y, uLit.x + 0.0001), aParam);
    alpha *= step(uLit.x, aParam) * step(aParam, uLit.y) * lit * (2.0 - lit);
    vMix = uHeat * smoothstep(uLit.y - 0.12, uLit.y, aParam);
  } else if (uKind == 3) {
    size *= 1.5 + uSpread * uPulse;
    alpha = smoothstep(0.0, 0.2, z) * (1.0 - pow(uPulse, 1.5));
  }
  vAlpha = alpha;
  vFacing = max(z, 0.15);
  vDir = dot(xy, xy) > 0.000001 ? normalize(xy) : vec2(0.0, 1.0);
  gl_Position = vec4(xy * uScale, 0.0, 1.0);
  gl_PointSize = alpha > 0.0 ? min(size, uMaxSize) : 0.0;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uOpacity;
// Shared with the vertex stage, so the precision must match its default.
uniform highp int uKind;
in float vAlpha;
in float vMix;
in float vFacing;
in vec2 vDir;
out vec4 fragColor;
void main() {
  // Sprite coordinates with y up, like the screen.
  vec2 c = vec2(gl_PointCoord.x * 2.0 - 1.0, 1.0 - gl_PointCoord.y * 2.0);
  float d = length(c);
  vec3 color = mix(uColor, uColor2, vMix);
  float shape;
  if (uKind == 0) {
    shape = 1.0 - smoothstep(0.55, 0.95, d);
  } else if (uKind == 1) {
    // A core, a light rim that keeps close pins apart, and a soft halo.
    float core = 1.0 - smoothstep(0.26, 0.32, d);
    float rim = smoothstep(0.28, 0.34, d) * (1.0 - smoothstep(0.44, 0.5, d));
    float halo = 0.3 * exp(-5.0 * (d - 0.46) * (d - 0.46)) * (1.0 - smoothstep(0.85, 1.0, d));
    shape = max(max(core, 0.95 * rim), halo);
    color = mix(uColor, uColor2, rim);
  } else if (uKind == 2) {
    // A crisp core in a soft halo.
    shape = max(1.0 - smoothstep(0.16, 0.28, d), 0.32 * exp(-5.0 * d * d));
  } else if (uKind == 3) {
    // A thin ring lying on the sphere, squashed toward the limb like the surface under it.
    float e = length(vec2(dot(c, vDir) / vFacing, dot(c, vec2(-vDir.y, vDir.x))));
    shape = smoothstep(0.8, 0.86, e) * (1.0 - smoothstep(0.9, 0.96, e));
  } else {
    // A white-hot core with a falloff in the arc's colour.
    float core = 1.0 - smoothstep(0.1, 0.18, d);
    shape = max(exp(-7.0 * d * d), 0.95 * core);
    color = mix(uColor, uColor2, max(core, 1.0 - smoothstep(0.0, 0.35, d)));
  }
  float a = vAlpha * shape * uOpacity;
  if (a <= 0.0) discard;
  fragColor = vec4(color * a, a);
}`;

type Vec3 = [number, number, number];

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const easeOut = (value: number) => 1 - (1 - value) ** 3;
const easeInOut = (value: number) => (value < 0.5 ? 4 * value ** 3 : 1 - (2 - 2 * value) ** 3 / 2);

/** The lit stretch of a flight's arc, as 0..1 distances along it: the head draws out, holds, then the tail follows. */
function litRange(age: number): { tail: number; head: number } {
  return {
    tail: easeInOut(clamp01((age - FLIGHT.draw - FLIGHT.hold) / FLIGHT.retract)),
    head: easeOut(clamp01(age / FLIGHT.draw)),
  };
}

/** How bright an arc is at `t` along it, as the vertex shader lights it. */
function litAlpha(tail: number, head: number, t: number): number {
  if (t < tail || t > head) return 0;
  const lit = smoothstep(tail, Math.max(head, tail + 0.0001), t);
  return lit * (2 - lit);
}

/** How white-hot an arc's head still is: fully while it draws, cooling after it lands. */
const heatAt = (age: number) => 1 - (1 - HEAT.rest) * clamp01((age - FLIGHT.draw) / HEAT.cools);

const toVector = ({ lat, lon }: LatLon): Vec3 => {
  const la = lat * DEG;
  const lo = lon * DEG;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
};

/** Turns the globe so (lat, lon) faces the viewer: spin about the pole, then tilt. Row-major. */
function rotationFacing(lat: number, lon: number): number[] {
  const [sinLat, cosLat] = [Math.sin(lat * DEG), Math.cos(lat * DEG)];
  const [sinLon, cosLon] = [Math.sin(lon * DEG), Math.cos(lon * DEG)];
  return [cosLon, 0, -sinLon, -sinLat * sinLon, cosLat, -sinLat * cosLon, cosLat * sinLon, sinLat, cosLat * cosLon];
}

const rotate = (m: number[], x: number, y: number, z: number): Vec3 => [
  (m[0] ?? 0) * x + (m[1] ?? 0) * y + (m[2] ?? 0) * z,
  (m[3] ?? 0) * x + (m[4] ?? 0) * y + (m[5] ?? 0) * z,
  (m[6] ?? 0) * x + (m[7] ?? 0) * y + (m[8] ?? 0) * z,
];

/**
 * Where a rotated point sits on screen, in radii from the centre, with height leaning up as the vertex shader leans
 * it, plus how far it faces the viewer (1 head-on, 0 at the limb).
 */
function onScreen(p: Vec3): Vec3 {
  const r = Math.hypot(p[0], p[1], p[2]);
  return [p[0], p[1] + LEAN * Math.max(r - 1, 0) * (1 - clamp01(p[1] / r)), p[2] / r];
}

/** How much of a point shows, as the vertex shader fades it: gone behind the globe unless lifted past the limb. */
const visibility = ([x, y, z]: Vec3) => Math.max(smoothstep(-0.1, 0.06, z), smoothstep(0.97, 1.05, x * x + y * y));

/** Unit vectors for every land dot; see land.ts for the grid. */
function landVectors(): Float32Array {
  const bytes = Uint8Array.from(atob(LAND.bits), (char) => char.charCodeAt(0));
  const out: number[] = [];
  let index = 0;
  for (let row = 0; row < LAND.rows; row++) {
    const lat = LAND.top - row * LAND.step;
    const perRow = Math.max(1, Math.round(LAND.perEquator * Math.cos(lat * DEG)));
    for (let i = 0; i < perRow; i++, index++) {
      if (((bytes[index >> 3] ?? 0) >> (7 - (index & 7))) & 1) out.push(...toVector({ lat, lon: -180 + ((i + 0.5) * 360) / perRow }));
    }
  }
  return new Float32Array(out);
}

/** Points along the great circle from a to b, lifted into an arc; the 4th component is the 0..1 distance along it. */
function arcPoints(a: LatLon, b: LatLon): Float32Array {
  const [from, to] = [toVector(a), toVector(b)];
  const angle = Math.acos(Math.min(1, Math.max(-1, from[0] * to[0] + from[1] * to[1] + from[2] * to[2])));
  const lift = Math.min(ARC_LIFT.max, ARC_LIFT.perChord * 2 * Math.sin(angle / 2));
  const at = (t: number): Vec3 => {
    const [wa, wb] = angle < 1e-6 ? [1 - t, t] : [Math.sin((1 - t) * angle) / Math.sin(angle), Math.sin(t * angle) / Math.sin(angle)];
    const radius = 1 + lift * Math.sin(Math.PI * t);
    return [(wa * from[0] + wb * to[0]) * radius, (wa * from[1] + wb * to[1]) * radius, (wa * from[2] + wb * to[2]) * radius];
  };
  // Its length in radii, from a coarse pass, sets how densely the arc is sampled.
  let length = 0;
  for (let i = 1, previous = at(0); i <= 32; i++) {
    const next = at(i / 32);
    length += Math.hypot(next[0] - previous[0], next[1] - previous[1], next[2] - previous[2]);
    previous = next;
  }
  const samples = Math.round(Math.min(ARC_SAMPLES.max, Math.max(ARC_SAMPLES.min, length * ARC_SAMPLES.perRadius)));
  const data = new Float32Array(samples * 4);
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    data.set([...at(t), t], i * 4);
  }
  return data;
}

/** The point a 0..1 distance along an arc, between its two nearest samples. */
function pointAlong(points: Float32Array, t: number): Vec3 {
  const last = points.length / 4 - 1;
  const at = clamp01(t) * last;
  const i = Math.min(Math.floor(at), last - 1);
  const f = at - i;
  const axis = (k: number) => (points[i * 4 + k] ?? 0) + ((points[(i + 1) * 4 + k] ?? 0) - (points[i * 4 + k] ?? 0)) * f;
  return [axis(0), axis(1), axis(2)];
}

const routeKey = (flight: Flight) => `${flight.from}>${flight.to}`;

/** Returns null when WebGL2 is unavailable or the GPU rejects the setup; callers fall back to the plain list. */
export function createGlobe(canvas: HTMLCanvasElement, options: GlobeOptions): Globe | null {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return null;
  try {
    return buildGlobe(canvas, gl, options);
  } catch {
    return null;
  }
}

function buildGlobe(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, options: GlobeOptions): Globe {
  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  const position = gl.getAttribLocation(program, 'aPosition');
  const param = gl.getAttribLocation(program, 'aParam');
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    rotation: uniform('uRotation'),
    scale: uniform('uScale'),
    size: uniform('uSize'),
    maxSize: uniform('uMaxSize'),
    kind: uniform('uKind'),
    active: uniform('uActive'),
    hubs: uniform('uHubs'),
    lit: uniform('uLit'),
    heat: uniform('uHeat'),
    pulse: uniform('uPulse'),
    spread: uniform('uSpread'),
    color: uniform('uColor'),
    color2: uniform('uColor2'),
    opacity: uniform('uOpacity'),
  };

  /** One vertex array per layer: xyz positions, plus a param (place index or arc distance) when given. */
  const layer = (data: Float32Array, withParam: boolean, usage: number = gl.STATIC_DRAW) => {
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    const stride = (withParam ? 4 : 3) * 4;
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, stride, 0);
    if (withParam) {
      gl.enableVertexAttribArray(param);
      gl.vertexAttribPointer(param, 1, gl.FLOAT, false, stride, 12);
    } else {
      gl.disableVertexAttribArray(param);
    }
    gl.bindVertexArray(null);
    return { vao, buffer, count: data.length / (withParam ? 4 : 3) };
  };

  const land = layer(landVectors(), false);
  const pins = layer(new Float32Array(options.places.flatMap((place, index) => [...toVector(place), index])), true);
  const arcs = layer(new Float32Array(MAX_FLIGHTS * ARC_SAMPLES.max * 4), true, gl.DYNAMIC_DRAW);
  /** One point, rewritten before each draw: the head of an arc that is still drawing out. */
  const spark = layer(new Float32Array(4), true, gl.DYNAMIC_DRAW);
  const sparkPoint = new Float32Array(4);
  /** What each slot's buffer region currently holds, kept in JS too for hit tests and sparks. */
  const slots = Array.from({ length: MAX_FLIGHTS }, (): { key: string; points: Float32Array } => ({
    key: '',
    points: new Float32Array(0),
  }));

  const first = options.places[0];
  const state: GlobeState = {
    lat: first?.lat ?? 0,
    lon: first?.lon ?? 0,
    active: -1,
    flights: Array.from({ length: MAX_FLIGHTS }, (): Flight | null => null),
  };
  /** Seconds the globe has been animating, for the hubs' beat. */
  let clock = 0;

  gl.enable(gl.BLEND);
  gl.uniform2f(u.hubs, options.hubs[0] ?? -1, options.hubs[1] ?? -1);

  /** Uploads a flight's arc into its slot when the slot changes route; returns the slot's points, or null. */
  const loadSlot = (slot: number, flight: Flight) => {
    const record = slots[slot];
    const from = options.places[flight.from];
    const to = options.places[flight.to];
    if (!record || !from || !to) return null;
    const key = routeKey(flight);
    if (record.key !== key) {
      record.points = arcPoints(from, to);
      record.key = key;
      gl.bindBuffer(gl.ARRAY_BUFFER, arcs.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, slot * ARC_SAMPLES.max * 16, record.points);
    }
    return record.points;
  };

  const draw = (
    kind: number,
    target: { vao: WebGLVertexArrayObject; count: number },
    colors: readonly [Rgb, Rgb],
    opacity: number,
    offset = 0,
    count = target.count,
  ) => {
    gl.uniform1i(u.kind, kind);
    gl.uniform3f(u.color, ...colors[0]);
    gl.uniform3f(u.color2, ...colors[1]);
    gl.uniform1f(u.opacity, opacity);
    gl.bindVertexArray(target.vao);
    gl.drawArrays(gl.POINTS, offset, count);
  };

  /** A ring at a place, `progress` 0..1 through its growth; nothing outside that. */
  const ring = (place: number, progress: number, look: { readonly spread: number; readonly opacity: number }, color: Rgb) => {
    if (progress < 0 || progress >= 1 || place < 0 || place >= pins.count) return;
    gl.uniform1f(u.pulse, easeOut(progress));
    gl.uniform1f(u.spread, look.spread);
    draw(KIND.ring, pins, [color, color], look.opacity, place, 1);
  };

  const render = () => {
    if (gl.isContextLost() || !canvas.clientWidth || !canvas.clientHeight) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const width = Math.max(2, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(2, Math.round(canvas.clientHeight * dpr));
    const radius = Math.min(width, height) * RADIUS;
    const dot = Math.max(DOT.minCss * dpr, radius * DOT.share);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniformMatrix3fv(u.rotation, true, rotationFacing(state.lat, state.lon));
    gl.uniform2f(u.scale, (2 * radius) / width, (2 * radius) / height);
    gl.uniform1f(u.maxSize, SPRITE_CSS.max * dpr);
    gl.uniform1f(u.active, state.active);

    // Arcs first, as light: MAX blending keeps the overlapping points of an arc from piling up into beads.
    gl.blendEquation(gl.MAX);
    gl.uniform1f(u.size, SPRITE_CSS.arc * dpr);
    const live: { flight: Flight; points: Float32Array }[] = [];
    state.flights.forEach((flight, slot) => {
      const points = flight && loadSlot(slot, flight);
      if (!flight || !points) return;
      const { tail, head } = litRange(flight.age);
      const tone = TONES[flight.tone];
      gl.uniform2f(u.lit, tail, head);
      gl.uniform1f(u.heat, heatAt(flight.age));
      draw(KIND.arc, arcs, [tone.base, tone.hot], OPACITY.arc, slot * ARC_SAMPLES.max, points.length / 4);
      live.push({ flight, points });
    });

    // Land slides in under the arcs, which ride above it.
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);
    gl.uniform1f(u.size, dot);
    draw(KIND.land, land, [LAND_RGB.shade, LAND_RGB.lit], OPACITY.land);

    // Pins sit on top of everything drawn so far.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(u.size, Math.max(PIN.minCss * dpr, radius * PIN.share));
    draw(KIND.pin, pins, [PIN_RGB.core, PIN_RGB.rim], OPACITY.pin);

    // Rings and sparks add light.
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(u.size, dot);
    if (options.animate) {
      options.hubs.forEach((hub, index) => {
        const beat = (clock / RING.hub.seconds + index / options.hubs.length) % 1;
        ring(hub, beat, RING.hub, PIN_RGB.core);
      });
    }
    for (const { flight } of live) {
      const tone = TONES[flight.tone];
      ring(flight.from, flight.age / RING.launch.seconds, RING.launch, tone.base);
      ring(flight.to, (flight.age - FLIGHT.draw) / RING.landing.seconds, RING.landing, tone.hot);
    }
    gl.uniform1f(u.size, SPRITE_CSS.spark * dpr);
    for (const { flight, points } of live) {
      const drawn = flight.age / FLIGHT.draw;
      if (drawn >= 1) continue;
      const tone = TONES[flight.tone];
      sparkPoint.set(pointAlong(points, litRange(flight.age).head));
      gl.bindBuffer(gl.ARRAY_BUFFER, spark.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, sparkPoint);
      // Fades as the head eases into its landing, where the ring takes over.
      draw(KIND.glow, spark, [tone.base, tone.hot], OPACITY.spark * (1 - clamp01((drawn - 0.8) / 0.2)));
    }
  };

  const frame = (delta: number) => {
    clock += delta;
    options.onFrame?.(delta);
    render();
  };
  let stop = options.animate ? loopWhileVisible(canvas, frame) : () => undefined;
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      stop();
      stop = () => undefined;
      options.onLost?.();
    },
    { once: true },
  );
  render();

  return {
    state,
    hitTest(x, y) {
      const m = rotationFacing(state.lat, state.lon);
      const radius = Math.min(canvas.clientWidth, canvas.clientHeight) * RADIUS;
      const [cx, cy] = [canvas.clientWidth / 2, canvas.clientHeight / 2];
      const distance = (screen: Vec3) => Math.hypot(cx + screen[0] * radius - x, cy - screen[1] * radius - y);

      let pin = -1;
      let nearest: number = HIT.pin;
      options.places.forEach((place, index) => {
        const p = rotate(m, ...toVector(place));
        const d = distance(p);
        // Pins fade out toward the limb, as the vertex shader fades them; a faded pin is not a target.
        if (smoothstep(0, 0.25, p[2]) >= HIT.minAlpha && d < nearest) [pin, nearest] = [index, d];
      });
      if (pin >= 0) return { pin };

      let arc = -1;
      nearest = HIT.arc;
      state.flights.forEach((flight, slot) => {
        const record = slots[slot];
        if (!flight || !record || record.key !== routeKey(flight)) return;
        const { tail, head } = litRange(flight.age);
        const points = record.points;
        // Every other point is close enough for a pointer.
        for (let i = 0; i + 3 < points.length; i += 8) {
          const t = points[i + 3] ?? 0;
          const brightness = litAlpha(tail, head, t);
          if (brightness < HIT.minAlpha) continue;
          const screen = onScreen(rotate(m, points[i] ?? 0, points[i + 1] ?? 0, points[i + 2] ?? 0));
          if (brightness * visibility(screen) < HIT.minAlpha) continue;
          const d = distance(screen);
          if (d < nearest) [arc, nearest] = [slot, d];
        }
      });
      return arc >= 0 ? { arc } : null;
    },
    setPaused(paused) {
      if (!options.animate || gl.isContextLost()) return;
      stop();
      stop = paused ? () => undefined : loopWhileVisible(canvas, frame);
      render();
    },
    render,
    destroy() {
      stop();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
