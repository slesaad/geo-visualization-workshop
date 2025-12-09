import * as THREE from 'three';

// ============================================================================
// GPU Particle Advection System
// ============================================================================
// This demonstrates:
// 1. Framebuffer ping-pong technique for GPU simulation
// 2. Using textures to store particle positions
// 3. Reading velocity from a procedural field
// 4. Rendering particles with instancing
// 5. Trail effects using alpha blending
// ============================================================================

// Configuration
let PARTICLE_COUNT = 65536; // Must be a power of 2
let TEXTURE_SIZE = Math.sqrt(PARTICLE_COUNT); // 256x256 = 65536 particles

// Simulation parameters
let speed = 1.0;
let trailFade = 0.95;
let particleSize = 2.0;
let isPaused = false;
let colorMode = 'velocity';
let velocityField = 'curl';

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

// ============================================================================
// Velocity Field Shader (generates procedural velocity field)
// ============================================================================
const velocityFieldShader = {
  uniforms: {
    time: { value: 0 },
    fieldType: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform float time;
    uniform int fieldType;
    varying vec2 vUv;

    // Simplex noise functions
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                          -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                              + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                              dot(x12.zw,x12.zw)), 0.0);
      m = m*m;
      m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    // Curl noise for divergence-free flow
    vec2 curlNoise(vec2 p) {
      float eps = 0.01;
      float n1 = snoise(p + vec2(0, eps));
      float n2 = snoise(p - vec2(0, eps));
      float n3 = snoise(p + vec2(eps, 0));
      float n4 = snoise(p - vec2(eps, 0));
      float dndx = (n3 - n4) / (2.0 * eps);
      float dndy = (n1 - n2) / (2.0 * eps);
      return vec2(dndy, -dndx);
    }

    void main() {
      vec2 pos = vUv * 2.0 - 1.0; // -1 to 1 range
      vec2 velocity;

      if (fieldType == 0) {
        // Curl noise - organic, divergence-free flow
        velocity = curlNoise(pos * 3.0 + time * 0.1) * 0.5;
      } else if (fieldType == 1) {
        // Radial flow - expanding from center
        float dist = length(pos);
        velocity = normalize(pos) * (0.3 - dist * 0.2);
        velocity += curlNoise(pos * 2.0 + time * 0.05) * 0.1;
      } else if (fieldType == 2) {
        // Vortex - spinning around center
        velocity = vec2(-pos.y, pos.x) * 0.5;
        float dist = length(pos);
        velocity *= (1.0 - dist * 0.5);
        velocity += curlNoise(pos * 4.0) * 0.1;
      } else {
        // Wind pattern - horizontal with turbulence
        velocity = vec2(0.3, 0.0);
        velocity += curlNoise(pos * 2.0 + vec2(time * 0.2, 0.0)) * 0.2;
        velocity.y += sin(pos.x * 5.0 + time) * 0.1;
      }

      // Encode velocity in RG channels (shifted to 0-1 range)
      gl_FragColor = vec4(velocity * 0.5 + 0.5, 0.0, 1.0);
    }
  `
};

// ============================================================================
// Particle Update Shader (advects particles using velocity field)
// ============================================================================
const particleUpdateShader = {
  uniforms: {
    positionTexture: { value: null },
    velocityTexture: { value: null },
    deltaTime: { value: 0.016 },
    speed: { value: 1.0 },
    randomSeed: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform sampler2D positionTexture;
    uniform sampler2D velocityTexture;
    uniform float deltaTime;
    uniform float speed;
    uniform float randomSeed;
    varying vec2 vUv;

    // Hash function for randomness
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec4 posData = texture2D(positionTexture, vUv);
      vec2 pos = posData.xy;
      float age = posData.z;
      float life = posData.w;

      // Sample velocity at current position (pos is in -1 to 1, convert to UV)
      vec2 velUv = pos * 0.5 + 0.5;
      vec2 velocity = texture2D(velocityTexture, velUv).xy * 2.0 - 1.0;

      // Update position
      pos += velocity * deltaTime * speed;
      age += deltaTime;

      // Respawn if out of bounds or too old
      if (pos.x < -1.0 || pos.x > 1.0 || pos.y < -1.0 || pos.y > 1.0 || age > life) {
        // Random respawn position
        float r1 = hash(vUv + randomSeed);
        float r2 = hash(vUv.yx + randomSeed + 0.5);
        pos = vec2(r1, r2) * 2.0 - 1.0;
        age = 0.0;
        life = 2.0 + hash(vUv + randomSeed + 1.0) * 3.0; // 2-5 second lifespan
      }

      gl_FragColor = vec4(pos, age, life);
    }
  `
};

