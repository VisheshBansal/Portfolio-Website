/**
 * Plate art: one small SVG scene per employer, drawn in a 400 x 300 viewBox. Built at compile time from a seeded
 * PRNG, so every build draws the same picture. Timings noted as matching the styles pair with keyframes in
 * Journey.astro.
 */
import { tenths, type Point } from './journey.geometry';

export type Motif = 'clouds' | 'rain' | 'scan' | 'merge' | 'radar' | 'nodes' | 'chart' | 'graph';
export type CloudStroke = 'ink' | 'acc' | 'faint';
export type Severity = 'ok' | 'low' | 'high';
/** When a part of the access graph appears; the styles ghost later stages. */
export type GraphStage = 1 | 2 | 3;

export interface Cloud extends Point {
  readonly scale: number;
  readonly stroke: CloudStroke;
  readonly driftPx: number;
  readonly driftSeconds: number;
  /** Carries the alert badge. */
  readonly flagged: boolean;
}

export interface CloudsArt {
  readonly outline: string;
  readonly shapes: readonly Cloud[];
}

export interface RainLine {
  readonly text: string;
  readonly opacity: number;
  readonly y: number;
}

export interface RainColumn {
  readonly x: number;
  readonly fallSeconds: number;
  readonly delaySeconds: number;
  readonly lines: readonly RainLine[];
}

export interface ScanCell extends Point {
  readonly severity: Severity;
  /** When the sweeping bar reaches the cell. */
  readonly delaySeconds: number;
}

export interface ScanArt {
  readonly gridPath: string;
  readonly cells: readonly ScanCell[];
}

export interface AlertWire {
  readonly path: string;
  readonly pulseSeconds: number;
}

export interface Blip extends Point {
  /** Negative, so the blip flashes as the sweep passes. */
  readonly delaySeconds: number;
}

export interface RadarWedge {
  readonly path: string;
  readonly opacity: number;
}

export interface RadarArt {
  readonly wedges: readonly RadarWedge[];
  readonly blips: readonly Blip[];
  readonly threat: Blip;
}

export interface NetworkNode extends Point {
  readonly radius: number;
  readonly delaySeconds: number;
}

export interface Segment {
  readonly from: Point;
  readonly to: Point;
}

export interface NodesArt {
  readonly points: readonly NetworkNode[];
  readonly links: readonly Segment[];
  /** Nodes wired straight to the hub at the centre. */
  readonly hubLinks: readonly Point[];
}

export interface EventBar extends Point {
  readonly height: number;
  readonly delaySeconds: number;
}

export interface ChartArt {
  readonly linePath: string;
  readonly areaPath: string;
  readonly events: readonly EventBar[];
}

export interface GraphNode extends Point {
  readonly stage: GraphStage;
}

export interface GraphEdge {
  readonly path: string;
  readonly stage: GraphStage;
}

export interface GraphArt {
  readonly columnX: { readonly identities: number; readonly roles: number; readonly resources: number };
  readonly identities: readonly GraphNode[];
  readonly roles: readonly GraphNode[];
  readonly resources: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  /** A grant revoked in the last stage, crossed out at its midpoint. */
  readonly revokedPath: string;
  readonly revokedAt: Point;
  readonly crossPath: string;
  /** One identity's path to a resource, traced once the graph is complete. */
  readonly tracePath: string;
}

export interface MotifArt {
  readonly clouds: CloudsArt;
  readonly rain: readonly RainColumn[];
  readonly scan: ScanArt;
  readonly merge: readonly AlertWire[];
  readonly radar: RadarArt;
  readonly nodes: NodesArt;
  readonly chart: ChartArt;
  readonly graph: GraphArt;
}

interface Bearing {
  /** Clockwise from east, since SVG's y axis points down. */
  readonly degrees: number;
  readonly range: number;
}

interface CubicCurve {
  readonly start: Point;
  readonly startHandle: Point;
  readonly endHandle: Point;
  readonly end: Point;
}

interface Grant {
  readonly from: GraphNode;
  readonly to: GraphNode;
  readonly stage: GraphStage;
}

