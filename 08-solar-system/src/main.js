import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TIFFLoader } from 'three/addons/loaders/TIFFLoader.js';

const BASE = import.meta.env.BASE_URL;

// Celestial body configuration
// Distances and sizes are scaled for visualization (not to actual scale)
const BODIES = {
  sun: {
    name: 'Sun',
    radius: 5,
    distance: 0,
    orbitalPeriod: 0, // doesn't orbit
    rotationPeriod: 27, // days
    color: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Solarsystemscope_texture_2k_sun.jpg',
    emissive: true,
    info: 'The Sun - Center of our solar system, a G-type main-sequence star',
    // Detail panel data
    type: 'Star',
    image: 'https://upload.wikimedia.org/wikipedia/commons/b/b4/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg',
    description: 'The Sun is the star at the center of our Solar System. It is a nearly perfect ball of hot plasma, heated to incandescence by nuclear fusion reactions in its core. The Sun radiates energy mainly as visible light, ultraviolet light, and infrared radiation.',
    stats: {
      'Diameter': '1.39 million km',
      'Mass': '1.989 × 10³⁰ kg',
      'Surface Temp': '5,500°C',
      'Core Temp': '15 million°C',
      'Age': '4.6 billion years',
      'Type': 'G-type main-sequence'
    },
    facts: 'The Sun contains 99.86% of the mass in the Solar System. Light from the Sun takes about 8 minutes to reach Earth. The Sun rotates faster at its equator than at its poles.'
  },
  earth: {
    name: 'Earth',
    radius: 2,
    distance: 30,
    orbitalPeriod: 365, // days
    rotationPeriod: 1,
    color: BASE + 'textures/earth-texture.jpg',
    bumpMap: BASE + 'textures/8081_earthbump2k.jpg',
    bumpScale: 10.0,
    info: 'Earth - Our home planet, third from the Sun',
    // Detail panel data
    type: 'Terrestrial Planet',
    image: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/The_Blue_Marble_%28remastered%29.jpg',
    description: 'Earth is the third planet from the Sun and the only astronomical object known to harbor life. About 71% of Earth\'s surface is water, and the remaining 29% is land consisting of continents and islands.',
    stats: {
      'Diameter': '12,742 km',
      'Mass': '5.97 × 10²⁴ kg',
      'Avg Temp': '15°C',
      'Moons': '1',
      'Day Length': '24 hours',
      'Year Length': '365.25 days'
    },
    facts: 'Earth is the densest planet in the Solar System. It\'s the only planet not named after a Greek or Roman deity. Earth\'s atmosphere protects us from meteoroids and radiation from the Sun.'
  },
  moon: {
    name: 'Moon',
    radius: 0.6,
    distance: 5, // distance from Earth
    orbitalPeriod: 27.3, // days around Earth
    rotationPeriod: 27.3, // tidally locked
    orbitAround: 'earth',
    color: BASE + 'textures/lroc_color_poles_4k.tif',
    bumpMap: BASE + 'textures/ldem_16.tif',
    bumpScale: 0.1,
    info: 'The Moon - Earth\'s only natural satellite',
    // Detail panel data
    type: 'Natural Satellite',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/FullMoon2010.jpg',
    description: 'The Moon is Earth\'s only natural satellite. It is the fifth largest satellite in the Solar System and the largest and most massive relative to its parent planet. The Moon is thought to have formed about 4.51 billion years ago from debris after a giant impact.',
    stats: {
      'Diameter': '3,474 km',
      'Mass': '7.35 × 10²² kg',
      'Surface Temp': '-233 to 123°C',
      'Distance': '384,400 km',
      'Orbital Period': '27.3 days',
      'Surface Gravity': '1.62 m/s²'
    },
    facts: 'The Moon is gradually moving away from Earth at about 3.8 cm per year. It\'s tidally locked, meaning we always see the same side. The Moon has no atmosphere, so footprints left by astronauts will last millions of years.'
  },
  mars: {
    name: 'Mars',
    radius: 1.5,
    distance: 50,
    orbitalPeriod: 687, // days
    rotationPeriod: 1.03,
    color: BASE + 'textures/marsmap1k.jpg',
    bumpMap: BASE + 'textures/marsbump1k.jpg',
    normalMap: BASE + 'textures/mars_1k_normal.jpg',
    bumpScale: 10.0,
    normalScale: 5.0,
    info: 'Mars - The Red Planet, fourth from the Sun',
    // Detail panel data
    type: 'Terrestrial Planet',
    image: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Mars_-_August_30_2021_-_Flickr_-_Kevin_M._Gill.png',
    description: 'Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System. It is often called the "Red Planet" because iron oxide on its surface gives it a reddish appearance. Mars has the largest volcano and canyon in the Solar System.',
    stats: {
      'Diameter': '6,779 km',
      'Mass': '6.39 × 10²³ kg',
      'Avg Temp': '-65°C',
      'Moons': '2',
      'Day Length': '24h 37m',
      'Year Length': '687 days'
    },
    facts: 'Mars is home to Olympus Mons, the tallest volcano in the Solar System at 21.9 km high. Valles Marineris, a system of canyons, is over 4,000 km long. Mars has seasons like Earth because of its similar axial tilt.'
  }
};

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 50, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 500;

