/** Voice and humour: every playful line on the site lives here so it can be edited in one place. */

import type { Tone } from './route';

export interface ReelShot {
  /** Key of an image in src/assets/reel (file name without extension). */
  readonly image: string;
  readonly caption: string;
  readonly alt: string;
}

export interface Ambition {
  readonly text: string;
  readonly done: boolean;
  readonly note?: string;
  readonly draft?: boolean;
}

export type ReviewDecision = 'Approved' | 'Denied' | 'Pending review' | 'Approved with written permission';

export interface AccessRequest {
  readonly request: string;
  readonly decision: ReviewDecision;
  readonly note: string;
}

export interface Reel {
  readonly shots: readonly ReelShot[];
  readonly beats: readonly [setup: string, punchline: string];
  readonly kicker: string;
}

export interface Travel {
  readonly kicker: string;
  readonly note: string;
  readonly hint: string;
  readonly hintTouch: string;
  readonly pause: string;
  readonly play: string;
}

export interface Icebreaker {
  /** What it is about, printed on the ticket. */
  readonly topic: string;
  /** The invitation printed on the ticket. */
  readonly prompt: string;
  /** The same question in the visitor's voice: the email's subject. */
  readonly subject: string;
  /** Ticket colours, taken from the intro's city frames. */
  readonly tone: Tone;
  /**
   * Tickets that also play on the page: 'roll' spins through the globe's places, 'rev' revs to a short answer, and
   * 'repeat' shows the top track from /api/on-repeat (this week's, else the newest Last.fm chart window with plays);
   * until the endpoint answers, the ticket is a plain mail link.
   */
  readonly play?: 'roll' | 'rev' | 'repeat';
}

/** A ticket's on-page play: its button label, the button's spoken name, and the line printed over the result. */
export interface TicketPlay {
  readonly label: string;
  readonly aria: string;
  readonly admit: string;
}

export interface Icebreakers {
  readonly kicker: string;
  readonly title: readonly string[];
  readonly note: string;
  readonly lead: string;
  readonly admit: string;
  readonly send: string;
  /** Starts every subject line, so the inbox shows where it came from. */
  readonly subjectPrefix: string;
  /** Read after each ticket's question, before the first name. */
  readonly opens: string;
  /** The spin also rewrites the email: this subject, then the place it landed on. */
  readonly roll: TicketPlay & { readonly subject: string };
  readonly rev: TicketPlay & { readonly answer: string };
  /**
   * The track rewrites the email too; `by` joins track and artist when read aloud, `plays` counts one or many, and
   * `windows` names the Last.fm chart window when it is not this week (only this week's track is "on repeat").
   */
  readonly repeat: TicketPlay & {
    readonly subject: string;
    readonly by: string;
    readonly plays: readonly [one: string, many: string];
    readonly windows: Readonly<Record<string, string>>;
  };
  readonly tickets: readonly Icebreaker[];
}

export interface NotFound {
  readonly code: string;
  readonly title: readonly string[];
  readonly body: string;
  readonly cta: string;
  readonly note: string;
}

export interface Manifesto {
  readonly title: string;
  readonly body: readonly string[];
  readonly oath: readonly [claim: string, twist: string];
}

export const heroLines: readonly string[] = [
  'builds products from zero.',
  'secures them before anyone breaks in.',
  'leads the people who make them real.',
];

export const roles: readonly string[] = [
  'Founding engineer',
  'Security engineer',
  'Threat hunter',
  'Community lead',
  'Director',
  'Customer success',
  'Builder at heart',
];

/** The Ferrari interlude: film cuts first, then the punchline. */
export const reel: Reel = {
  shots: [
    { image: 'ferrari-monaco', caption: 'Reel 01 · Monaco, eventually', alt: 'A classic Ferrari parked on a wet Monaco street at dusk' },
    { image: 'coast-road', caption: 'Reel 02 · The long way home', alt: 'Gloved hands on a wooden steering wheel above a coast road' },
    { image: 'open-gate', caption: 'Reel 03 · Manual, obviously', alt: 'A chrome open-gate gear shifter' },
    {
      image: 'showroom',
      caption: 'Reel 04 · Window shopping, for now',
      alt: 'A silhouette looking at a Ferrari through a showroom window at night',
    },
  ],
  beats: ['Professionally ambitious.', 'Financially Ferrari-motivated.'],
  kicker: "Working hard because Ferraris don't buy themselves.",
};

export const contactPitch = 'I bring the ideas. You bring the opportunities. Ferrari brings the happiness.';

/** Footer lines under the copyright: the colophon, then a hobbies list. */
export const footerNotes = {
  built: 'Built with love and coffee.',
  hobbies: 'Off the clock: films, books, music, travel and digital art.',
} as const;

