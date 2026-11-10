/** City stops: the intro montage plays `route` then `visits`; the journey section's rail follows `route`. */

export interface Tone {
  readonly background: string;
  readonly foreground: string;
}

export interface Stop {
  readonly city: string;
  readonly coords: string;
  /** Personal line shown under the city in the intro montage. */
  readonly note: string;
  /** What the city is known for: the intro's catch. */
  readonly known: string;
  /** Intro frame colours. */
  readonly tone: Tone;
}

/** Study and work cities in chronological order; the journey rail follows them and its last stop is the current city. */
export const route: readonly Stop[] = [
  {
    city: 'Gurugram',
    coords: '28.4595° N, 77.0266° E',
    note: 'where it started',
    known: 'Millennium City',
    tone: { background: '#eea443', foreground: '#1d140a' },
  },
  {
    city: 'Vellore',
    coords: '12.9165° N, 79.1325° E',
    note: 'VIT, GDSC',
    known: 'Fort City',
    tone: { background: '#24407a', foreground: '#eef2fb' },
  },
  {
    city: 'Pune',
    coords: '18.5204° N, 73.8567° E',
    note: 'OneCard',
    known: 'Oxford of the East',
    tone: { background: '#7b2d45', foreground: '#f8eaee' },
  },
  {
    city: 'Bengaluru',
    coords: '12.9716° N, 77.5946° E',
    note: 'Groww, Uptycs',
    known: 'Silicon Valley of India',
    tone: { background: '#2f5f3c', foreground: '#ebf3e6' },
  },
  {
    city: 'Dallas',
    coords: '32.7767° N, 96.7970° W',
    note: 'BalkanID',
    known: 'Big D',
    tone: { background: '#e5533a', foreground: '#0b1117' },
  },
];

/**
 * Cities visited rather than lived in; the intro plays them after the route. San Francisco comes last and lands on
 * fog, so the montage opens straight into the hero photo taken there.
 */
export const visits: readonly Stop[] = [
  {
    city: 'New York',
    coords: '40.7128° N, 74.0060° W',
    note: 'barely slept',
    known: 'The city that never sleeps',
    tone: { background: '#28716b', foreground: '#eef6f4' },
  },
  {
    city: 'San Francisco',
    coords: '37.8199° N, 122.4783° W',
    note: 'the bridge behind me',
    known: 'Fog City',
    tone: { background: '#eaf0f8', foreground: '#c0362c' },
  },
];