// ============================================================================
// Particle Render Shader (renders particles as points)
// ============================================================================
const particleRenderShader = {
  uniforms: {
    positionTexture: { value: null },
    velocityTexture: { value: null },
    pointSize: { value: 2.0 },
    colorMode: { value: 0 }
  },
  vertexShader: `
    uniform sampler2D positionTexture;
    uniform sampler2D velocityTexture;
    uniform float pointSize;
    attribute vec2 texCoord;
    varying vec2 vVelocity;
    varying float vAge;
    varying float vLife;

    void main() {
      vec4 posData = texture2D(positionTexture, texCoord);
      vec2 pos = posData.xy;
      vAge = posData.z;
      vLife = posData.w;

      // Sample velocity for coloring
      vec2 velUv = pos * 0.5 + 0.5;
      vVelocity = texture2D(velocityTexture, velUv).xy * 2.0 - 1.0;

      gl_Position = vec4(pos, 0.0, 1.0);
      gl_PointSize = pointSize;
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform int colorMode;
    varying vec2 vVelocity;
    varying float vAge;
    varying float vLife;

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
      // Circular point
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      if (dist > 0.5) discard;

      float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

      // Fade based on age
      float ageFade = 1.0 - (vAge / vLife);
      alpha *= ageFade;

      vec3 color;
      float velMag = length(vVelocity);

      if (colorMode == 0) {
        // Velocity magnitude - blue to red
        float t = clamp(velMag * 2.0, 0.0, 1.0);
        color = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.3, 0.1), t);
      } else if (colorMode == 1) {
        // Flow direction - hue based on angle
        float angle = atan(vVelocity.y, vVelocity.x);
        float hue = (angle + 3.14159) / (2.0 * 3.14159);
        color = hsv2rgb(vec3(hue, 0.8, 1.0));
      } else if (colorMode == 2) {
        // Age - young is cyan, old is magenta
        float t = vAge / vLife;
        color = mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 0.0, 1.0), t);
      } else {
        // White
        color = vec3(1.0);
      }

      gl_FragColor = vec4(color, alpha * 0.8);
    }
  `
};