// Lighting - Sun as light source
const ambientLight = new THREE.AmbientLight(0x333333, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffffff, 3, 100); // 0 distance = no decay
sunLight.decay = 0; // Disable physical decay
sunLight.position.set(0, 0, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

// Starfield background
const starGeometry = new THREE.BufferGeometry();
const starCount = 10000;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
  const radius = 500 + Math.random() * 500;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
  starPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
  starPositions[i + 2] = radius * Math.cos(phi);
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Sun corona/halo with flares
const sunCoronaGroup = new THREE.Group();
scene.add(sunCoronaGroup);

// Create corona glow shader material
const coronaVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coronaFragmentShader = `
  uniform float time;
  varying vec2 vUv;

  // Noise function for organic look
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * smoothNoise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center);
    float angle = atan(center.y, center.x);

    // Base corona falloff
    float corona = 1.0 - smoothstep(0.0, 0.5, dist);
    corona = pow(corona, 2.0);

    // Add animated noise for organic feel
    float noiseVal = fbm(vec2(angle * 3.0, dist * 5.0 - time * 0.5));
    corona *= 0.7 + 0.3 * noiseVal;

    // Red-orange color gradient
    vec3 innerColor = vec3(1.0, 0.3, 0.1);  // Red-orange
    vec3 outerColor = vec3(1.0, 0.1, 0.0);  // Deep red
    vec3 color = mix(outerColor, innerColor, corona);

    // Add some yellow near the center
    color = mix(color, vec3(1.0, 0.6, 0.2), pow(corona, 3.0));

    gl_FragColor = vec4(color, corona * 0.6);
  }
`;

const coronaMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 }
  },
  vertexShader: coronaVertexShader,
  fragmentShader: coronaFragmentShader,
  transparent: true,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  depthWrite: false
});

// Create corona plane (billboard that faces camera)
const coronaGeometry = new THREE.PlaneGeometry(25, 25);
const coronaMesh = new THREE.Mesh(coronaGeometry, coronaMaterial);
sunCoronaGroup.add(coronaMesh);

// Store reference for animation
let sunCorona = coronaMesh;

// Texture loaders
const textureLoader = new THREE.TextureLoader();
const tiffLoader = new TIFFLoader();

// Load texture helper
async function loadTexture(url) {
  const isTiff = url.toLowerCase().endsWith('.tif') || url.toLowerCase().endsWith('.tiff');
  return new Promise((resolve, reject) => {
    const loader = isTiff ? tiffLoader : textureLoader;
    loader.load(url, resolve, undefined, reject);
  });
}

// Store celestial body meshes and their orbit data
const celestialBodies = {};
const orbitLines = {};
const bodyLabels = {};

