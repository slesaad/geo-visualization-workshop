import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TIFFLoader } from 'three/addons/loaders/TIFFLoader.js';

const BASE = import.meta.env.BASE_URL;

// Texture URLs and settings
const TEXTURES = {
  moon: {
    color: BASE + 'textures/lroc_color_poles_4k.tif',
    bumpMap: BASE + 'textures/ldem_16.tif',
    bumpScale: 1.0
  },
  earth: {
    color: BASE + 'textures/earth-texture.jpg',
    bumpMap: BASE + 'textures/8081_earthbump2k.jpg',
    bumpScale: 10.0
  },
  mars: {
    color: BASE + 'textures/marsmap1k.jpg',
    bumpMap: BASE + 'textures/marsbump1k.jpg',
    normalMap: BASE + 'textures/mars_1k_normal.jpg',
    bumpScale: 10.0,
    normalScale: 5.0
  },
  sun: {
    color: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Solarsystemscope_texture_2k_sun.jpg'
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
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

// Sphere geometry with high detail for bump/normal mapping
const sphereGeometry = new THREE.SphereGeometry(1, 256, 256);

// Current state
let currentBody = 'moon';
let isRotating = true;
let displacementEnabled = true;
let displacementScale = 1.0;
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
  const hasBumpMap = bodyTextures.bumpMap != null;
  const hasNormalMap = bodyTextures.normalMap != null;

  if (hasBumpMap || hasNormalMap) {
    const materialOptions = {
      map: colorTexture,
      roughness: 0.8,
      metalness: 0.1
    };

    // Load and apply bump map if provided
    if (hasBumpMap) {
      const bumpTexture = await loadTexture(bodyTextures.bumpMap, true);
      materialOptions.bumpMap = bumpTexture;
      materialOptions.bumpScale = displacementEnabled ? (bodyTextures.bumpScale || 1.0) : 0;
    }

    // Load and apply normal map if provided (takes priority for lighting)
    if (hasNormalMap) {
      const normalTexture = await loadTexture(bodyTextures.normalMap, true);
      materialOptions.normalMap = normalTexture;
      const nScale = bodyTextures.normalScale || 1.0;
      materialOptions.normalScale = new THREE.Vector2(nScale, nScale);
    }

    material = new THREE.MeshStandardMaterial(materialOptions);
  } else if (bodyName === 'sun') {
    // Sun is emissive
    material = new THREE.MeshBasicMaterial({
      map: colorTexture
    });
  } else {
    // Other planets without maps
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

  // Show/hide bump controls based on whether this body has a bump or normal map
  const displacementControls = document.getElementById('displacementControls');
  const hasBumpMap = TEXTURES[bodyName]?.bumpMap != null;
  const hasNormalMap = TEXTURES[bodyName]?.normalMap != null;
  displacementControls.style.display = (hasBumpMap || hasNormalMap) ? 'block' : 'none';

  // Update slider to show body-specific bump scale
  if (hasBumpMap) {
    displacementScale = TEXTURES[bodyName].bumpScale || 1.0;
    document.getElementById('displacementScale').value = displacementScale;
    document.getElementById('scaleValue').textContent = displacementScale.toFixed(1);
  }

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
  // Update bump scale for any body that has a bump map
  const hasBumpMap = TEXTURES[currentBody]?.bumpMap != null;
  if (hasBumpMap && materialsCache[currentBody]) {
    const scale = displacementEnabled ? displacementScale : 0;
    materialsCache[currentBody].bumpScale = scale;
    materialsCache[currentBody].needsUpdate = true;
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
