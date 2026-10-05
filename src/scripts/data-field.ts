const canvas = document.querySelector<HTMLCanvasElement>('#data-canvas');
const button = document.querySelector<HTMLButtonElement>('.motion-toggle');

// Without WebGL the hero keeps its static background and the motion toggle stays hidden.
const webgl =
  canvas && button
    ? canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        depth: false,
        premultipliedAlpha: true,
        powerPreference: 'high-performance',
      })
    : null;

// ========================================================================
// 0. WEBGL DIAGNOSTICS
// ========================================================================
// Raw WebGL fails silently: a bad shader, a misspelled attribute, or a NaN
// matrix all just draw nothing. These helpers turn those cases into errors
// that name the cause. The per-frame checks run in development only, since
// gl.getError() stalls the GPU pipeline.

const GL_ERRORS: Record<number, string> = {
  0x0500: 'INVALID_ENUM',
  0x0501: 'INVALID_VALUE',
  0x0502: 'INVALID_OPERATION',
  0x0505: 'OUT_OF_MEMORY',
  0x0506: 'INVALID_FRAMEBUFFER_OPERATION',
  0x9242: 'CONTEXT_LOST_WEBGL',
};

function checkGl(gl: WebGLRenderingContext, step: string): void {
  if (!import.meta.env.DEV) return;
  const code = gl.getError();
  if (code !== gl.NO_ERROR) {
    throw new Error(`WebGL ${GL_ERRORS[code] ?? `error 0x${code.toString(16)}`} after ${step}`);
  }
}

function checkFinite(name: string, values: Float32Array): void {
  if (!import.meta.env.DEV) return;
  if (!values.every(Number.isFinite)) {
    throw new Error(`${name} contains NaN or Infinity: [${Array.from(values).join(', ')}]`);
  }
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    // Driver logs cite line numbers, so print the source with them alongside.
    const numbered = source
      .split('\n')
      .map((line, i) => `${String(i + 1).padStart(3)} | ${line}`)
      .join('\n');
    const kind = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
    throw new Error(
      `${kind} shader failed to compile:\n${gl.getShaderInfoLog(shader)}\n${numbered}`,
    );
  }
  return shader;
}

