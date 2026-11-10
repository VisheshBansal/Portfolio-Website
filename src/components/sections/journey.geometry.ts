/** 2D primitives shared by the build-time plate art and the browser-side cable. */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Rounds to one decimal place, plenty for SVG coordinates. */
export const tenths = (value: number): number => Math.round(value * 10) / 10;