const MOTIF_BY_ORG: Readonly<Record<string, Motif>> = {
  SecLogic: 'clouds',
  CloudSEK: 'rain',
  'Grant Thornton': 'scan',
  OneCard: 'merge',
  Uptycs: 'radar',
  'GDSC VIT': 'nodes',
  Groww: 'chart',
  BalkanID: 'graph',
};
const FALLBACK_MOTIF: Motif = 'nodes';

export const MOTIF_CAPTIONS: Readonly<Record<Motif, string>> = {
  clouds: 'clouds, under watch',
  rain: 'strings, extracted',
  scan: 'ranges, scanned',
  merge: 'many alerts, one message',
  radar: 'always scanning',
  nodes: 'the club',
  chart: 'up and to the right',
  graph: 'who can access what',
};

const VIEWBOX = { width: 400, height: 300 } as const;
const CENTER: Point = { x: VIEWBOX.width / 2, y: VIEWBOX.height / 2 };

const CLOUD_OUTLINE = 'M14 50A12 12 0 0 1 18 28A20 20 0 0 1 54 14A16 16 0 0 1 82 30A11 11 0 0 1 90 50Z';
const CLOUDS: readonly Cloud[] = [
  { x: 26, y: 44, scale: 1.2, stroke: 'ink', driftPx: 10, driftSeconds: 11, flagged: false },
  { x: 232, y: 30, scale: 1.45, stroke: 'ink', driftPx: -14, driftSeconds: 14, flagged: false },
  { x: 110, y: 128, scale: 1.9, stroke: 'acc', driftPx: 6, driftSeconds: 9, flagged: true },
  { x: 40, y: 222, scale: 0.95, stroke: 'faint', driftPx: 16, driftSeconds: 16, flagged: false },
  { x: 300, y: 214, scale: 1.05, stroke: 'faint', driftPx: -12, driftSeconds: 13, flagged: false },
];

const RAIN_WORDS = [
  'libapp.so',
  'dart:io',
  'assets/',
  'jsbundle',
  'https://',
  'Bearer',
  'AKIA',
  'token',
  's3://',
  'api_key',
  'hermes',
  '.bundle',
  'classes',
  'flutter',
  'config',
  'AIza',
  'client_id',
  '.env',
  'base64',
  'jwt',
  'oauth',
  'firebase',
  'sk_live',
  'webhook',
  'password',
  'secret',
];
const RAIN_OPACITIES = [0.35, 0.6, 0.9];
const RAIN = {
  seed: 11,
  seedStep: 7,
  columns: 6,
  linesPerColumn: 12,
  firstX: 14,
  columnSpacing: 64,
  lineHeight: 24,
  baseline: 16,
  minFallSeconds: 13,
  fallSecondsRange: 9,
  maxDelaySeconds: 20,
} as const;
/** Each column is stacked twice so the jy-fall loop, one column tall, is seamless. */
const RAIN_LOOP_PX = RAIN.linesPerColumn * RAIN.lineHeight;

const SCAN = {
  seed: 42,
  columns: 14,
  rows: 8,
  firstX: 21,
  firstY: 62,
  pitch: 26,
  cellSize: 20,
  /** Cumulative odds of a high, then a low, finding. */
  highOdds: 0.05,
  lowOdds: 0.17,
} as const;
/** The bar starts at x = 20 and crosses 374px in 65% of a 7s loop (matches jy-bar in the styles). */
const SCAN_SWEEP = { startX: 20, distancePx: 374, fraction: 0.65, loopSeconds: 7 } as const;

/** Jittery alert wires that straighten out and curve into the SAL node. */
const ALERT_WIRES = {
  seed: 7,
  count: 7,
  firstY: 34,
  spacing: 38,
  jitterStepPx: 12,
  jitterUntilX: 96,
  jitterPx: 14,
  straightUntilX: 106,
  /** Bezier handles of the curve into the node. */
  curveHandleX: 170,
  inletHandleX: 188,
  minPulseSeconds: 1.6,
  pulseSecondsRange: 1.8,
} as const;
/** Left edge of the SAL node in the markup. */
const SAL_INLET: Point = { x: 232, y: 150 };

