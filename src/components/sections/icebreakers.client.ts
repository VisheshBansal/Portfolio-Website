/**
 * The headline rises line by line; then, once the deck itself is in view, the tickets are dealt at their own tilts. Three
 * tickets also play: the travel ticket spins through the globe's places like a departures board and lands on one, the
 * Ferrari ticket revs, out loud, before rolling over to its answer, and the music ticket, when the site's Last.fm
 * endpoint answers, beats twice and rolls in the top track it returns.
 */
import { places } from '../../data/travel';
import { displayWidthEm } from '../../lib/anton';
import { query, queryAll, readDataset, readDatasetJson, setText } from '../../lib/dom';
import { playRev, primeRev } from '../../lib/engine';
import { fontsReady, gsap, reducedMotion } from '../../lib/motion';
import { RISE_FROM, rollText, splitMaskedLines, type Roll } from '../../lib/text';

/** The deck has its own trigger: on phones it sits well below the headline. */
const TRIGGER_START = { head: 'top 70%', deck: 'top 85%' } as const;
/** Tickets fly in from below, spun the other way, and settle with a little overshoot. */
const DEAL = { y: 90, spin: 10, duration: 0.95, stagger: 0.08 } as const;
/** The spin flicks through places faster than they can be read, slowing down before it lands. */
const SPIN = { flicks: 12, firstGap: 0.05, lastGap: 0.2 } as const;
const FLICK: Roll = { fromYPercent: 60, duration: 0.16 };
const LAND: Roll = { fromYPercent: 80, duration: 0.6 };
/** A jolt before a reveal: its keyframes, its length, and how far through it the new text rolls in. */
interface Jolt {
  readonly vars: gsap.TweenVars;
  readonly duration: number;
  readonly swapAt: number;
}
/** The rev: a quick side-to-side shudder. */
const REV: Jolt = { vars: { keyframes: { x: [-4, 4, -3, 3, -2, 1, 0] } }, duration: 0.42, swapAt: 0.55 };
/** The beat: two quick pulses, like a kick drum. */
const BEAT: Jolt = { vars: { keyframes: { scale: [1, 1.035, 1, 1.035, 1] } }, duration: 0.5, swapAt: 0.6 };
/** How close to the viewport a ticket comes before its slow work (a fetch, a render) starts. */
const NEAR_VIEW = '600px 0px';
/** The site's Last.fm endpoint, asked once when the music ticket nears view. */
const ON_REPEAT = { endpoint: '/api/on-repeat', margin: NEAR_VIEW } as const;

export function initIcebreakers(): void {
  const section = query('[data-icebreakers]');
  const live = query('[data-icebreakers-live]', section);
  for (const ticket of queryAll('[data-play]', section)) {
    if (ticket.dataset.play === 'roll') bindSpin(ticket, live);
    else if (ticket.dataset.play === 'rev') bindRev(ticket, live);
    else bindRepeat(ticket, live);
  }
  if (!reducedMotion) void animateIn(section);
}

async function animateIn(section: HTMLElement): Promise<void> {
  await fontsReady();
  const title = splitMaskedLines(query('[data-icebreakers-title]', section));
  gsap
    .timeline({ scrollTrigger: { trigger: section, start: TRIGGER_START.head } })
    .from(title.lines, { ...RISE_FROM, duration: 1.1, stagger: 0.09, ease: 'expo.out', onComplete: () => title.revert() })
    .from(queryAll('[data-icebreakers-reveal]', section), { y: 22, autoAlpha: 0, duration: 0.9, stagger: 0.1, ease: 'expo.out' }, 0.2);

  const deck = query('[data-icebreakers-deck]', section);
  const deal = gsap.timeline({ scrollTrigger: { trigger: deck, start: TRIGGER_START.deck } });
  queryAll('[data-ticket]', deck).forEach((ticket, index) => {
    // The hover transition would chase every frame of the deal, so each ticket gets it back once it lands.
    ticket.style.transition = 'none';
    deal.from(
      ticket,
      {
        y: DEAL.y,
        rotation: index % 2 ? DEAL.spin : -DEAL.spin,
        // Opacity, not visibility: a ticket that has not been dealt yet stays in the tab order.
        opacity: 0,
        duration: DEAL.duration,
        ease: 'back.out(1.4)',
        clearProps: 'transform,opacity',
        onComplete: () => {
          ticket.style.transition = '';
        },
      },
      index * DEAL.stagger,
    );
  });
}