// ============================================================================
// Trail fade shader (for the accumulation buffer)
// ============================================================================
const trailFadeShader = {
  uniforms: {
    tDiffuse: { value: null },
    fade: { value: 0.95 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float fade;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(color.rgb * fade, 1.0);
    }
  `
};

// ============================================================================
// Setup render targets for ping-pong
// ============================================================================
let positionRT1, positionRT2;
let velocityRT;
let trailRT1, trailRT2;

function createRenderTargets() {
  const posOptions = {
    type: THREE.FloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat
  };

  positionRT1 = new THREE.WebGLRenderTarget(TEXTURE_SIZE, TEXTURE_SIZE, posOptions);
  positionRT2 = new THREE.WebGLRenderTarget(TEXTURE_SIZE, TEXTURE_SIZE, posOptions);

  velocityRT = new THREE.WebGLRenderTarget(512, 512, {
    type: THREE.FloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat
  });

  const trailOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat
  };

  trailRT1 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, trailOptions);
  trailRT2 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, trailOptions);
}

createRenderTargets();

// ============================================================================
// Create materials
// ============================================================================
const velocityMaterial = new THREE.ShaderMaterial({
  uniforms: velocityFieldShader.uniforms,
  vertexShader: velocityFieldShader.vertexShader,
  fragmentShader: velocityFieldShader.fragmentShader
});

const updateMaterial = new THREE.ShaderMaterial({
  uniforms: particleUpdateShader.uniforms,
  vertexShader: particleUpdateShader.vertexShader,
  fragmentShader: particleUpdateShader.fragmentShader
});

const trailFadeMaterial = new THREE.ShaderMaterial({
  uniforms: trailFadeShader.uniforms,
  vertexShader: trailFadeShader.vertexShader,
  fragmentShader: trailFadeShader.fragmentShader
});

// ============================================================================
// Create particle geometry
// ============================================================================
let particleGeometry, particleMaterial, particles;

function createParticles() {
  if (particles) {
    scene.remove(particles);
    particleGeometry.dispose();
    particleMaterial.dispose();
  }

  particleGeometry = new THREE.BufferGeometry();

  // Create texture coordinates for each particle
  const texCoords = new Float32Array(PARTICLE_COUNT * 2);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const x = (i % TEXTURE_SIZE) / TEXTURE_SIZE;
    const y = Math.floor(i / TEXTURE_SIZE) / TEXTURE_SIZE;
    texCoords[i * 2] = x + 0.5 / TEXTURE_SIZE;
    texCoords[i * 2 + 1] = y + 0.5 / TEXTURE_SIZE;
  }

  particleGeometry.setAttribute('texCoord', new THREE.BufferAttribute(texCoords, 2));
  // Dummy position attribute (actual positions come from texture)
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));

  particleMaterial = new THREE.ShaderMaterial({
    uniforms: particleRenderShader.uniforms,
    vertexShader: particleRenderShader.vertexShader,
    fragmentShader: particleRenderShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false
  });

  particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);
}

createParticles();

// ============================================================================
// Fullscreen quad for render passes
// ============================================================================
const quadGeometry = new THREE.PlaneGeometry(2, 2);
const quadMesh = new THREE.Mesh(quadGeometry, velocityMaterial);
const quadScene = new THREE.Scene();
quadScene.add(quadMesh);

// ============================================================================
// Initialize particle positions
// ============================================================================
function initializeParticles() {
  const data = new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);

  for (let i = 0; i < TEXTURE_SIZE * TEXTURE_SIZE; i++) {
    data[i * 4] = Math.random() * 2 - 1;     // x position
    data[i * 4 + 1] = Math.random() * 2 - 1; // y position
    data[i * 4 + 2] = Math.random() * 3;     // age (randomize initial age)
    data[i * 4 + 3] = 2 + Math.random() * 3; // life (2-5 seconds)
  }

  const texture = new THREE.DataTexture(
    data,
    TEXTURE_SIZE,
    TEXTURE_SIZE,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  texture.needsUpdate = true;

  // Render initial data to both position targets
  const initMaterial = new THREE.MeshBasicMaterial({ map: texture });
  quadMesh.material = initMaterial;

  renderer.setRenderTarget(positionRT1);
  renderer.render(quadScene, camera);
  renderer.setRenderTarget(positionRT2);
  renderer.render(quadScene, camera);

  quadMesh.material = velocityMaterial;
  initMaterial.dispose();
  texture.dispose();

  // Clear trail buffers
  renderer.setRenderTarget(trailRT1);
  renderer.clear();
  renderer.setRenderTarget(trailRT2);
  renderer.clear();
  renderer.setRenderTarget(null);
}

initializeParticles();

// ============================================================================
// Animation loop
// ============================================================================
const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsUpdate = 0;
let fps = 60;

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);
  const elapsedTime = clock.getElapsedTime();

  // FPS counter
  frameCount++;
  if (elapsedTime - lastFpsUpdate > 0.5) {
    fps = Math.round(frameCount / (elapsedTime - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = elapsedTime;
    document.getElementById('stats').textContent = `FPS: ${fps} | Particles: ${PARTICLE_COUNT.toLocaleString()}`;
  }

  if (isPaused) {
    // Just render the current trail buffer
    renderer.setRenderTarget(null);
    quadMesh.material = trailFadeMaterial;
    trailFadeMaterial.uniforms.tDiffuse.value = trailRT1.texture;
    trailFadeMaterial.uniforms.fade.value = 1.0;
    renderer.render(quadScene, camera);
    return;
  }

  // 1. Update velocity field
  quadMesh.material = velocityMaterial;
  velocityMaterial.uniforms.time.value = elapsedTime;
  velocityMaterial.uniforms.fieldType.value = ['curl', 'radial', 'vortex', 'wind'].indexOf(velocityField);
  renderer.setRenderTarget(velocityRT);
  renderer.render(quadScene, camera);

  // 2. Update particle positions (ping-pong)
  quadMesh.material = updateMaterial;
  updateMaterial.uniforms.positionTexture.value = positionRT1.texture;
  updateMaterial.uniforms.velocityTexture.value = velocityRT.texture;
  updateMaterial.uniforms.deltaTime.value = deltaTime;
  updateMaterial.uniforms.speed.value = speed;
  updateMaterial.uniforms.randomSeed.value = elapsedTime;
  renderer.setRenderTarget(positionRT2);
  renderer.render(quadScene, camera);

  // Swap position buffers
  [positionRT1, positionRT2] = [positionRT2, positionRT1];

  // 3. Fade the trail buffer
  quadMesh.material = trailFadeMaterial;
  trailFadeMaterial.uniforms.tDiffuse.value = trailRT1.texture;
  trailFadeMaterial.uniforms.fade.value = trailFade;
  renderer.setRenderTarget(trailRT2);
  renderer.render(quadScene, camera);

  // 4. Render particles to trail buffer
  particleMaterial.uniforms.positionTexture.value = positionRT1.texture;
  particleMaterial.uniforms.velocityTexture.value = velocityRT.texture;
  particleMaterial.uniforms.pointSize.value = particleSize * window.devicePixelRatio;
  particleMaterial.uniforms.colorMode.value = ['velocity', 'direction', 'age', 'white'].indexOf(colorMode);
  renderer.setRenderTarget(trailRT2);
  renderer.render(scene, camera);

  // Swap trail buffers
  [trailRT1, trailRT2] = [trailRT2, trailRT1];

  // 5. Render trail buffer to screen
  renderer.setRenderTarget(null);
  trailFadeMaterial.uniforms.tDiffuse.value = trailRT1.texture;
  trailFadeMaterial.uniforms.fade.value = 1.0;
  renderer.render(quadScene, camera);
}

animate();

// ============================================================================
// UI Event Handlers
// ============================================================================
document.getElementById('fieldSelect').addEventListener('change', (e) => {
  velocityField = e.target.value;
});

document.getElementById('countSlider').addEventListener('input', (e) => {
  const power = parseInt(e.target.value);
  PARTICLE_COUNT = Math.pow(2, power);
  TEXTURE_SIZE = Math.sqrt(PARTICLE_COUNT);
  document.getElementById('countValue').textContent = PARTICLE_COUNT.toLocaleString();

  // Recreate render targets and particles
  positionRT1.dispose();
  positionRT2.dispose();
  createRenderTargets();
  createParticles();
  initializeParticles();
});

document.getElementById('speedSlider').addEventListener('input', (e) => {
  speed = parseFloat(e.target.value);
  document.getElementById('speedValue').textContent = speed.toFixed(1);
});

document.getElementById('trailSlider').addEventListener('input', (e) => {
  trailFade = parseFloat(e.target.value);
  document.getElementById('trailValue').textContent = trailFade.toFixed(2);
});

document.getElementById('sizeSlider').addEventListener('input', (e) => {
  particleSize = parseFloat(e.target.value);
  document.getElementById('sizeValue').textContent = particleSize.toFixed(1);
});

document.getElementById('pauseBtn').addEventListener('click', (e) => {
  isPaused = !isPaused;
  e.target.textContent = isPaused ? 'Resume' : 'Pause';
  e.target.classList.toggle('active', isPaused);
});

document.getElementById('resetBtn').addEventListener('click', () => {
  initializeParticles();
});

document.getElementById('colorSelect').addEventListener('change', (e) => {
  colorMode = e.target.value;
});

// Handle window resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Recreate trail buffers at new size
  trailRT1.dispose();
  trailRT2.dispose();
  trailRT1 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
  trailRT2 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
});
