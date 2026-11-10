/**
 * The rail's suspension cable: a tower between neighbouring cards, a parabolic sag over each card and hangers
 * dropping to it. Pure geometry over measured boxes; the client does every layout read and write.
 */
import { tenths, type Point } from './journey.geometry';

/** Horizontal edges in track coordinates, vertical edges in stage coordinates. */
export interface Box {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface CableLayout {
  /** Top of the band the cable hangs in, in stage coordinates. */
  readonly bandTop: number;
  /** From the band top down to the cards. */
  readonly bandHeight: number;
  /** Cable height at every tower, from the band top. */
  readonly peakY: number;
  /** x of the first tower, where the traveler rests. */
  readonly start: number;
  /** x of the last tower, where the ride ends. */
  readonly end: number;
  /** Cable height at a track x, from the band top. */
  readonly yAt: (x: number) => number;
  readonly cablePath: string;
  readonly hangersPath: string;
  readonly towersPath: string;
}

/** The stretch of cable between two towers, hanging over one card. */
interface Span {
  readonly from: number;
  readonly to: number;
  readonly card: Box;
}

/** The cable peaks 22% down its band and sags to within a clearance of the cards. */
const BAND = { minHeightPx: 48, peakRatio: 0.22, minClearancePx: 12, clearanceRatio: 0.13 } as const;
/** A lone card has no neighbour to measure the gap against. */
const LONE_CARD_GAP_PX = 40;
/** Towers rise this far above the cable's peak. */
const TOWER_RISE_PX = 14;
/** One hanger per 22nd of the card width (clamped), centred across 86% of it. */
const HANGERS = { widthDivisor: 22, minSpacingPx: 26, maxSpacingPx: 46, coverage: 0.86, belowCablePx: 1.5 } as const;
const RING_RADIUS = 5;
const STATION_DOT_RADIUS = 4.5;

/** Lays the cable over the cards, hanging in a band that starts at `bandTop`. */
export function layoutCable(cards: readonly Box[], bandTop: number): CableLayout {
  const spans = spansOver(cards);
  const firstSpan = spans[0];
  const lastSpan = spans.at(-1);
  if (!firstSpan || !lastSpan) throw new Error('The rail needs at least one card');

  const bandHeight = Math.max(BAND.minHeightPx, firstSpan.card.top - bandTop);
  const peakY = bandHeight * BAND.peakRatio;
  const sag = bandHeight - Math.max(BAND.minClearancePx, bandHeight * BAND.clearanceRatio) - peakY;
  const yAt = (x: number): number => {
    const span = spans.find((candidate) => x <= candidate.to) ?? lastSpan;
    const fraction = Math.min(1, Math.max(0, (x - span.from) / (span.to - span.from)));
    // 4u(1 - u) runs from 0 at the towers to 1 at mid-span.
    return peakY + 4 * sag * fraction * (1 - fraction);
  };
  const towers = [firstSpan.from, ...spans.map((span) => span.to)];

  return {
    bandTop,
    bandHeight,
    peakY,
    start: firstSpan.from,
    end: lastSpan.to,
    yAt,
    cablePath: cablePath(spans, firstSpan.from, peakY, sag),
    hangersPath: hangersPath(spans, yAt, bandHeight),
    towersPath: towersPath(towers, bandTop + peakY - TOWER_RISE_PX, firstSpan.card.bottom),
  };
}

/** The planned route: towers, then the dotted cable with a ring at every label and at the last tower. */
export function planMarkup(cable: CableLayout, labels: readonly Point[]): string {
  const rings = [...labels, { x: cable.end, y: cable.peakY }].map((center) => circleMarkup('jy-ring', center, RING_RADIUS)).join('');
  return `<path class="jy-tower" d="${cable.towersPath}"/><g transform="translate(0 ${tenths(cable.bandTop)})"><path class="jy-plan" d="${cable.cablePath}"/>${rings}</g>`;
}

/** The cable as built: hangers, the cable itself and a dot at every station. */
export function builtMarkup(cable: CableLayout, stations: readonly Point[]): string {
  const dots = stations.map((center) => circleMarkup('jy-stop', center, STATION_DOT_RADIUS)).join('');
  return `<path class="jy-hang" d="${cable.hangersPath}"/><path class="jy-cable" d="${cable.cablePath}"/>${dots}`;
}

/** One span per card; towers stand midway between neighbours and half a gap beyond each end. */
function spansOver(cards: readonly Box[]): Span[] {
  const [first, second] = cards;
  const gap = first && second ? second.left - first.right : LONE_CARD_GAP_PX;
  return cards.map((card, index) => {
    const previous = cards[index - 1];
    const next = cards[index + 1];
    return {
      from: previous ? (previous.right + card.left) / 2 : card.left - gap / 2,
      to: next ? (card.right + next.left) / 2 : card.right + gap / 2,
      card,
    };
  });
}

/** A quadratic Bezier per span; a control point at twice the sag puts the low point at mid-span. */
function cablePath(spans: readonly Span[], start: number, peakY: number, sag: number): string {
  const towerY = tenths(peakY);
  const controlY = tenths(peakY + 2 * sag);
  const curves = spans.map((span) => `Q${tenths((span.from + span.to) / 2)} ${controlY} ${tenths(span.to)} ${towerY}`);
  return `M${tenths(start)} ${towerY}${curves.join('')}`;
}

/** Evenly spaced hangers from just under the cable down to each card. */
function hangersPath(spans: readonly Span[], yAt: (x: number) => number, bandHeight: number): string {
  const bottom = tenths(bandHeight);
  let path = '';
  for (const { card } of spans) {
    const width = card.right - card.left;
    const spacing = Math.min(HANGERS.maxSpacingPx, Math.max(HANGERS.minSpacingPx, width / HANGERS.widthDivisor));
    const count = Math.floor((width * HANGERS.coverage) / spacing);
    const firstX = card.left + (width - count * spacing) / 2;
    for (let index = 0; index <= count; index++) {
      const x = firstX + index * spacing;
      path += `M${tenths(x)} ${tenths(yAt(x) + HANGERS.belowCablePx)}V${bottom}`;
    }
  }
  return path;
}

function towersPath(towers: readonly number[], top: number, bottom: number): string {
  return towers.map((x) => `M${tenths(x)} ${tenths(top)}V${tenths(bottom)}`).join('');
}

function circleMarkup(className: string, center: Point, radius: number): string {
  return `<circle class="${className}" cx="${tenths(center.x)}" cy="${tenths(center.y)}" r="${radius}"/>`;
}