// Create orbit path visualization
function createOrbitLine(radius, color = 0x444444) {
  const segments = 128;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(segments * 3);

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const line = new THREE.LineLoop(geometry, material);
  return line;
}

// Create a celestial body
async function createBody(id, config) {
  const geometry = new THREE.SphereGeometry(config.radius, 64, 64);

  let material;

  try {
    if (config.emissive) {
      // Sun - emissive material
      let colorTexture = null;
      try {
        colorTexture = await loadTexture(config.color);
        colorTexture.colorSpace = THREE.SRGBColorSpace;
      } catch (e) {
        console.log('Sun texture not found, using color');
      }

      material = new THREE.MeshBasicMaterial({
        map: colorTexture,
        color: colorTexture ? 0xffffff : 0xffaa00
      });
    } else {
      // Planets - standard material with lighting
      const colorTexture = await loadTexture(config.color);
      colorTexture.colorSpace = THREE.SRGBColorSpace;

      const materialOptions = {
        map: colorTexture,
        roughness: 0.8,
        metalness: 0.1
      };

      // Load and apply bump map if provided
      if (config.bumpMap) {
        try {
          const bumpTexture = await loadTexture(config.bumpMap);
          materialOptions.bumpMap = bumpTexture;
          materialOptions.bumpScale = config.bumpScale || 1.0;
        } catch (e) {
          console.log(`Bump map failed for ${id}:`, e);
        }
      }

      // Load and apply normal map if provided
      if (config.normalMap) {
        try {
          const normalTexture = await loadTexture(config.normalMap);
          materialOptions.normalMap = normalTexture;
          const nScale = config.normalScale || 1.0;
          materialOptions.normalScale = new THREE.Vector2(nScale, nScale);
        } catch (e) {
          console.log(`Normal map failed for ${id}:`, e);
        }
      }

      material = new THREE.MeshStandardMaterial(materialOptions);
    }
  } catch (e) {
    console.error(`Failed to create material for ${id}:`, e);
    // Fallback material
    material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.8,
      metalness: 0.1
    });
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = !config.emissive;
  mesh.receiveShadow = !config.emissive;

  // Create a group to handle orbit
  const orbitGroup = new THREE.Group();

  if (config.orbitAround) {
    // This body orbits another body (like Moon around Earth)
    // We'll handle this in the animation loop
    scene.add(mesh);
  } else if (config.distance > 0) {
    // This body orbits the Sun
    orbitGroup.add(mesh);
    mesh.position.x = config.distance;
    scene.add(orbitGroup);

    // Add orbit line
    const orbitLine = createOrbitLine(config.distance);
    scene.add(orbitLine);
    orbitLines[id] = orbitLine;
  } else {
    // Sun at center
    scene.add(mesh);
  }

  const initialAngle = Math.random() * Math.PI * 2;

  // Apply initial orbit angle
  if (config.distance > 0 && !config.orbitAround && orbitGroup) {
    orbitGroup.rotation.y = initialAngle;
  }

  celestialBodies[id] = {
    mesh,
    orbitGroup,
    config,
    orbitAngle: initialAngle,
    rotationAngle: 0
  };

  return mesh;
}

// Create HTML label for a celestial body
function createLabel(id, config) {
  const container = document.getElementById('labels-container');

  const label = document.createElement('div');
  label.className = 'body-label';
  label.dataset.bodyId = id;

  label.innerHTML = `
    <div class="label-outline"></div>
    <div class="label-name">${config.name}</div>
  `;

  // Click handler
  label.addEventListener('click', () => {
    flyTo(id);
  });

  container.appendChild(label);
  bodyLabels[id] = {
    element: label,
    outline: label.querySelector('.label-outline'),
    name: label.querySelector('.label-name')
  };
}

