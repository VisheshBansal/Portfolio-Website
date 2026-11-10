/** Anton's set widths, so display type can be sized to fit before any font loads. */

/** Anton advance widths in em. */
const ADVANCE_EM: Readonly<Record<string, number>> = {
  A: 0.485,
  B: 0.479,
  C: 0.474,
  D: 0.493,
  E: 0.412,
  F: 0.399,
  G: 0.485,
  H: 0.499,
  I: 0.227,
  J: 0.466,
  K: 0.472,
  L: 0.397,
  M: 0.746,
  N: 0.498,
  O: 0.486,
  P: 0.472,
  Q: 0.494,
  R: 0.477,
  S: 0.461,
  T: 0.396,
  U: 0.474,
  V: 0.469,
  W: 0.712,
  X: 0.484,
  Y: 0.446,
  Z: 0.41,
  ' ': 0.234,
  '.': 0.229,
  ',': 0.236,
  '&': 0.52,
  '1': 0.331,
};
const DIGIT_EM = 0.494;
const FALLBACK_EM = 0.5;
const TRACKING_EM = 0.005;

/** Set width of `text` in Anton at 1em, to the thousandth. */
export function displayWidthEm(text: string): number {
  const width = [...text.toUpperCase()].reduce(
    (total, char) => total + (ADVANCE_EM[char] ?? (/\d/.test(char) ? DIGIT_EM : FALLBACK_EM)) + TRACKING_EM,
    0,
  );
  return Math.round(width * 1000) / 1000;
}