/** The parts of a playable ticket that change. */
function ticketParts(ticket: HTMLElement) {
  return {
    button: query<HTMLButtonElement>('[data-ticket-play]', ticket),
    text: query('[data-ticket-text]', ticket),
    admit: query('[data-ticket-admit]', ticket),
    link: query<HTMLAnchorElement>('[data-ticket-link]', ticket),
  };
}

/** Plays a jolt on a ticket and swaps its text partway through; without one (going back, or reduced motion) it swaps at once. */
function jolt(ticket: HTMLElement, play: Jolt | null, swap: () => void): void {
  if (!play || reducedMotion || gsap.isTweening(ticket)) {
    swap();
    return;
  }
  // The hover transition would smear the jolt, so it steps aside until the jolt is over.
  ticket.style.transition = 'none';
  gsap
    .timeline({
      onComplete: () => {
        gsap.set(ticket, { clearProps: 'transform' });
        ticket.style.transition = '';
      },
    })
    .to(ticket, { ...play.vars, duration: play.duration, ease: 'none' })
    .call(swap, [], play.duration * play.swapAt);
}

/** "Where should I go next?": a departures board of every place on the globe, landing on one. */
function bindSpin(ticket: HTMLElement, live: HTMLElement): void {
  const { button, text, admit, link } = ticketParts(ticket);
  const [inbox, subject, beenThere] = [readDataset(ticket, 'inbox'), readDataset(ticket, 'subject'), readDataset(ticket, 'admit')];
  let current = -1;
  let spin: gsap.core.Timeline | null = null;

  /** Prints a place as the ticket's line; CSS keeps it to one line from its Anton width, through any resize. */
  const show = (name: string, roll: Roll) => {
    const label = name.endsWith('.') ? name : `${name}.`;
    text.setAttribute('data-fit', '');
    text.style.setProperty('--em', String(displayWidthEm(label)));
    rollText(text, label, roll);
  };
  const land = (index: number) => {
    const place = places[index];
    if (!place) return;
    const cityState = place.country === place.name;
    show(place.name, LAND);
    setText(admit, cityState ? beenThere : `${beenThere} · ${place.country}`);
    link.href = `${inbox}?subject=${encodeURIComponent(`${subject} ${place.name}`)}`;
    setText(live, `${beenThere}: ${cityState ? place.name : `${place.name}, ${place.country}`}.`);
  };

  button.addEventListener('click', () => {
    spin?.kill();
    // Never land on the same place twice running.
    const pick = Math.floor(Math.random() * places.length);
    current = pick === current ? (pick + 1) % places.length : pick;
    if (reducedMotion) {
      land(current);
      return;
    }
    const timeline = gsap.timeline();
    let at = 0;
    for (let flick = 0; flick < SPIN.flicks; flick++) {
      const decoy = places[Math.floor(Math.random() * places.length)];
      if (decoy) timeline.call(show, [decoy.name, FLICK], at);
      at += SPIN.firstGap + (SPIN.lastGap - SPIN.firstGap) * (flick / (SPIN.flicks - 1)) ** 2;
    }
    timeline.call(land, [current], at);
    spin = timeline;
  });
}