function linkProgram(gl: WebGLRenderingContext, vertex: string, fragment: string): WebGLProgram {
  const program = gl.createProgram()!;
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new Error(`Shader program failed to link:\n${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

// A name the shader never uses is optimized away and reported as missing,
// which otherwise leaves its data silently unbound.
function attribute(gl: WebGLRenderingContext, program: WebGLProgram, name: string): number {
  const location = gl.getAttribLocation(program, name);
  if (location === -1 && !gl.isContextLost()) {
    throw new Error(`Attribute "${name}" is missing or unused in the vertex shader`);
  }
  return location;
}

function uniform(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (!location && !gl.isContextLost()) {
    throw new Error(`Uniform "${name}" is missing or unused in the shaders`);
  }
  return location!;
}

// Logs every failure; in development it also prints it over the hero.
function report(surface: HTMLCanvasElement, error: unknown): void {
  console.error('[data-field]', error);
  if (!import.meta.env.DEV) return;
  const overlay = document.createElement('pre');
  overlay.textContent = `[data-field] ${error instanceof Error ? error.message : String(error)}`;
  overlay.style.cssText =
    'position:absolute;inset:0;margin:0;padding:16px;overflow:auto;z-index:10;' +
    'font:12px/1.4 monospace;color:#ff8a80;background:#000c;white-space:pre-wrap';
  surface.parentElement?.append(overlay);
}

// ========================================================================
// 0b. CAMERA MATRICES (column-major, matching GLSL)
// ========================================================================

function perspective(out: Float32Array, fovDeg: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
  const nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
}

/**
 * View matrix for a camera at `eye` looking at the origin with +Y up,
 * multiplied by a model translation of `offset`. A translated model is the
 * same as an eye moved the opposite way, so the translation column uses
 * eye - offset.
 */
function lookAtOrigin(
  out: Float32Array,
  ex: number,
  ey: number,
  ez: number,
  ox: number,
  oy: number,
  oz: number,
) {
  // z axis points from the target back toward the eye
  let len = Math.hypot(ex, ey, ez) || 1;
  const zx = ex / len;
  const zy = ey / len;
  const zz = ez / len;

  // x = up × z, with up = (0, 1, 0)
  len = Math.hypot(zz, zx) || 1;
  const xx = zz / len;
  const xy = 0;
  const xz = -zx / len;

  // y = z × x
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  const px = ex - ox;
  const py = ey - oy;
  const pz = ez - oz;

  out[0] = xx;
  out[1] = yx;
  out[2] = zx;
  out[3] = 0;
  out[4] = xy;
  out[5] = yy;
  out[6] = zy;
  out[7] = 0;
  out[8] = xz;
  out[9] = yz;
  out[10] = zz;
  out[11] = 0;
  out[12] = -(xx * px + xy * py + xz * pz);
  out[13] = -(yx * px + yy * py + yz * pz);
  out[14] = -(zx * px + zy * py + zz * pz);
  out[15] = 1;
}

if (canvas && button && webgl) {
  const surface = canvas;
  const gl = webgl;
  const toggle = button;
  const label = toggle.querySelector<HTMLElement>('.motion-toggle-label')!;
  const pauseIcon = toggle.querySelector<HTMLElement>('[data-motion-icon="pause"]')!;
  const playIcon = toggle.querySelector<HTMLElement>('[data-motion-icon="play"]')!;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches;
  let visible = true;
  let broken = false;
  let frame = 0;
  let last = 0;
  let time = 0;

  // ========================================================================
  // 1. SYSTEM PARAMETERS & ENSEMBLE CONFIGURATION
  // ========================================================================

  /** Dissipation parameter: 1.4 produces the vast, dense chaotic sheets */
  const A = 1.4;

  /** Trajectory points per strand */
  const NUM_POINTS = 18000;

  /** Number of concurrent perturbed strands in the ensemble */
  const NUM_STRANDS = 4;

  const TOTAL_VERTICES = NUM_STRANDS * NUM_POINTS;

  /** RK4 substeps executed per animation frame */
  const SUB_STEPS = 2;

  /** Fixed time-step size */
  const DT = 0.012;

  // Initial strand seeds
  const strandStates = [
    { x: 1.0, y: 0.0, z: 0.0 },
    { x: 1.0, y: 0.5, z: -0.5 },
    { x: -1.0, y: 0.0, z: 0.8 },
    { x: 0.5, y: -0.8, z: 0.2 },
  ];

  // Float32 position buffer
  const positions = new Float32Array(TOTAL_VERTICES * 3);

  // Static vertex attributes for GPU soliton propagation & strand identification
  const strandIndices = new Float32Array(TOTAL_VERTICES);
  const pointIndices = new Float32Array(TOTAL_VERTICES);

  for (let s = 0; s < NUM_STRANDS; s++) {
    for (let i = 0; i < NUM_POINTS; i++) {
      const idx = s * NUM_POINTS + i;
      strandIndices[idx] = s;
      pointIndices[idx] = i;
    }
  }

  // ========================================================================
  // 3. NUMERICAL INTEGRATION (RK4) & INITIALIZATION
  // ========================================================================

  const k1: [number, number, number] = [0, 0, 0];
  const k2: [number, number, number] = [0, 0, 0];
  const k3: [number, number, number] = [0, 0, 0];
  const k4: [number, number, number] = [0, 0, 0];

  function halvorsenDerivatives(
    x: number,
    y: number,
    z: number,
    out: [number, number, number],
  ): void {
    out[0] = -A * x - 4.0 * y - 4.0 * z - y * y;
    out[1] = -A * y - 4.0 * z - 4.0 * x - z * z;
    out[2] = -A * z - 4.0 * x - 4.0 * y - x * x;
  }

  function stepRK4Single(s: { x: number; y: number; z: number }, dt: number): void {
    halvorsenDerivatives(s.x, s.y, s.z, k1);

    halvorsenDerivatives(
      s.x + 0.5 * dt * k1[0],
      s.y + 0.5 * dt * k1[1],
      s.z + 0.5 * dt * k1[2],
      k2,
    );

    halvorsenDerivatives(
      s.x + 0.5 * dt * k2[0],
      s.y + 0.5 * dt * k2[1],
      s.z + 0.5 * dt * k2[2],
      k3,
    );

    halvorsenDerivatives(s.x + dt * k3[0], s.y + dt * k3[1], s.z + dt * k3[2], k4);

    s.x += (dt / 6.0) * (k1[0] + 2.0 * k2[0] + 2.0 * k3[0] + k4[0]);
    s.y += (dt / 6.0) * (k1[1] + 2.0 * k2[1] + 2.0 * k3[1] + k4[1]);
    s.z += (dt / 6.0) * (k1[2] + 2.0 * k2[2] + 2.0 * k3[2] + k4[2]);
  }

  // Pre-warm: burn initial transients onto the chaotic manifold
  for (let i = 0; i < 2500; i++) {
    for (let s = 0; s < NUM_STRANDS; s++) stepRK4Single(strandStates[s], DT);
  }

  // Populate initial trajectory in [Newest -> Oldest] sequence
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;

  for (let i = 0; i < NUM_POINTS; i++) {
    for (let s = 0; s < NUM_STRANDS; s++) {
      stepRK4Single(strandStates[s], DT);

      // Store in reverse so index 0 holds the newest point, matching copyWithin
      const pointIdx = NUM_POINTS - 1 - i;
      const baseIdx = (s * NUM_POINTS + pointIdx) * 3;

      positions[baseIdx] = strandStates[s].x;
      positions[baseIdx + 1] = strandStates[s].y;
      positions[baseIdx + 2] = strandStates[s].z;

      sumX += strandStates[s].x;
      sumY += strandStates[s].y;
      sumZ += strandStates[s].z;
    }
  }

  let centroidX = sumX / TOTAL_VERTICES;
  let centroidY = sumY / TOTAL_VERTICES;
  let centroidZ = sumZ / TOTAL_VERTICES;

  // ========================================================================
  // 4. WEBGL PIPELINE SETUP
  // ========================================================================

  const VERTEX_SHADER = `
precision highp float;

#define NUM_POINTS ${NUM_POINTS.toFixed(1)}

attribute vec3 position;
attribute float aIndex;
attribute float aStrand;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
varying vec3 vColor;

// Spectral cosine palette tuned for astronomical cyan-violet-teal iridescence
vec3 spectralPalette(float t) {
  vec3 a = vec3(0.20, 0.55, 0.70);
  vec3 b = vec3(0.25, 0.35, 0.30);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.00, 0.33, 0.67);
  return a + b * cos(6.2831853 * (c * t + d));
}

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float normIdx = aIndex / NUM_POINTS;
  float tailAttenuation = exp(-normIdx * 2.2);

  // Traveling soliton phase wave
  float r = length(position);
  float spatialWarp = sin(r * 0.08) * 0.15;
  float phase = normIdx * 9.0 - uTime * 0.45 + aStrand * 0.25 + spatialWarp;

  // Soliton pulse envelope: sharpened peak creates distinct traveling packets
  float wave = sin(6.2831853 * phase);
  float soliton = pow(0.5 + 0.5 * wave, 4.0);

  // Chromatic dispersion: wavelength-dependent phase shifts across spectral palette
  float colorPhase = phase * 0.8 + sin(uTime * 0.15) * 0.1;
  vec3 pulseColor = spectralPalette(colorPhase);

  // Baseline quiescent manifold (signature dark cyan)
  vec3 baseColor = vec3(0.06, 0.38, 0.46) * (0.15 + 0.30 * tailAttenuation);

  // Active bioluminescent wave packet
  vec3 activePulse = pulseColor * soliton * (0.40 + 0.55 * tailAttenuation);

  vColor = baseColor + activePulse;
}
`;

  const FRAGMENT_SHADER = `