/** The sweep starts at -35deg and turns once every 5s (matches jy-spin and jy-blip in the styles). */
const RADAR = { sweepStartDeg: -35, sweepSeconds: 5, radius: 120, wedgeDeg: 10 } as const;
/** Wedges trailing the sweep's leading edge, fading out. */
const RADAR_WEDGE_OPACITIES = [0.34, 0.22, 0.14, 0.09, 0.05, 0.03];
const RADAR_BLIPS: readonly Bearing[] = [
  { degrees: 20, range: 96 },
  { degrees: 75, range: 58 },
  { degrees: 140, range: 108 },
  { degrees: 200, range: 74 },
  { degrees: 250, range: 112 },
  { degrees: 335, range: 44 },
];
const RADAR_THREAT: Point = { x: 247, y: 68 };

const NETWORK = {
  seed: 5,
  count: 17,
  maxAttempts: 4000,
  marginPx: 26,
  hubClearancePx: 62,
  minSpacingPx: 54,
  minRadius: 3.5,
  radiusRange: 2.5,
  maxDelaySeconds: 4,
  /** Every node links to its nearest neighbours; the hub links to the nearest nodes. */
  neighbours: 2,
  hubLinks: 6,
} as const;
/** Kept clear for the "me" note in the markup. */
const ME_NOTE_AREA = { left: 214, right: 300, top: 78, bottom: 128 } as const;

const CHART = {
  seed: 23,
  points: 26,
  left: 24,
  right: 376,
  startY: 236,
  endY: 70,
  /** The plot band the noisy line is clamped to. */
  topY: 60,
  bottomY: 248,
  /** Noise leans slightly down and fades as the line climbs. */
  noiseBias: 0.42,
  noisePx: 30,
  noiseFade: 0.6,
  areaBaseY: 262,
} as const;
const CHART_EVENTS = { count: 24, spacing: 14.8, baseY: 282, minHeight: 4, heightRange: 14, maxDelaySeconds: 2 } as const;
/** Uniform Catmull-Rom as cubic Beziers: each handle reaches a sixth of the neighbouring chord. */
const CATMULL_ROM_DIVISOR = 6;

const GRAPH = {
  columnX: { identities: 56, roles: 200, resources: 344 },
  rowSpacing: 50,
  outerFirstY: 50,
  innerFirstY: 75,
  /** Edges leave a node this far from its centre, with handles this long. */
  nodeClearancePx: 11,
  handlePx: 72,
  crossHalfPx: 5,
} as const;

export const motifFor = (org: string): Motif => MOTIF_BY_ORG[org] ?? FALLBACK_MOTIF;

export function buildMotifArt(): MotifArt {
  return {
    clouds: { outline: CLOUD_OUTLINE, shapes: CLOUDS },
    rain: buildRain(),
    scan: buildScan(),
    merge: buildAlertWires(),
    radar: buildRadar(),
    nodes: buildNetwork(),
    chart: buildChart(),
    graph: buildAccessGraph(),
  };
}

function buildRain(): RainColumn[] {
  return Array.from({ length: RAIN.columns }, (_, column) => {
    const random = seededRandom(RAIN.seed + column * RAIN.seedStep);
    const fallSeconds = tenths(RAIN.minFallSeconds + random() * RAIN.fallSecondsRange);
    const delaySeconds = tenths(-random() * RAIN.maxDelaySeconds);
    const words = Array.from({ length: RAIN.linesPerColumn }, () => ({
      text: pick(RAIN_WORDS, random),
      opacity: pick(RAIN_OPACITIES, random),
    }));
    const lines = [0, RAIN_LOOP_PX].flatMap((offset) =>
      words.map((word, index) => ({ ...word, y: offset + index * RAIN.lineHeight + RAIN.baseline })),
    );
    return { x: RAIN.firstX + column * RAIN.columnSpacing, fallSeconds, delaySeconds, lines };
  });
}

function buildScan(): ScanArt {
  const random = seededRandom(SCAN.seed);
  const cells: ScanCell[] = [];
  for (let column = 0; column < SCAN.columns; column++) {
    for (let row = 0; row < SCAN.rows; row++) {
      const severity = severityOf(random());
      const x = SCAN.firstX + column * SCAN.pitch;
      const fromSweepStart = x + SCAN.cellSize / 2 - SCAN_SWEEP.startX;
      const delaySeconds = hundredths((fromSweepStart / SCAN_SWEEP.distancePx) * SCAN_SWEEP.fraction * SCAN_SWEEP.loopSeconds);
      cells.push({ x, y: SCAN.firstY + row * SCAN.pitch, severity, delaySeconds });
    }
  }
  const size = SCAN.cellSize;
  return { gridPath: cells.map((cell) => `M${cell.x} ${cell.y}h${size}v${size}h-${size}z`).join(''), cells };
}