// Update label positions to follow celestial bodies
function updateLabels() {
  for (const [id, body] of Object.entries(celestialBodies)) {
    const labelData = bodyLabels[id];
    if (!labelData) continue;

    const { element, outline, name } = labelData;

    // Get world position of the body center
    const worldPos = new THREE.Vector3();
    body.mesh.getWorldPosition(worldPos);

    // Project center to screen
    const centerScreen = worldPos.clone().project(camera);

    // Check if body is behind camera
    if (centerScreen.z > 1) {
      element.style.display = 'none';
      continue;
    }

    // Calculate screen-space size of the body by projecting points at the radius
    const radius = body.config.radius;

    // Get a point at the top of the sphere (in world space)
    const topPos = worldPos.clone();
    topPos.y += radius;
    const topScreen = topPos.clone().project(camera);

    // Get a point at the right of the sphere (in world space, camera-facing)
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    const rightDir = new THREE.Vector3().crossVectors(camera.up, cameraDir).normalize();
    const rightPos = worldPos.clone().add(rightDir.multiplyScalar(radius));
    const rightScreen = rightPos.clone().project(camera);

    // Convert to pixel coordinates
    const centerX = (centerScreen.x * 0.5 + 0.5) * window.innerWidth;
    const centerY = (-centerScreen.y * 0.5 + 0.5) * window.innerHeight;
    const topY = (-topScreen.y * 0.5 + 0.5) * window.innerHeight;
    const rightX = (rightScreen.x * 0.5 + 0.5) * window.innerWidth;

    // Calculate box size with some padding
    const halfHeight = Math.abs(centerY - topY) * 1.3;
    const halfWidth = Math.abs(rightX - centerX) * 1.3;
    const boxSize = Math.max(halfWidth, halfHeight) * 2;

    // Minimum size so small/distant bodies are still visible
    const minSize = 40;
    const finalSize = Math.max(boxSize, minSize);

    // Hide if off screen
    if (centerX < -finalSize || centerX > window.innerWidth + finalSize ||
        centerY < -finalSize || centerY > window.innerHeight + finalSize) {
      element.style.display = 'none';
      continue;
    }

    element.style.display = 'block';

    // Position the outline centered on the body
    outline.style.width = `${finalSize}px`;
    outline.style.height = `${finalSize}px`;
    outline.style.left = `${centerX - finalSize / 2}px`;
    outline.style.top = `${centerY - finalSize / 2}px`;

    // Position the name label at top-right of the box
    name.style.left = `${centerX + finalSize / 2 + 6}px`;
    name.style.top = `${centerY - finalSize / 2}px`;

    // Toggle selected class based on focus target
    element.classList.toggle('selected', focusTarget === id);

    // Fade based on distance (farther = more transparent)
    const distance = camera.position.distanceTo(worldPos);
    const opacity = Math.max(0.3, Math.min(1, 100 / distance));
    element.style.opacity = opacity;
  }
}

// Initialize all bodies
async function init() {
  for (const [id, config] of Object.entries(BODIES)) {
    try {
      console.log(`Creating ${id}...`);
      await createBody(id, config);
      createLabel(id, config);
      console.log(`${id} created successfully`);
    } catch (e) {
      console.error(`Failed to create ${id}:`, e);
    }
  }
}

// Animation state
let isPaused = false;
let simulationSpeed = 1.0;
let viewScale = 1.0;
let focusTarget = 'sun';
let elapsedDays = 0;

// Camera fly-to animation state
let isFlying = false;
let flyStartPosition = new THREE.Vector3();
let flyStartTarget = new THREE.Vector3();
let flyEndPosition = new THREE.Vector3();
let flyEndTarget = new THREE.Vector3();
let flyProgress = 0;
const flyDuration = 1.5; // seconds

// Raycaster for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Detail panel elements
const detailPanel = document.getElementById('detail-panel');
const panelTitle = detailPanel.querySelector('.panel-title');
const panelSubtitle = detailPanel.querySelector('.panel-subtitle');
const panelImage = detailPanel.querySelector('.panel-image');
const panelDescription = document.getElementById('panel-description');
const panelStats = document.getElementById('panel-stats');
const panelFacts = document.getElementById('panel-facts');
const closeBtn = detailPanel.querySelector('.close-btn');

