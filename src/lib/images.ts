import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

/** The full-size WebP the gallery viewer opens; structured data cites the same file. */
export function getEnlargedImage(src: ImageMetadata) {
  return getImage({ src, width: Math.min(2400, src.width), format: 'webp', quality: 85 });
}