function severityOf(roll: number): Severity {
  if (roll < SCAN.highOdds) return 'high';
  if (roll < SCAN.lowOdds) return 'low';
  return 'ok';
}

function buildAlertWires(): AlertWire[] {
  const random = seededRandom(ALERT_WIRES.seed);
  return Array.from({ length: ALERT_WIRES.count }, (_, index) => {
    const y = ALERT_WIRES.firstY + index * ALERT_WIRES.spacing;
    let path = `M0 ${y}`;
    for (let x = ALERT_WIRES.jitterStepPx; x <= ALERT_WIRES.jitterUntilX; x += ALERT_WIRES.jitterStepPx) {
      path += `L${x} ${tenths(y + (random() - 0.5) * ALERT_WIRES.jitterPx)}`;
    }
    path += `L${ALERT_WIRES.straightUntilX} ${y}C${ALERT_WIRES.curveHandleX} ${y} ${ALERT_WIRES.inletHandleX} ${SAL_INLET.y} ${SAL_INLET.x} ${SAL_INLET.y}`;
    return { path, pulseSeconds: tenths(ALERT_WIRES.minPulseSeconds + random() * ALERT_WIRES.pulseSecondsRange) };
  });
}

function buildRadar(): RadarArt {
  const wedges = RADAR_WEDGE_OPACITIES.map((opacity, index) => {
    const trailing = polar({ degrees: -RADAR.wedgeDeg * (index + 1), range: RADAR.radius });
    const leading = polar({ degrees: -RADAR.wedgeDeg * index, range: RADAR.radius });
    const arc = `A${RADAR.radius} ${RADAR.radius} 0 0 1 ${leading.x} ${leading.y}`;
    return { opacity, path: `M${CENTER.x} ${CENTER.y}L${trailing.x} ${trailing.y}${arc}Z` };
  });
  return { wedges, blips: RADAR_BLIPS.map((bearing) => withSweepDelay(polar(bearing))), threat: withSweepDelay(RADAR_THREAT) };
}

function polar({ degrees, range }: Bearing): Point {
  const radians = (degrees * Math.PI) / 180;
  return { x: tenths(CENTER.x + range * Math.cos(radians)), y: tenths(CENTER.y + range * Math.sin(radians)) };
}

/** A negative delay that times the blip's flash to the moment the sweep passes over it. */
function withSweepDelay(point: Point): Blip {
  const bearing = (Math.atan2(point.y - CENTER.y, point.x - CENTER.x) * 180) / Math.PI;
  const sinceSweepStart = (((bearing - RADAR.sweepStartDeg) % 360) + 360) % 360;
  return { ...point, delaySeconds: hundredths((sinceSweepStart / 360) * RADAR.sweepSeconds - RADAR.sweepSeconds) };
}

/** Scatters nodes by rejection sampling, keeping them apart and clear of the hub and the "me" note. */
function buildNetwork(): NodesArt {
  const random = seededRandom(NETWORK.seed);
  const points: NetworkNode[] = [];
  for (let attempt = 0; attempt < NETWORK.maxAttempts && points.length < NETWORK.count; attempt++) {
    const candidate = {
      x: NETWORK.marginPx + random() * (VIEWBOX.width - 2 * NETWORK.marginPx),
      y: NETWORK.marginPx + random() * (VIEWBOX.height - 2 * NETWORK.marginPx),
    };
    if (distance(candidate, CENTER) < NETWORK.hubClearancePx || insideMeNote(candidate)) continue;
    if (!points.every((point) => distance(point, candidate) > NETWORK.minSpacingPx)) continue;
    points.push({
      x: tenths(candidate.x),
      y: tenths(candidate.y),
      radius: tenths(NETWORK.minRadius + random() * NETWORK.radiusRange),
      delaySeconds: tenths(-random() * NETWORK.maxDelaySeconds),
    });
  }
  return { points, links: nearestNeighbourLinks(points), hubLinks: nearestTo(CENTER, points, NETWORK.hubLinks) };
}

