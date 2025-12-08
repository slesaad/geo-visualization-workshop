import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TIFFLoader } from 'three/addons/loaders/TIFFLoader.js';

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
    info: 'The Sun - Center of our solar system, a G-type main-sequence star'
  },
  earth: {
    name: 'Earth',
    radius: 2,
    distance: 30,
    orbitalPeriod: 365, // days
    rotationPeriod: 1,
    color: '/textures/earth-texture.jpg',
    bumpMap: '/textures/8081_earthbump2k.jpg',
    bumpScale: 10.0,
    info: 'Earth - Our home planet, third from the Sun'
  },
  moon: {
    name: 'Moon',
    radius: 0.6,
    distance: 5, // distance from Earth
    orbitalPeriod: 27.3, // days around Earth
    rotationPeriod: 27.3, // tidally locked
    orbitAround: 'earth',
    color: '/textures/lroc_color_poles_4k.tif',
    bumpMap: '/textures/ldem_16.tif',
    bumpScale: 0.1,
    info: 'The Moon - Earth\'s only natural satellite'
  },
  mars: {
    name: 'Mars',
    radius: 1.5,
    distance: 50,
    orbitalPeriod: 687, // days
    rotationPeriod: 1.03,
    color: '/textures/marsmap1k.jpg',
    bumpMap: '/textures/marsbump1k.jpg',
    normalMap: '/textures/mars_1k_normal.jpg',
    bumpScale: 10.0,
    normalScale: 5.0,
    info: 'Mars - The Red Planet, fourth from the Sun'
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

// Initialize all bodies
async function init() {
  for (const [id, config] of Object.entries(BODIES)) {
    try {
      console.log(`Creating ${id}...`);
      await createBody(id, config);
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

// Time scale: 1 second = 1 day (at speed 1.0)
const TIME_SCALE = 1 / 60; // At 60fps, each frame = 1/60 of a day at speed 1.0

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

// Camera follow logic
function updateCamera() {
  if (focusTarget === 'free') return;

  const body = celestialBodies[focusTarget];
  if (!body) return;

  const targetPos = new THREE.Vector3();
  body.mesh.getWorldPosition(targetPos);

  // Smoothly move controls target to follow the body
  controls.target.lerp(targetPos, 0.05);
}

// Animation loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  updatePositions(deltaTime);
  updateCamera();
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

// Focus buttons
document.querySelectorAll('#focusButtons button').forEach(btn => {
  btn.addEventListener('click', () => {
    focusTarget = btn.dataset.target;

    // Update button states
    document.querySelectorAll('#focusButtons button').forEach(b => {
      b.classList.toggle('active', b.dataset.target === focusTarget);
    });

    // Update info panel
    const body = BODIES[focusTarget];
    const infoTitle = document.querySelector('.planet-info h4');
    const infoContent = document.getElementById('infoContent');

    if (body) {
      infoTitle.textContent = body.name;
      infoContent.textContent = body.info;
    } else {
      infoTitle.textContent = 'Free Camera';
      infoContent.textContent = 'Explore the solar system freely';
    }
  });
});

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
