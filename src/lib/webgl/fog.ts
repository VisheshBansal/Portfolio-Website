/**
 * Procedural fog: domain-warped fBm noise in a single full-screen fragment shader.
 * Fog is soft, so it renders at a fraction of the CSS size and the browser upscales it.
 *
 * - `ambient` drifts wisps across the upper frame and parts around the pointer.
 * - `cover` is a curtain driven by `density` (0 clear, 1 opaque) with a noisy, organic edge.
 */
import { createProgram, hexToRgb, loopWhileVisible } from './shared';

export type FogMode = 'ambient' | 'cover';

export interface FogState {
  /** cover: 0 = clear, 1 = opaque. */
  density: number;
  /** Pointer position in 0..1 viewport space (y down). */
  pointerX: number;
  pointerY: number;
  /** ambient: extra thickness on top of the base wisps. */
  boost: number;
}

export interface Fog {
  readonly state: FogState;
  render(): void;
  setColor(hex: string): void;
  destroy(): void;
}

export interface FogOptions {
  mode: FogMode;
  color: string;
  density?: number;
  /** Render resolution relative to CSS pixels. */
  resolution?: number;
  /** When false, renders a single still frame (reduced motion). */
  animate?: boolean;
}

const DEFAULT_RESOLUTION = 0.5;
const MIN_CANVAS_PX = 2;
const COVER_OFF_THRESHOLD = 0.001;

const VERTEX_SHADER = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uDensity;
uniform float uCover;
uniform vec2 uPointer;
uniform float uBoost;
uniform vec3 uColor;
out vec4 fragColor;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float value = 0.0, amplitude = 0.5;
  mat2 rotate = mat2(1.6, 1.2, -1.2, 1.6);
  for (int octave = 0; octave < 5; octave++) { value += amplitude * noise(p); p = rotate * p; amplitude *= 0.5; }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * 2.3;
  float t = uTime * 0.045;
  vec2 warp = vec2(fbm(p + vec2(t, 0.0)), fbm(p + vec2(4.1, 1.7) - vec2(t * 0.6, 0.0)));
  float field = fbm(p + 1.8 * warp + vec2(t * 1.5, t * 0.15));
  float pointerHole = 1.0 - smoothstep(0.0, 0.26, length((uv - uPointer) * vec2(aspect, 1.0)));
  float density;
  if (uCover < 0.5) {
    float sky = smoothstep(0.15, 0.95, uv.y);
    density = smoothstep(0.44, 0.84, field) * mix(0.2, 0.8, sky);
    density *= (0.6 + uBoost) * (1.0 - 0.8 * pointerHole);
  } else {
    float threshold = 1.0 - uDensity;
    float edge = field * 0.85 + 0.15 * (1.0 - uv.y);
    density = smoothstep(threshold - 0.22, threshold + 0.04, edge);
    density = max(density, smoothstep(0.86, 1.0, uDensity));
    density *= step(0.001, uDensity);
  }
  density = clamp(density, 0.0, 1.0);
  fragColor = vec4(uColor * density, density);
}`;

/** Returns null when WebGL2 is unavailable; callers fall back to static CSS. */
export function createFog(canvas: HTMLCanvasElement, options: FogOptions): Fog | null {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return null;

  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);

  // One oversized triangle covers the viewport with no diagonal seam.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const uniforms = {
    resolution: uniform('uResolution'),
    time: uniform('uTime'),
    density: uniform('uDensity'),
    cover: uniform('uCover'),
    pointer: uniform('uPointer'),
    boost: uniform('uBoost'),
    color: uniform('uColor'),
  };
  const isCover = options.mode === 'cover';
  gl.uniform1f(uniforms.cover, isCover ? 1 : 0);
  gl.uniform3fv(uniforms.color, hexToRgb(options.color));

  const state: FogState = { density: options.density ?? 1, pointerX: 0.5, pointerY: 0.5, boost: 0 };
  const resolution = options.resolution ?? DEFAULT_RESOLUTION;
  const startedAt = performance.now();

  const render = () => {
    // A cleared cover costs nothing: hide it instead of drawing transparent pixels.
    const idle = isCover && state.density <= COVER_OFF_THRESHOLD;
    canvas.style.visibility = idle ? 'hidden' : 'visible';
    if (idle || !canvas.clientWidth || !canvas.clientHeight) return;
    const width = Math.max(MIN_CANVAS_PX, Math.round(canvas.clientWidth * resolution));
    const height = Math.max(MIN_CANVAS_PX, Math.round(canvas.clientHeight * resolution));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform1f(uniforms.time, (performance.now() - startedAt) / 1000);
    gl.uniform1f(uniforms.density, state.density);
    gl.uniform2f(uniforms.pointer, state.pointerX, 1 - state.pointerY);
    gl.uniform1f(uniforms.boost, state.boost);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const stop = options.animate === false ? () => undefined : loopWhileVisible(canvas, render);
  render();

  return {
    state,
    render,
    setColor(hex) {
      gl.useProgram(program);
      gl.uniform3fv(uniforms.color, hexToRgb(hex));
      render();
    },
    destroy() {
      stop();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
