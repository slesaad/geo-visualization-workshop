import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TIFFLoader } from 'three/addons/loaders/TIFFLoader.js';

// Texture URLs
const TEXTURES = {
  moon: {
    color: '/textures/lroc_color_2k.jpg',
    displacement: '/textures/ldem_16.tif'
  },
  earth: {
    color: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Solarsystemscope_texture_8k_earth_daymap.jpg/2880px-Solarsystemscope_texture_8k_earth_daymap.jpg',
    displacement: null
  },
  mars: {
    color: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Solarsystemscope_texture_8k_mars.jpg',
    displacement: null
  },
  sun: {
    color: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Solarsystemscope_texture_2k_sun.jpg',
    displacement: null
  }
};

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

// Point light to highlight displacement/craters with grazing angle
const pointLight = new THREE.PointLight(0xffffcc, 0.8, 10);
pointLight.position.set(2, 0.5, 2);
scene.add(pointLight);

// Starfield background
const starGeometry = new THREE.BufferGeometry();
const starCount = 5000;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
  const radius = 100 + Math.random() * 100;
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

// Sphere geometry with high detail for displacement
const sphereGeometry = new THREE.SphereGeometry(1, 3000, 3000);

// Current state
let currentBody = 'moon';
let isRotating = true;
let displacementEnabled = true;
let displacementScale = 0.03;
let sphere = null;

// Load textures and create materials cache
const materialsCache = {};
const texturesCache = {};

async function loadTexture(url, isDataTexture = false) {
  const cacheKey = url + (isDataTexture ? '_data' : '');
  if (texturesCache[cacheKey]) return texturesCache[cacheKey];

  // Check if it's a TIFF file
  const isTiff = url.toLowerCase().endsWith('.tif') || url.toLowerCase().endsWith('.tiff');

  return new Promise((resolve, reject) => {
    const loader = isTiff ? tiffLoader : textureLoader;

    loader.load(
      url,
      (texture) => {
        // Only set colorSpace for color textures, not data textures like displacement maps
        if (!isDataTexture) {
          texture.colorSpace = THREE.SRGBColorSpace;
        }
        texturesCache[cacheKey] = texture;
        resolve(texture);
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', url, error);
        reject(error);
      }
    );
  });
}

async function createMaterial(bodyName) {
  const bodyTextures = TEXTURES[bodyName];

  const colorTexture = await loadTexture(bodyTextures.color);

  let material;

  if (bodyName === 'moon' && bodyTextures.displacement) {
    // Moon with displacement mapping
    // Load displacement as data texture (no color space conversion)
    const displacementTexture = await loadTexture(bodyTextures.displacement, true);

    material = new THREE.MeshStandardMaterial({
      map: colorTexture,
      displacementMap: displacementTexture,
      displacementScale: displacementEnabled ? displacementScale : 0,
      displacementBias: -0.5 * displacementScale, // Center the displacement
      roughness: 0.8,
      metalness: 0.1
    });
  } else if (bodyName === 'sun') {
    // Sun is emissive
    material = new THREE.MeshBasicMaterial({
      map: colorTexture
    });
  } else {
    // Other planets
    material = new THREE.MeshStandardMaterial({
      map: colorTexture,
      roughness: 0.7,
      metalness: 0.1
    });
  }

  return material;
}

async function switchBody(bodyName) {
  currentBody = bodyName;

  // Update UI
  document.querySelectorAll('#bodyButtons button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.body === bodyName);
  });

  // Show/hide displacement controls
  const displacementControls = document.getElementById('displacementControls');
  displacementControls.style.display = bodyName === 'moon' ? 'block' : 'none';

  // Update texture info
  const textureInfo = document.getElementById('textureInfo');
  if (bodyName === 'moon') {
    textureInfo.textContent = 'Using NASA CGI Moon Kit textures';
  } else {
    textureInfo.textContent = `Viewing ${bodyName.charAt(0).toUpperCase() + bodyName.slice(1)}`;
  }

  // Create or retrieve material
  if (!materialsCache[bodyName]) {
    materialsCache[bodyName] = await createMaterial(bodyName);
  }

  // Update sphere material
  if (sphere) {
    sphere.material = materialsCache[bodyName];
  }
}

function updateDisplacement() {
  if (currentBody === 'moon' && materialsCache.moon) {
    const scale = displacementEnabled ? displacementScale : 0;
    materialsCache.moon.displacementScale = scale;
    materialsCache.moon.displacementBias = -0.5 * scale;
    materialsCache.moon.needsUpdate = true;
  }
}

// Initialize sphere
async function init() {
  // Create initial moon material
  const material = await createMaterial('moon');
  materialsCache.moon = material;

  // Create sphere
  sphere = new THREE.Mesh(sphereGeometry, material);
  scene.add(sphere);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  if (isRotating && sphere) {
    sphere.rotation.y += 0.002;
  }

  controls.update();
  renderer.render(scene, camera);
}

// Event listeners
document.querySelectorAll('#bodyButtons button').forEach(btn => {
  btn.addEventListener('click', () => switchBody(btn.dataset.body));
});

document.getElementById('rotationToggle').addEventListener('click', (e) => {
  isRotating = !isRotating;
  e.target.textContent = isRotating ? 'Stop Rotation' : 'Start Rotation';
  e.target.classList.toggle('active', isRotating);
});

document.getElementById('enableDisplacement').addEventListener('change', (e) => {
  displacementEnabled = e.target.checked;
  document.getElementById('scaleControl').style.display = displacementEnabled ? 'block' : 'none';
  updateDisplacement();
});

document.getElementById('displacementScale').addEventListener('input', (e) => {
  displacementScale = parseFloat(e.target.value);
  document.getElementById('scaleValue').textContent = displacementScale.toFixed(3);
  updateDisplacement();
});

// Light angle control
document.getElementById('lightAngle').addEventListener('input', (e) => {
  const angle = parseFloat(e.target.value) * (Math.PI / 180); // Convert to radians
  const radius = 7;
  directionalLight.position.x = Math.cos(angle) * radius;
  directionalLight.position.z = Math.sin(angle) * radius;
  document.getElementById('lightAngleValue').textContent = e.target.value;
});

// Point light angle control
document.getElementById('pointLightAngle').addEventListener('input', (e) => {
  const angle = parseFloat(e.target.value) * (Math.PI / 180); // Convert to radians
  const radius = 2.5; // Closer to surface for grazing light
  pointLight.position.x = Math.cos(angle) * radius;
  pointLight.position.z = Math.sin(angle) * radius;
  document.getElementById('pointLightAngleValue').textContent = e.target.value;
});

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start
init();
animate();