function insideMeNote({ x, y }: Point): boolean {
  return x > ME_NOTE_AREA.left && x < ME_NOTE_AREA.right && y > ME_NOTE_AREA.top && y < ME_NOTE_AREA.bottom;
}

/** Links every node to its nearest neighbours, once per pair, in discovery order. */
function nearestNeighbourLinks(points: readonly Point[]): Segment[] {
  const linked = new Set<string>();
  const links: Segment[] = [];
  points.forEach((point, index) => {
    const nearest = points
      .map((other, otherIndex) => ({ other, otherIndex, gap: distance(point, other) }))
      .filter(({ otherIndex }) => otherIndex !== index)
      .sort((left, right) => left.gap - right.gap)
      .slice(0, NETWORK.neighbours);
    for (const { other, otherIndex } of nearest) {
      const pair = index < otherIndex ? `${index}-${otherIndex}` : `${otherIndex}-${index}`;
      if (linked.has(pair)) continue;
      linked.add(pair);
      links.push({ from: point, to: other });
    }
  });
  return links;
}

function nearestTo(target: Point, points: readonly Point[], count: number): Point[] {
  return [...points].sort((left, right) => distance(left, target) - distance(right, target)).slice(0, count);
}

/** A noisy climb from bottom left to top right, smoothed, over a strip of event bars. */
function buildChart(): ChartArt {
  const random = seededRandom(CHART.seed);
  const samples = Array.from({ length: CHART.points }, (_, index): Point => {
    const progress = index / (CHART.points - 1);
    const trend = CHART.startY - (CHART.startY - CHART.endY) * progress;
    const noise = (random() - CHART.noiseBias) * CHART.noisePx * (1 - CHART.noiseFade * progress);
    return {
      x: tenths(CHART.left + progress * (CHART.right - CHART.left)),
      y: tenths(Math.min(CHART.bottomY, Math.max(CHART.topY, trend + noise))),
    };
  });
  const line = [{ x: CHART.left, y: CHART.startY }, ...samples.slice(1, -1), { x: CHART.right, y: CHART.endY }];
  const linePath = catmullRomPath(line);
  const events = Array.from({ length: CHART_EVENTS.count }, (_, index): EventBar => {
    const height = tenths(CHART_EVENTS.minHeight + random() * CHART_EVENTS.heightRange);
    return {
      x: tenths(CHART.left + index * CHART_EVENTS.spacing),
      y: tenths(CHART_EVENTS.baseY - height),
      height,
      delaySeconds: tenths(-random() * CHART_EVENTS.maxDelaySeconds),
    };
  });
  return { linePath, areaPath: `${linePath}L${CHART.right} ${CHART.areaBaseY}L${CHART.left} ${CHART.areaBaseY}Z`, events };
}

function catmullRomPath(points: readonly Point[]): string {
  const [first] = points;
  if (!first) return '';
  let path = `M${first.x} ${first.y}`;
  points.forEach((current, index) => {
    const next = points[index + 1];
    if (!next) return;
    const previous = points[index - 1] ?? current;
    const afterNext = points[index + 2] ?? next;
    const startHandleX = tenths(current.x + (next.x - previous.x) / CATMULL_ROM_DIVISOR);
    const startHandleY = tenths(current.y + (next.y - previous.y) / CATMULL_ROM_DIVISOR);
    const endHandleX = tenths(next.x - (afterNext.x - current.x) / CATMULL_ROM_DIVISOR);
    const endHandleY = tenths(next.y - (afterNext.y - current.y) / CATMULL_ROM_DIVISOR);
    path += `C${startHandleX} ${startHandleY} ${endHandleX} ${endHandleY} ${next.x} ${next.y}`;
  });
  return path;
}

