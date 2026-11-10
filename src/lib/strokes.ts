/** Hand-drawn SVG strokes: prime once (hidden), then draw them on with GSAP. */
import { gsap } from './motion';

export function primeStrokes(paths: readonly SVGGeometryElement[]): void {
  for (const path of paths) {
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
  }
}

export function drawStrokes(paths: readonly SVGGeometryElement[], vars: gsap.TweenVars = {}): gsap.core.Tween {
  return gsap.to(paths, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut', ...vars });
}