/** "Why Ferraris?": the ticket shudders to a V12's rev, then rolls over to its short answer; press again to go back. */
function bindRev(ticket: HTMLElement, live: HTMLElement): void {
  const { button, text, admit } = ticketParts(ticket);
  const [answer, shortAnswer] = [readDataset(ticket, 'answer'), readDataset(ticket, 'admit')];
  const question = { text: text.textContent.trim(), admit: admit.textContent.trim() };
  let revealed = false;

  const swap = () => {
    text.toggleAttribute('data-long', revealed);
    rollText(text, revealed ? answer : question.text, LAND);
    setText(admit, revealed ? shortAnswer : question.admit);
    // Cleared on the way back, so the next reveal is a change and gets read out again.
    setText(live, revealed ? `${shortAnswer}: ${answer}` : '');
  };

  // The rev renders in a worker as the ticket nears view, so it is ready by the time anyone presses Rev.
  const warm = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      warm.disconnect();
      void primeRev();
    },
    { rootMargin: NEAR_VIEW },
  );
  warm.observe(ticket);
  button.addEventListener('click', () => {
    revealed = !revealed;
    button.setAttribute('aria-pressed', String(revealed));
    jolt(ticket, revealed ? REV : null, swap);
    // The engine is heard on the way in only.
    if (revealed) playRev();
  });
}

/** The endpoint's answer: the most played Last.fm track of the newest chart window with plays (`period`, e.g. '7day'). */
interface OnRepeat {
  readonly track: string;
  readonly artist: string;
  readonly plays: number;
  readonly period?: string;
}

const isOnRepeat = (value: unknown): value is OnRepeat => {
  if (typeof value !== 'object' || value === null) return false;
  const { track, artist, plays } = value as Record<string, unknown>;
  return (
    typeof track === 'string' &&
    track.trim() !== '' &&
    typeof artist === 'string' &&
    artist.trim() !== '' &&
    Number.isInteger(plays) &&
    Number(plays) > 0
  );
};

/**
 * "What's on repeat?": asks the site's Last.fm endpoint once, as the ticket nears view. With an answer, the Play button
 * appears in place of Send, and pressing it beats the ticket and rolls in the track; press again to go back. With no
 * answer (no endpoint, no key, nothing played) the ticket stays a plain mail link.
 */
function bindRepeat(ticket: HTMLElement, live: HTMLElement): void {
  const { button, text, admit, link } = ticketParts(ticket);
  const send = query('[data-ticket-send]', ticket);
  const [inbox, subject, onRepeat] = [readDataset(ticket, 'inbox'), readDataset(ticket, 'subject'), readDataset(ticket, 'admit')];
  const {
    by,
    plays: count,
    windows,
  } = readDatasetJson<{
    by: string;
    plays: readonly [string, string];
    windows: Readonly<Record<string, string>>;
  }>(ticket, 'repeat');
  const question = { text: text.textContent.trim(), admit: admit.textContent.trim(), href: link.href };
  let song: OnRepeat | null = null;
  let revealed = false;

  const swap = () => {
    if (!song) return;
    const plays = `${song.plays} ${song.plays === 1 ? count[0] : count[1]}`;
    const [track, artist] = [song.track.trim(), song.artist.trim()];
    // "On repeat" only for the 7-day chart; an older window is named instead (copy.repeat.windows).
    const when = (song.period && windows[song.period]) || onRepeat;
    text.toggleAttribute('data-long', revealed);
    rollText(text, revealed ? `${track} · ${artist}` : question.text, LAND);
    setText(admit, revealed ? `${when} · ${plays}` : question.admit);
    link.href = revealed ? `${inbox}?subject=${encodeURIComponent(`${subject} ${track}`)}` : question.href;
    setText(live, revealed ? `${when}: ${track} ${by} ${artist}, ${plays}.` : '');
  };

  const ask = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      ask.disconnect();
      fetch(ON_REPEAT.endpoint, { headers: { accept: 'application/json' } })
        .then((response) => (response.ok ? (response.json() as Promise<unknown>) : null))
        .then((answer) => {
          if (!isOnRepeat(answer)) return;
          song = answer;
          button.hidden = false;
          send.hidden = true;
        })
        // Anything but a good answer leaves the plain mail link.
        .catch(() => undefined);
    },
    { rootMargin: ON_REPEAT.margin },
  );
  ask.observe(ticket);

  button.addEventListener('click', () => {
    revealed = !revealed;
    button.setAttribute('aria-pressed', String(revealed));
    jolt(ticket, revealed ? BEAT : null, swap);
  });
}
