/** A moment as read in one timezone. */
export interface ZonedTime {
  readonly date: Date;
  /** Hour of day, 0-23. */
  readonly hour: number;
  /** Short zone name, such as "CST". */
  readonly zone: string;
}

export const SECOND_MS = 1000;
export const MINUTE_MS = 60 * SECOND_MS;
const HOURS_PER_DAY = 24;

/**
 * Calls `onTick` now and then every `tickMs`, re-aligned to the wall clock on every tick so a
 * displayed second or minute turns over on time, even after sleep or background throttling.
 * Returns a stop function.
 */
export function startClock(timeZone: string, tickMs: number, onTick: (time: ZonedTime) => void): () => void {
  const format = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZoneName: 'short', timeZone });
  const tick = () => {
    const date = new Date();
    const parts = format.formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((candidate) => candidate.type === type)?.value ?? '';
    onTick({ date, hour: Number(part('hour')) % HOURS_PER_DAY, zone: part('timeZoneName') });
  };

  let timer = 0;
  const schedule = () => {
    timer = window.setTimeout(
      () => {
        tick();
        schedule();
      },
      tickMs - (Date.now() % tickMs),
    );
  };
  tick();
  schedule();
  return () => window.clearTimeout(timer);
}
