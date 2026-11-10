/** WebGL2 plumbing shared by the fog and the globe. */

export type Rgb = [number, number, number];

/** "#rrggbb" to 0..1 channels. */
export const hexToRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to allocate shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compile failed');
  return shader;
}

/** Compiles and links a program, then makes it current. */
export function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Program link failed');
  gl.useProgram(program);
  return program;
}

/** Calls `draw` with seconds since the last frame, every frame the canvas is on screen. Returns a stop function. */
export function loopWhileVisible(canvas: HTMLCanvasElement, draw: (deltaSeconds: number) => void): () => void {
  let visible = false;
  let frame = 0;
  let last = 0;
  const loop = (now: number) => {
    if (!visible) return;
    draw(last ? Math.min((now - last) / 1000, 0.1) : 0);
    last = now;
    frame = requestAnimationFrame(loop);
  };
  // Entries arrive oldest first and can batch up while the main thread is busy; only the newest is current.
  const observer = new IntersectionObserver((entries) => {
    visible = entries.at(-1)?.isIntersecting ?? false;
    cancelAnimationFrame(frame);
    last = 0;
    if (visible) frame = requestAnimationFrame(loop);
  });
  observer.observe(canvas);
  return () => {
    visible = false;
    observer.disconnect();
    cancelAnimationFrame(frame);
  };
}
