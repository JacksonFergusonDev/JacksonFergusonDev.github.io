import * as THREE from 'three';

const canvas = document.querySelector<HTMLCanvasElement>('#data-canvas');
const button = document.querySelector<HTMLButtonElement>('.motion-toggle');

// Without WebGL the hero keeps its static background and the motion toggle stays hidden.
function createRenderer(surface: HTMLCanvasElement): THREE.WebGLRenderer | null {
  try {
    return new THREE.WebGLRenderer({
      canvas: surface,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }
}

const webgl = canvas && button ? createRenderer(canvas) : null;

if (canvas && button && webgl) {
  const surface = canvas;
  const renderer = webgl;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches;
  let visible = true;
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
  // 4. THREE.JS SCENE SETUP
  // ========================================================================

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 150);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const positionAttr = new THREE.BufferAttribute(positions, 3);
  const pointIndexAttr = new THREE.BufferAttribute(pointIndices, 1);
  const strandIndexAttr = new THREE.BufferAttribute(strandIndices, 1);

  const lineMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    defines: {
      NUM_POINTS: NUM_POINTS.toFixed(1),
    },
    vertexShader: `
      attribute float aIndex;
      attribute float aStrand;
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
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const group = new THREE.Group();

  // Create isolated line strips for each strand
  for (let s = 0; s < NUM_STRANDS; s++) {
    const strandGeom = new THREE.BufferGeometry();
    strandGeom.setAttribute('position', positionAttr);
    strandGeom.setAttribute('aIndex', pointIndexAttr);
    strandGeom.setAttribute('aStrand', strandIndexAttr);
    strandGeom.setDrawRange(s * NUM_POINTS, NUM_POINTS);

    const strandLine = new THREE.Line(strandGeom, lineMaterial);
    group.add(strandLine);
  }

  scene.add(group);
  group.position.set(-centroidX, -centroidY, -centroidZ);

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

  function resize(): void {
    const width = surface.clientWidth || 800;
    const height = surface.clientHeight || 600;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function renderScene(dt: number): void {
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

    camera.position.set(
      r * Math.cos(pitch) * Math.sin(shotYaw),
      r * Math.sin(pitch),
      r * Math.cos(pitch) * Math.cos(shotYaw),
    );
    camera.lookAt(0, 0, 0);

    group.position.set(-centroidX, -centroidY, -centroidZ);

    lineMaterial.uniforms.uTime.value = time;
    positionAttr.needsUpdate = true;
    renderer.render(scene, camera);
  }

  // ========================================================================
  // 6. ANIMATION LOOP & LIFECYCLE CONTROLS
  // ========================================================================

  function tick(now: number): void {
    frame = 0;
    if (!visible || document.hidden || paused) return;

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
    frame = requestAnimationFrame(tick);
  }

  function sync(): void {
    cancelAnimationFrame(frame);
    frame = 0;
    button!.hidden = false;
    button!.setAttribute('aria-pressed', String(paused));
    button!.setAttribute(
      'aria-label',
      paused ? 'Play background animation' : 'Pause background animation',
    );
    const pauseSvg =
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>';
    const playSvg =
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4" /></svg>';
    button!.innerHTML = paused
      ? `Play motion <span aria-hidden="true">${playSvg}</span>`
      : `Pause motion <span aria-hidden="true">${pauseSvg}</span>`;

    renderScene(0);
    if (!paused && visible && !document.hidden) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  resize();
  new ResizeObserver(resize).observe(surface);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(surface);

  button.addEventListener('click', () => {
    paused = !paused;
    sync();
  });

  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    sync();
  });

  document.addEventListener('visibilitychange', sync);
  sync();
}
