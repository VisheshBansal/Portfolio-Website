/** Zero-padded counters: "03", "T-07", "AR-0004". */
export function padNumber(value: number, digits = 2): string {
  return String(value).padStart(digits, '0');
}
