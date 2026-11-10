/** Shared between Hero.astro (build time) and hero.client.ts (browser). */

export type Point = readonly [x: number, y: number];

export type NoteId = 'me' | 'bridge';

export interface HeroSceneClient {
  /** null marks the default scene. */
  readonly media: string | null;
  readonly aspect: number;
  readonly objectPosition: Point;
  readonly anchors: Partial<Record<NoteId, Point>>;
}