precision highp float;

varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`;

  interface Gpu {
    positionBuffer: WebGLBuffer;
    uModelView: WebGLUniformLocation;
    uProjection: WebGLUniformLocation;
    uTime: WebGLUniformLocation;
  }

  function staticBuffer(location: number, data: Float32Array, size: number): void {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }

  // Builds every GPU resource. Runs at startup and again after a lost context is restored.
  function createGpu(): Gpu {
    const program = linkProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer()!;
    const positionLoc = attribute(gl, program, 'position');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

    staticBuffer(attribute(gl, program, 'aIndex'), pointIndices, 1);
    staticBuffer(attribute(gl, program, 'aStrand'), strandIndices, 1);

    // Additive glow: overlapping strands brighten. Nothing is depth-tested.
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);

    // The live buffer stays bound so each frame can re-upload positions.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    checkGl(gl, 'pipeline setup');

    return {
      positionBuffer,
      uModelView: uniform(gl, program, 'modelViewMatrix'),
      uProjection: uniform(gl, program, 'projectionMatrix'),
      uTime: uniform(gl, program, 'uTime'),
    };
  }

  let gpu: Gpu | null = null;
  const projection = new Float32Array(16);
  const modelView = new Float32Array(16);

  // ========================================================================
  // 5. CAMERA HARD-CUT CHOREOGRAPHY
  // ========================================================================

  interface CameraShot {
    duration: number;
    baseYaw: number;
    yawSpeed: number;
    pitch: number;
    pitchNutation: number;
    distance: number;
  }

  const SHOTS: CameraShot[] = [
    {
      duration: 10.0,
      baseYaw: 0.785,
      yawSpeed: 0.14,
      pitch: 0.48,
      pitchNutation: 0.04,
      distance: 16.5,
    },
    {
      duration: 9.0,
      baseYaw: 2.356,
      yawSpeed: 0.09,
      pitch: 0.12,
      pitchNutation: 0.02,
      distance: 10.8,
    },
    {
      duration: 10.5,
      baseYaw: -0.523,
      yawSpeed: -0.16,
      pitch: 1.18,
      pitchNutation: 0.03,
      distance: 15.5,
    },
    {
      duration: 9.5,
      baseYaw: 3.141,
      yawSpeed: 0.2,
      pitch: -0.22,
      pitchNutation: 0.04,
      distance: 18.5,
    },
  ];

  let currentShotIdx = 0;
  let shotTime = 0;
  let shotYaw = SHOTS[0].baseYaw;

  function fail(error: unknown): void {
    broken = true;
    cancelAnimationFrame(frame);
    frame = 0;
    toggle.hidden = true;
    report(surface, error);
  }

  function resize(): void {
    const width = surface.clientWidth || 800;
    const height = surface.clientHeight || 600;
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    surface.width = Math.floor(width * pixelRatio);
    surface.height = Math.floor(height * pixelRatio);
    gl.viewport(0, 0, surface.width, surface.height);
    perspective(projection, 54, width / height, 0.1, 150);
    // Resizing clears the canvas, so redraw in case the loop is paused.
    renderScene(0);
  }

  function renderScene(dt: number): void {
    if (!gpu || broken) return;

    shotTime += dt;
    let currentShot = SHOTS[currentShotIdx];

    if (shotTime >= currentShot.duration) {
      shotTime = 0;
      currentShotIdx = (currentShotIdx + 1) % SHOTS.length;
      currentShot = SHOTS[currentShotIdx];
      shotYaw = currentShot.baseYaw;
    } else {
      shotYaw += currentShot.yawSpeed * dt;
    }

    const pitch = currentShot.pitch + Math.sin(time * 0.15) * currentShot.pitchNutation;
    const r = currentShot.distance;

    lookAtOrigin(
      modelView,
      r * Math.cos(pitch) * Math.sin(shotYaw),
      r * Math.sin(pitch),
      r * Math.cos(pitch) * Math.cos(shotYaw),
      -centroidX,
      -centroidY,
      -centroidZ,
    );

    try {
      checkFinite('projectionMatrix', projection);
      checkFinite('modelViewMatrix', modelView);

      gl.uniformMatrix4fv(gpu.uProjection, false, projection);
      gl.uniformMatrix4fv(gpu.uModelView, false, modelView);
      gl.uniform1f(gpu.uTime, time);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);

      gl.clear(gl.COLOR_BUFFER_BIT);
      // Each strand is its own line strip so strands never join end to start.
      for (let s = 0; s < NUM_STRANDS; s++) {
        gl.drawArrays(gl.LINE_STRIP, s * NUM_POINTS, NUM_POINTS);
      }
      checkGl(gl, 'drawing a frame');
    } catch (error) {
      fail(error);
    }
  }

  // ========================================================================
  // 6. ANIMATION LOOP & LIFECYCLE CONTROLS
  // ========================================================================

  function tick(now: number): void {
    frame = 0;
    if (!visible || document.hidden || paused || !gpu || broken) return;

    if (!last) last = now;
    const delta = Math.min((now - last) / 1000, 0.08);
    last = now;
    time += delta;

    for (let sub = 0; sub < SUB_STEPS; sub++) {
      for (let s = 0; s < NUM_STRANDS; s++) {
        const state = strandStates[s];
        stepRK4Single(state, DT);

        const strandStart = s * NUM_POINTS * 3;
        const tailIdx = strandStart + (NUM_POINTS - 1) * 3;

        sumX += state.x - positions[tailIdx];
        sumY += state.y - positions[tailIdx + 1];
        sumZ += state.z - positions[tailIdx + 2];

        positions.copyWithin(strandStart + 3, strandStart, tailIdx);
        positions[strandStart] = state.x;
        positions[strandStart + 1] = state.y;
        positions[strandStart + 2] = state.z;
      }
    }

    centroidX = sumX / TOTAL_VERTICES;
    centroidY = sumY / TOTAL_VERTICES;
    centroidZ = sumZ / TOTAL_VERTICES;

    renderScene(delta);
    if (!broken) frame = requestAnimationFrame(tick);
  }

  function sync(): void {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!gpu || broken) return;
    toggle.hidden = false;
    label.textContent = paused ? 'Play motion' : 'Pause motion';
    pauseIcon.hidden = paused;
    playIcon.hidden = !paused;

    renderScene(0);
    if (!paused && visible && !document.hidden) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  function start(): void {
    try {
      gpu = createGpu();
    } catch (error) {
      fail(error);
      return;
    }
    resize();
    sync();
  }

  // The browser may drop the context (GPU reset, too many contexts). Wait for
  // it to come back, then rebuild the GPU resources.
  surface.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    gpu = null;
    sync();
  });
  surface.addEventListener('webglcontextrestored', start);

  new ResizeObserver(resize).observe(surface);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(surface);

  toggle.addEventListener('click', () => {
    paused = !paused;
    sync();
  });

  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    sync();
  });

  document.addEventListener('visibilitychange', sync);
  start();
}