// Open detail panel with body info
function openDetailPanel(bodyId) {
  const config = BODIES[bodyId];
  if (!config) return;

  // Update panel content
  panelTitle.textContent = config.name;
  panelSubtitle.textContent = config.type || '';
  panelImage.src = config.image || '';
  panelImage.alt = config.name;
  panelDescription.textContent = config.description || '';
  panelFacts.textContent = config.facts || '';

  // Build stats grid
  panelStats.innerHTML = '';
  if (config.stats) {
    for (const [label, value] of Object.entries(config.stats)) {
      const statItem = document.createElement('div');
      statItem.className = 'stat-item';
      statItem.innerHTML = `
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
      `;
      panelStats.appendChild(statItem);
    }
  }

  // Open panel
  detailPanel.classList.add('open');
}

// Close detail panel
function closeDetailPanel() {
  detailPanel.classList.remove('open');
}

// Close button handler
closeBtn.addEventListener('click', closeDetailPanel);

function updatePositions(deltaTime) {
  if (isPaused) return;

  const daysPassed = deltaTime * simulationSpeed;
  elapsedDays += daysPassed;

  for (const [id, body] of Object.entries(celestialBodies)) {
    const config = body.config;

    // Rotation on axis
    if (config.rotationPeriod > 0) {
      const rotationSpeed = (2 * Math.PI) / config.rotationPeriod;
      body.mesh.rotation.y += rotationSpeed * daysPassed;
    }

    // Orbital motion
    if (config.orbitalPeriod > 0) {
      const orbitalSpeed = (2 * Math.PI) / config.orbitalPeriod;
      body.orbitAngle += orbitalSpeed * daysPassed;

      if (config.orbitAround) {
        // Orbit around another body (Moon around Earth)
        const parent = celestialBodies[config.orbitAround];
        if (parent) {
          // Get world position of parent
          const parentPos = new THREE.Vector3();
          parent.mesh.getWorldPosition(parentPos);
          body.mesh.position.x = parentPos.x + Math.cos(body.orbitAngle) * config.distance;
          body.mesh.position.z = parentPos.z + Math.sin(body.orbitAngle) * config.distance;
          body.mesh.position.y = parentPos.y;
        }
      } else if (body.orbitGroup) {
        // Orbit around Sun
        body.orbitGroup.rotation.y = body.orbitAngle;
      }
    }
  }
}

// Smooth easing function
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Fly camera to a celestial body
function flyTo(bodyId) {
  const body = celestialBodies[bodyId];
  if (!body) return;

  // Get target position
  const targetPos = new THREE.Vector3();
  body.mesh.getWorldPosition(targetPos);

  // Calculate camera end position - close to the body, slightly above and to the side
  const viewDistance = body.config.radius * 4 + 2; // Close enough to see detail

  // Position camera at an angle (not straight on)
  const cameraOffset = new THREE.Vector3(
    viewDistance * 0.7,  // side offset
    viewDistance * 0.5,  // above
    viewDistance * 0.7   // front offset
  );

  flyEndTarget.copy(targetPos);
  flyEndPosition.copy(targetPos).add(cameraOffset);

  // Store start positions
  flyStartPosition.copy(camera.position);
  flyStartTarget.copy(controls.target);

  // Start animation
  isFlying = true;
  flyProgress = 0;

  // Update focus target
  focusTarget = bodyId;

  // Update UI
  document.querySelectorAll('#focusButtons button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === bodyId);
  });

  // Update info panel
  const bodyConfig = BODIES[bodyId];
  const infoTitle = document.querySelector('.planet-info h4');
  const infoContent = document.getElementById('infoContent');
  if (bodyConfig) {
    infoTitle.textContent = bodyConfig.name;
    infoContent.textContent = bodyConfig.info;
  }

  // Open detail panel
  openDetailPanel(bodyId);
}