/** Identities, roles and resources in three columns; access is granted in stages and one grant is revoked. */
function buildAccessGraph(): GraphArt {
  const { columnX } = GRAPH;
  const identities = graphColumn(columnX.identities, GRAPH.outerFirstY, [1, 1, 2, 2, 3]);
  const roles = graphColumn(columnX.roles, GRAPH.innerFirstY, [1, 1, 2, 3]);
  const resources = graphColumn(columnX.resources, GRAPH.outerFirstY, [1, 1, 1, 2, 3]);
  const identity = (row: number) => itemAt(identities, row);
  const role = (row: number) => itemAt(roles, row);
  const resource = (row: number) => itemAt(resources, row);

  const grants: readonly Grant[] = [
    { from: identity(0), to: role(0), stage: 1 },
    { from: identity(1), to: role(0), stage: 1 },
    { from: identity(1), to: role(1), stage: 1 },
    { from: role(0), to: resource(0), stage: 1 },
    { from: role(0), to: resource(1), stage: 1 },
    { from: role(1), to: resource(1), stage: 1 },
    { from: role(1), to: resource(2), stage: 1 },
    { from: identity(2), to: role(1), stage: 2 },
    { from: identity(2), to: role(2), stage: 2 },
    { from: identity(3), to: role(2), stage: 2 },
    { from: role(2), to: resource(2), stage: 2 },
    { from: role(2), to: resource(3), stage: 2 },
    { from: identity(3), to: role(3), stage: 3 },
    { from: identity(4), to: role(3), stage: 3 },
    { from: role(3), to: resource(3), stage: 3 },
    { from: role(3), to: resource(4), stage: 3 },
  ];
  const revoked = accessCurve(identity(0), role(2));
  const revokedAt = curveMidpoint(revoked);
  const traceIn = accessCurve(identity(2), role(1));
  const traceOut = accessCurve(role(1), resource(2));
  const half = GRAPH.crossHalfPx;

  return {
    columnX,
    identities,
    roles,
    resources,
    edges: grants.map(({ from, to, stage }) => ({ path: curvePath(accessCurve(from, to)), stage })),
    revokedPath: curvePath(revoked),
    revokedAt,
    crossPath: `M${revokedAt.x - half} ${revokedAt.y - half}l${2 * half} ${2 * half}M${revokedAt.x + half} ${revokedAt.y - half}l-${2 * half} ${2 * half}`,
    // Straight through the role node, then on to the resource.
    tracePath: `${curvePath(traceIn)}L${traceOut.start.x} ${traceOut.start.y}${curveTo(traceOut)}`,
  };
}

function graphColumn(x: number, firstY: number, stages: readonly GraphStage[]): GraphNode[] {
  return stages.map((stage, row) => ({ x, y: firstY + row * GRAPH.rowSpacing, stage }));
}

/** A horizontal S-curve from the right of one node to the left of the next. */
function accessCurve(from: Point, to: Point): CubicCurve {
  return {
    start: { x: from.x + GRAPH.nodeClearancePx, y: from.y },
    startHandle: { x: from.x + GRAPH.handlePx, y: from.y },
    endHandle: { x: to.x - GRAPH.handlePx, y: to.y },
    end: { x: to.x - GRAPH.nodeClearancePx, y: to.y },
  };
}

function curveTo({ startHandle, endHandle, end }: CubicCurve): string {
  return `C${startHandle.x} ${startHandle.y} ${endHandle.x} ${endHandle.y} ${end.x} ${end.y}`;
}

function curvePath(curve: CubicCurve): string {
  return `M${curve.start.x} ${curve.start.y}${curveTo(curve)}`;
}

/** Halfway along a cubic Bezier: (P0 + 3 P1 + 3 P2 + P3) / 8. */
function curveMidpoint({ start, startHandle, endHandle, end }: CubicCurve): Point {
  return {
    x: (start.x + 3 * startHandle.x + 3 * endHandle.x + end.x) / 8,
    y: (start.y + 3 * startHandle.y + 3 * endHandle.y + end.y) / 8,
  };
}

/** mulberry32: a tiny seeded PRNG returning floats in [0, 1). */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let hash = Math.imul(state ^ (state >>> 15), 1 | state);
    hash = (hash + Math.imul(hash ^ (hash >>> 7), 61 | hash)) ^ hash;
    return ((hash ^ (hash >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** One draw from `random` picks an item. */
function pick<T>(items: readonly T[], random: () => number): T {
  return itemAt(items, Math.floor(random() * items.length));
}

function itemAt<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`No item at index ${index}`);
  return item;
}

function distance(from: Point, to: Point): number {
  return Math.hypot(from.x - to.x, from.y - to.y);
}

/** Two decimal places, for animation delays. */
function hundredths(value: number): number {
  return Math.round(value * 100) / 100;
}
