/** Intro montage contract. The pre-paint bootstrap in Base.astro mirrors these names. */
export const INTRO_ACTIVE_CLASS = 'intro-on';
export const INTRO_SEEN_KEY = 'vb-intro';
/** Fired as the montage starts: the bootstrap failsafe stands down, since the intro now owns the reveal. */
export const INTRO_START_EVENT = 'vb:intro-start';

/** Clears the "seen" flag and reloads so the montage plays again. */
export function replayIntro(): void {
  try {
    sessionStorage.removeItem(INTRO_SEEN_KEY);
  } catch {
    // Nothing to clear.
  }
  window.location.reload();
}