// Handle click on celestial bodies
function onCanvasClick(event) {
  // Calculate mouse position in normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update raycaster
  raycaster.setFromCamera(mouse, camera);

  // Get all celestial body meshes
  const meshes = Object.values(celestialBodies).map(b => b.mesh);

  // Check for intersections
  const intersects = raycaster.intersectObjects(meshes);

  if (intersects.length > 0) {
    // Find which body was clicked
    const clickedMesh = intersects[0].object;
    for (const [id, body] of Object.entries(celestialBodies)) {
      if (body.mesh === clickedMesh) {
        flyTo(id);
        break;
      }
    }
  }
}

// Camera follow/fly logic
function updateCamera(deltaTime) {
  if (isFlying) {
    // Animate fly-to
    flyProgress += deltaTime / flyDuration;

    if (flyProgress >= 1) {
      flyProgress = 1;
      isFlying = false;
    }

    const t = easeInOutCubic(flyProgress);

    // Interpolate camera position and target
    camera.position.lerpVectors(flyStartPosition, flyEndPosition, t);
    controls.target.lerpVectors(flyStartTarget, flyEndTarget, t);
  } else if (focusTarget !== 'free') {
    // Follow the target body
    const body = celestialBodies[focusTarget];
    if (!body) return;

    const targetPos = new THREE.Vector3();
    body.mesh.getWorldPosition(targetPos);

    // Smoothly move controls target to follow the body
    controls.target.lerp(targetPos, 0.05);

    // Keep camera at same relative offset
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    camera.position.copy(targetPos).add(offset);
  }
}

// Animation loop
const clock = new THREE.Clock();
let elapsedTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  elapsedTime += deltaTime;

  updatePositions(deltaTime);
  updateCamera(deltaTime);
  updateLabels();

  // Update sun corona - make it face camera (billboard) and animate
  if (sunCorona) {
    sunCorona.lookAt(camera.position);
    coronaMaterial.uniforms.time.value = elapsedTime;
  }

  controls.update();

  renderer.render(scene, camera);
}

// UI Event listeners
document.getElementById('speedSlider').addEventListener('input', (e) => {
  simulationSpeed = parseFloat(e.target.value);
  document.getElementById('speedValue').textContent = simulationSpeed.toFixed(1);
});

document.getElementById('pauseBtn').addEventListener('click', (e) => {
  isPaused = !isPaused;
  e.target.textContent = isPaused ? 'Resume' : 'Pause';
  e.target.classList.toggle('active', isPaused);
});

document.getElementById('resetBtn').addEventListener('click', () => {
  elapsedDays = 0;
  for (const body of Object.values(celestialBodies)) {
    body.orbitAngle = Math.random() * Math.PI * 2;
    body.mesh.rotation.y = 0;
  }
});

document.getElementById('scaleSlider').addEventListener('input', (e) => {
  viewScale = parseFloat(e.target.value);
  document.getElementById('scaleValue').textContent = viewScale.toFixed(1);

  // Scale all distances
  for (const [id, body] of Object.entries(celestialBodies)) {
    const config = body.config;
    if (config.distance > 0 && !config.orbitAround) {
      body.mesh.position.x = config.distance * viewScale;
      if (orbitLines[id]) {
        orbitLines[id].scale.set(viewScale, viewScale, viewScale);
      }
    }
  }
});

// Focus buttons - use flyTo for smooth animation
document.querySelectorAll('#focusButtons button').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    if (target === 'free') {
      focusTarget = 'free';
      document.querySelectorAll('#focusButtons button').forEach(b => {
        b.classList.toggle('active', b.dataset.target === 'free');
      });
      const infoTitle = document.querySelector('.planet-info h4');
      const infoContent = document.getElementById('infoContent');
      infoTitle.textContent = 'Free Camera';
      infoContent.textContent = 'Explore the solar system freely';
    } else {
      flyTo(target);
    }
  });
});

// Canvas click to select celestial bodies
renderer.domElement.addEventListener('click', onCanvasClick);

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start
init().then(() => {
  animate();
});