export const manifesto: Manifesto = {
  title: "I'm your person to get sh*t done",
  body: [
    "I've built a product from its first commit and kept it standing. I've taught a scanner to read apps people swore were locked. I've turned security alerts that shouted over each other into one clear signal. I've sat across from customers and made the scary parts boring.",
    "Name it, I've probably done it. If not, give me a weekend.",
  ],
  oath: ["Big or small, I don't do mediocre.", "Or I don't do it at all."],
};

/** Ambition checklist in display order: `done` items render crossed off; `draft` marks placeholder copy. */
export const ambitions: readonly Ambition[] = [
  { text: 'Lead a Google developer club', done: true },
  { text: 'Be a founding engineer', done: true },
  { text: 'Put my name on a patent', done: true },
  { text: 'Move to the US', done: true },
  { text: 'See the Golden Gate', done: true, note: 'in fog, obviously' },
  { text: 'Go skydiving', done: false },
  { text: 'Learn Spanish past una cerveza, por favor', done: false, draft: true },
  { text: 'Build something that outlives me', done: false, draft: true },
];

/** "Before you ask" FAQ styled as an access review: each request gets a decision and a note. Drafts. */
export const accessReview: readonly AccessRequest[] = [
  { request: 'Can he take something from zero to one?', decision: 'Approved', note: 'Founding engineer at BalkanID since 2022.' },
  { request: 'Will he say yes to everything?', decision: 'Denied', note: 'Ask for an honest answer. You will get one.' },
  { request: 'Can he talk to customers without a script?', decision: 'Approved', note: 'He runs customer success. Globally.' },
  {
    request: 'Can he break into your app?',
    decision: 'Approved with written permission',
    note: 'Product security at Groww, threat intel at Uptycs.',
  },
  { request: 'Is he reachable at 2am?', decision: 'Pending review', note: 'Depends on the incident.' },
  { request: 'Favourite colour?', decision: 'Approved', note: '#7CFC06. It is hiding somewhere on this page.' },
];

/** The 404 page. Drafts. */
export const notFound: NotFound = {
  code: 'Error 404 · Visibility: zero',
  title: ['Lost in', 'the fog.'],
  body: "This page doesn't exist, or the fog got to it first. The bridge is still standing, though.",
  cta: 'Back to the bridge',
  note: "Could be worse. Could've been a 403.",
};

/** The travel globe. Drafts. */
export const travel: Travel = {
  kicker: 'Passport',
  note: 'and counting',
  hint: 'Hover a pin or an arc. Drag to spin.',
  hintTouch: 'Tap a pin or an arc. Drag to spin.',
  pause: 'Pause globe',
  play: 'Play globe',
};

/** Icebreakers section: headline, ticket deck and play labels. Each ticket opens a mailto with its subject. Drafts. */
export const icebreakers: Icebreakers = {
  kicker: 'Off the clock',
  title: ['Films. Books.', 'Music. Flights.'],
  note: 'certified cinephile',
  lead: 'Icebreakers. Pick one and send it my way.',
  admit: 'Admit one',
  send: 'Send',
  subjectPrefix: 'Icebreaker:',
  opens: 'Opens an email to',
  roll: { label: 'Spin', aria: "Spin for a place I've been", admit: 'Been there', subject: 'Tell me about' },
  rev: { label: 'Rev', aria: 'Rev for the short answer', admit: 'Short answer', answer: 'Ferrari brings the happiness.' },
  repeat: {
    label: 'Play',
    aria: "Play what's on repeat",
    admit: 'On repeat',
    subject: 'Tell me about',
    by: 'by',
    plays: ['play', 'plays'],
    windows: {
      '1month': 'Past month',
      '3month': 'Past 3 months',
      '6month': 'Past 6 months',
      '12month': 'Past year',
      overall: 'All time',
    },
  },
  tickets: [
    {
      topic: 'Films',
      prompt: 'Ask me what to watch tonight.',
      subject: 'What should I watch tonight?',
      tone: { background: '#24407a', foreground: '#eef2fb' },
    },
    {
      topic: 'Films',
      prompt: 'Ask me for my top five films.',
      subject: 'What are your top five films?',
      tone: { background: '#7b2d45', foreground: '#f8eaee' },
    },
    {
      topic: 'Books',
      prompt: "Ask me what I'm reading.",
      subject: 'What are you reading?',
      tone: { background: '#2f5f3c', foreground: '#ebf3e6' },
    },
    {
      topic: 'Music',
      prompt: "Ask me what's on repeat.",
      subject: "What's on repeat?",
      tone: { background: '#eea443', foreground: '#1d140a' },
      play: 'repeat',
    },
    {
      topic: 'Travel',
      prompt: 'Ask me where to go next.',
      subject: 'Where should I go next?',
      tone: { background: '#28716b', foreground: '#eef6f4' },
      play: 'roll',
    },
    {
      topic: 'Ferraris',
      prompt: 'Ask me why Ferraris.',
      subject: 'Why Ferraris?',
      tone: { background: '#e5533a', foreground: '#0b1117' },
      play: 'rev',
    },
  ],
};
