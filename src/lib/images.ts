/** Build-time responsive image helpers (used from .astro frontmatter). */
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

export type ImageFormat = 'avif' | 'webp' | 'jpeg';

/** Widths an image is generated at, capped at the source's intrinsic width. */
export const WIDTHS = {
  fullBleed: [1280, 1920, 2560, 3200, 3840],
  portrait: [640, 960, 1280, 1800, 2400],
  frame: [800, 1280, 1600],
} as const satisfies Record<string, readonly number[]>;

export const MODERN_FORMATS: readonly ImageFormat[] = ['avif', 'webp'];

export async function buildSrcset(image: ImageMetadata, widths: readonly number[], format: ImageFormat): Promise<string> {
  const usable = widths.filter((width) => width <= image.width);
  const targets = usable.length ? usable : [image.width];
  const variants = await Promise.all(targets.map((width) => getImage({ src: image, width, format })));
  return variants.map((variant, index) => `${variant.src} ${targets[index]}w`).join(', ');
}
