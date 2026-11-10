/** Site footer: the outlined wordmark rises as the page bottoms out; the favourite-colour swatch. */
import { gsap, reducedMotion } from '../../lib/motion';
import { query } from '../../lib/dom';

const WORDMARK = { risePercent: 45, scrub: 0.5 } as const;

export function initSiteFooter(): void {
  const footer = query('[data-site-footer]');
  if (!reducedMotion) raiseWordmark(footer);
  bindSwatch(query('[data-egg]', footer));
}

function raiseWordmark(footer: HTMLElement): void {
  gsap.fromTo(
    query('[data-footer-mark]', footer),
    { yPercent: WORDMARK.risePercent },
    { yPercent: 0, ease: 'none', scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom bottom', scrub: WORDMARK.scrub } },
  );
}

/** Hover or focus previews the swatch, a click pins it open, Escape dismisses it. */
function bindSwatch(egg: HTMLElement): void {
  const button = query<HTMLButtonElement>('[data-egg-btn]', egg);
  const close = () => egg.removeAttribute('data-open');
  const undismiss = () => egg.removeAttribute('data-dismissed');
  const isEngaged = () => egg.matches(':hover') || egg.hasAttribute('data-open') || egg.contains(document.activeElement);

  button.addEventListener('click', () => {
    egg.toggleAttribute('data-open');
    undismiss();
  });
  button.addEventListener('blur', () => {
    close();
    undismiss();
  });
  egg.addEventListener('pointerleave', undismiss);
  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && !egg.contains(event.target)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isEngaged()) return;
    close();
    egg.setAttribute('data-dismissed', '');
  });
}
