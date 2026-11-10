/**
 * Image collections resolved by key (file name without extension), so content refers to
 * `ferrari-monaco` instead of hand-written imports. Adding an image = dropping a file in the folder.
 * Globs must be string literals for Vite's static analysis, hence one line per collection.
 */

import type { ImageMetadata } from 'astro';

interface ImageModule {
  default: ImageMetadata;
}

export interface AssetCollection {
  readonly name: string;
  get(key: string): ImageMetadata;
  has(key: string): boolean;
}

function defineCollection(name: string, modules: Record<string, ImageModule>): AssetCollection {
  const byKey = new Map(
    Object.entries(modules).map(([path, mod]) => [path.slice(path.lastIndexOf('/') + 1).replace(/\.[^.]+$/, ''), mod.default]),
  );
  return {
    name,
    has: (key) => byKey.has(key),
    get(key) {
      const image = byKey.get(key);
      if (!image) {
        const known = [...byKey.keys()].join(', ') || 'none';
        throw new Error(`Unknown ${name} image "${key}". Add src/assets/${name}/${key}.<ext> (known: ${known}).`);
      }
      return image;
    },
  };
}

export const heroImages = defineCollection(
  'hero',
  import.meta.glob<ImageModule>('../assets/hero/*.{jpg,jpeg,png,webp,avif}', { eager: true }),
);

export const reelImages = defineCollection(
  'reel',
  import.meta.glob<ImageModule>('../assets/reel/*.{jpg,jpeg,png,webp,avif}', { eager: true }),
);
