import { useState, useEffect, useRef } from 'react';
import { Deck, OrbitView, COORDINATE_SYSTEM } from '@deck.gl/core';
import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { SphereGeometry } from '@luma.gl/engine';

// NASA CGI Moon Kit textures (local)
const MOON_COLOR = '/textures/lroc_color_2k.jpg';
const MOON_DISPLACEMENT = '/textures/moon_displacement.jpg';

// Other celestial body textures
const TEXTURES = {
  moon: MOON_COLOR,
  sun: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg/1280px-The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg',
  earth: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Solarsystemscope_texture_8k_earth_daymap.jpg/2880px-Solarsystemscope_texture_8k_earth_daymap.jpg',
  mars: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Solarsystemscope_texture_8k_mars.jpg'
};

// Displacement shader module for v9
const displacementModule = {
  name: 'displacement',
  vs: `
    uniform displacementUniforms {
      highp float scale;
    } displacement;
  `,
  fs: `
    uniform displacementUniforms {
      highp float scale;
    } displacement;
  `,
  uniformTypes: {
    scale: 'f32'
  },
  defaultUniforms: {
    scale: 0.03
  }
};

// Custom layer with displacement mapping
class DisplacedMeshLayer extends SimpleMeshLayer {
  static layerName = 'DisplacedMeshLayer';

  static defaultProps = {
    ...SimpleMeshLayer.defaultProps,
    displacementMap: { type: 'object', value: null },
    displacementScale: { type: 'number', value: 0.05 }
  };

  getShaders() {
    const shaders = super.getShaders();
    return {
      ...shaders,
      modules: [...shaders.modules, displacementModule],
      inject: {
        'vs:#decl': `
          uniform sampler2D displacementMap;
        `,
        'vs:DECKGL_FILTER_GL_POSITION': `
          // Sample the grayscale value from displacement map
          float height = texture(displacementMap, geometry.uv).r;
          // Push the vertex outward along the sphere normal (which is the normalized position for a unit sphere)
          vec3 sphereNormal = normalize(position.xyz);
          position.xyz = position.xyz + sphereNormal * height * displacement.scale;
        `
      }
    };
  }

  draw(opts) {
    const { displacementMap, displacementScale } = this.props;
    const { model } = this.state;

    if (model) {
      // Set uniform values
      model.shaderInputs.setProps({
        displacement: { scale: displacementScale, displacementMap }
      });

      // Bind the displacement texture sampler
      // if (displacementMap) {
      //   model.setBindings({ displacementMap });
      // }
    }

    super.draw(opts);
  }
}

// Control panel styles
const controlStyle = {
  position: 'absolute',
  top: 20,
  left: 20,
  background: 'rgba(0, 0, 0, 0.8)',
  padding: '16px',
  borderRadius: '8px',
  color: 'white',
  fontFamily: 'sans-serif',
  fontSize: '14px',
  zIndex: 1,
  minWidth: '220px'
};

const buttonStyle = {
  padding: '8px 16px',
  margin: '4px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  background: '#333',
  color: 'white'
};

const activeButtonStyle = {
  ...buttonStyle,
  background: '#3498db'
};

const sliderStyle = {
  width: '100%',
  marginTop: '8px'
};

export default function App() {
  const canvasRef = useRef(null);
  const deckRef = useRef(null);
  const [selectedBody, setSelectedBody] = useState('moon');
  const [rotation, setRotation] = useState(0);
  const [isRotating, setIsRotating] = useState(true);
  const [displacementScale, setDisplacementScale] = useState(0.03);
  const [useDisplacement, setUseDisplacement] = useState(true);
  const [displacementTexture, setDisplacementTexture] = useState(null);
  const [deckReady, setDeckReady] = useState(false);

  // Load displacement image and create GPU texture
  useEffect(() => {
    if (!deckReady || !deckRef.current) return;

    const device = deckRef.current.device;
    if (!device) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = MOON_DISPLACEMENT;
    img.onload = () => {
      // Draw image to canvas first
      console.log('Drawing displacement image to canvas');
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Create GPU texture
      console.log('Creating displacement texture from canvas');

      const texture = device.createTexture({
        format: 'rgba8unorm',
        width: canvas.width,
        height: canvas.height,
        sampler: {
          minFilter: 'linear',
          magFilter: 'linear',
          mipmapFilter: 'linear',
          addressModeU: 'clamp-to-edge',
          addressModeV: 'clamp-to-edge'
        },
        mipmaps: true
      });

      // Upload canvas data
      texture.copyExternalImage({
        image: canvas,
        width: canvas.width,
        height: canvas.height
      });

      // Generate mipmaps
      texture.generateMipmap?.();

      console.log('Displacement texture created', texture);
      setDisplacementTexture(texture);
    };
    
  }, [deckReady]);

  // Animation loop for rotation
  useEffect(() => {
    if (!isRotating) return;

    let animationId;
    const animate = () => {
      setRotation(r => (r + 0.1) % 360);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [isRotating]);

  // Initialize Deck.gl
  useEffect(() => {
    if (!canvasRef.current) return;

    deckRef.current = new Deck({
      canvas: canvasRef.current,
      initialViewState: {
        target: [0, 0, 0],
        zoom: 0.5,
        rotationX: 15,
        rotationOrbit: 0
      },
      controller: true,
      views: new OrbitView({ orbitAxis: 'Y' }),
      onDeviceInitialized: () => {
        console.log('Deck device initialized');
        setDeckReady(true);
      }
    });

    return () => {
      if (deckRef.current) {
        deckRef.current.finalize();
      }
    };
  }, []);

  // Update layers when selection or rotation changes
  useEffect(() => {
    if (!deckRef.current) return;

    // Create high-res sphere geometry for better displacement detail
    const sphereGeometry = new SphereGeometry({
      nlat: 128,
      nlong: 128,
      radius: 1
    });

    const isMoon = selectedBody === 'moon';

    let layer;

    if (isMoon && useDisplacement && displacementTexture) {
      console.log('Using displacement map for moon');
      // Use displaced mesh layer for moon with displacement
      layer = new DisplacedMeshLayer({
        id: 'celestial-body',
        // wireframe: true,
        data: [{ position: [0, 0, 0] }],
        mesh: sphereGeometry,
        texture: MOON_COLOR,
        displacementMap: displacementTexture,
        displacementScale: displacementScale,
        getPosition: d => d.position,
        getColor: [255, 255, 255],
        getOrientation: [0, rotation, 0],
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        material: { ambient: 0.35, diffuse: 0.6, specularColor: [30, 30, 30] }
      });
    } else {
      // Use simple mesh layer for other bodies
      layer = new SimpleMeshLayer({
        id: 'celestial-body',
        data: [{ position: [0, 0, 0] }],
        mesh: sphereGeometry,
        texture: TEXTURES[selectedBody],
        getPosition: d => d.position,
        getColor: [255, 255, 255],
        getOrientation: [0, rotation, 0],
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        material: selectedBody === 'sun'
          ? { ambient: 1.0, diffuse: 0, specularColor: [0, 0, 0] }
          : { ambient: 0.35, diffuse: 0.6, specularColor: [30, 30, 30] }
      });
    }

    deckRef.current.setProps({ layers: [layer] });
  }, [selectedBody, rotation, displacementScale, useDisplacement, displacementTexture]);

  return (
    <>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />

      {/* Control Panel */}
      <div style={controlStyle}>
        <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '16px' }}>
          Celestial Bodies
        </div>

        {/* Body selection */}
        <div style={{ marginBottom: '12px' }}>
          {Object.keys(TEXTURES).map(body => (
            <button
              key={body}
              style={selectedBody === body ? activeButtonStyle : buttonStyle}
              onClick={() => setSelectedBody(body)}
            >
              {body.charAt(0).toUpperCase() + body.slice(1)}
            </button>
          ))}
        </div>

        {/* Rotation toggle */}
        <div style={{ marginBottom: '12px' }}>
          <button
            style={isRotating ? activeButtonStyle : buttonStyle}
            onClick={() => setIsRotating(!isRotating)}
          >
            {isRotating ? '⏸ Stop Rotation' : '▶ Start Rotation'}
          </button>
        </div>

        {/* Displacement controls (only for moon) */}
        {selectedBody === 'moon' && (
          <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #444'
          }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
              Moon Displacement
            </div>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={useDisplacement}
                onChange={(e) => setUseDisplacement(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Enable displacement map
            </label>

            {useDisplacement && (
              <div>
                <label>Scale: {displacementScale.toFixed(3)}</label>
                <input
                  type="range"
                  min="0"
                  max="3.0"
                  step="0.005"
                  value={displacementScale}
                  onChange={(e) => setDisplacementScale(parseFloat(e.target.value))}
                  style={sliderStyle}
                />
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div style={{ marginTop: '16px', fontSize: '12px', color: '#aaa' }}>
          Drag to orbit • Scroll to zoom
          {selectedBody === 'moon' && (
            <div style={{ marginTop: '4px' }}>
              Using NASA CGI Moon Kit textures
            </div>
          )}
        </div>
      </div>
    </>
  );
}
