import { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Generate random points
const generatePoints = (count) => {
  const points = [];
  for (let i = 0; i < count; i++) {
    points.push({
      id: i,
      coordinates: [
        -122.5 + Math.random() * 5,
        34 + Math.random() * 8
      ],
      value: Math.random(),
      phase: Math.random() * Math.PI * 2
    });
  }
  return points;
};

const POINTS = generatePoints(300);

const INITIAL_VIEW_STATE = {
  longitude: -120,
  latitude: 37,
  zoom: 5.5,
  pitch: 0,
  bearing: 0
};

const uniformBlock = `\
uniform animatedPlotUniforms {
  highp float uTime;
  highp float effectType;
} animatedPlot;
`;

// Custom layer that extends ScatterplotLayer with shader injection
// Uses uniform blocks (luma.gl v9 / deck.gl v9 approach)
class AnimatedScatterplotLayer extends ScatterplotLayer {
  static layerName = 'AnimatedScatterplotLayer';

  static defaultProps = {
    ...ScatterplotLayer.defaultProps,
    uTime: { type: 'number', value: 0 },
    effectType: { type: 'number', value: 0 }
  };

  getShaders() {
    const shaders = super.getShaders();
    shaders.inject = {
      // Vertex shader declarations - varyings to pass to fragment
      'vs:#decl': `
        out float vTime;
        out float vEffect;
        out vec2 vPosition;
      `,

      // At end of vertex main - pass data to fragment shader
      'vs:#main-end': `
        vTime = animatedPlot.uTime;
        vEffect = animatedPlot.effectType;
        vPosition = geometry.position.xy;
      `,

      // Modify point size based on effect
      'vs:DECKGL_FILTER_SIZE': `
          if (animatedPlot.effectType == 1.0) {
            // Pulse effect
            float pulse = 1.0 + 0.5 * sin(animatedPlot.uTime * 3.0 + geometry.position.x * 0.0001);
            size *= pulse;
          } else if (animatedPlot.effectType == 4.0) {
            // Breathing effect - size changes
            float breath = 0.7 + 0.3 * sin(animatedPlot.uTime * 2.0 + geometry.position.x * 0.0001);
            size *= breath;
          }
        `,

      // // Modify position based on effect
      'vs:DECKGL_FILTER_GL_POSITION': `
          if (animatedPlot.effectType == 3.0) {
            // Wave effect
            float wave = sin(position.x * 0.00002 + animatedPlot.uTime * 2.0) * 30.0;
            position.y += wave;
          }
        `,

      // Fragment shader declarations
      'fs:#decl': `
          in float vTime;
          in float vEffect;
          in vec2 vPosition;
        `,

      // Modify color based on effect
      'fs:DECKGL_FILTER_COLOR': `
          int effect = int(vEffect);
          if (effect == 2) {
            // Rainbow effect
            float rainbow = vPosition.x * 0.00005 + vTime;
            float r = sin(rainbow) * 0.5 + 0.5;
            float g = sin(rainbow + 2.094) * 0.5 + 0.5;
            float b = sin(rainbow + 4.189) * 0.5 + 0.5;
            color = vec4(r, g, b, color.a);
          } else if (effect == 4) {
            // Breathing alpha
            float breath = 0.4 + 0.6 * (sin(vTime * 2.0 + vPosition.x * 0.0001) * 0.5 + 0.5);
            color.a *= breath;
          } else if (effect == 5) {
            // Heat effect
            float heat = fract(vPosition.x * 0.00001 + vPosition.y * 0.00001);
            vec3 heatColor;
            if (heat < 0.33) {
              heatColor = mix(vec3(0.0), vec3(1.0, 0.0, 0.0), heat * 3.0);
            } else if (heat < 0.66) {
              heatColor = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), (heat - 0.33) * 3.0);
            } else {
              heatColor = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), (heat - 0.66) * 3.0);
            }
            color.rgb = heatColor;
            color.a *= 0.8 + 0.2 * sin(vTime * 5.0 + heat * 10.0);
          } else if (effect == 6) {
            // Color shift
            float shift = vTime * 0.5;
            float r = sin(shift) * 0.5 + 0.5;
            float g = sin(shift + 2.094) * 0.5 + 0.5;
            float b = sin(shift + 4.189) * 0.5 + 0.5;
            color.rgb *= vec3(r, g, b) * 2.0;
          } else if (effect == 7) {
            // Stripes
            float stripe = sin((vPosition.x + vPosition.y) * 0.00005 + vTime * 5.0);
            color.rgb *= 0.5 + 0.5 * stripe;
          }
        `
    }
    shaders.modules = [...shaders.modules, {
      name: 'animatedPlot',
      vs: uniformBlock,
      fs: uniformBlock,
      uniformTypes: {
        uTime: 'f32',
        effectType: 'f32'
      }
    }];

    return shaders;
  }

  draw(opts) {
    const { uTime, effectType } = this.props;

    // Set uniforms via the shaderInputs (uniform block approach)
    if (this.state.model) {
      this.state.model.shaderInputs.setProps({
        animatedPlot: {
          uTime,
          effectType
        }
      });
    }

    super.draw(opts);
  }
}

// Effect definitions
const EFFECTS = [
  { id: 0, name: 'No Effect', description: 'Standard rendering without modifications' },
  { id: 1, name: 'Pulsing Size', description: 'Points pulse in size over time (vertex shader)' },
  { id: 2, name: 'Rainbow Color', description: 'Colors cycle through rainbow based on position' },
  { id: 3, name: 'Wave Distortion', description: 'Points move in a wave pattern (vertex position)' },
  { id: 4, name: 'Breathing', description: 'Points fade and grow like breathing' },
  { id: 5, name: 'Heat Glow', description: 'Heat-map style coloring based on position' },
  { id: 6, name: 'Color Shift', description: 'All colors shift through hues over time' },
  { id: 7, name: 'Stripes', description: 'Animated diagonal stripe pattern' }
];

function App() {
  const [selectedEffect, setSelectedEffect] = useState(0);
  const [time, setTime] = useState(0);
  const [hoverInfo, setHoverInfo] = useState(null);

  // Animation loop
  useEffect(() => {
    let animationId;
    const animate = () => {
      setTime(t => t + 0.016);
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const layers = [
    new AnimatedScatterplotLayer({
      id: 'animated-points',
      data: POINTS,
      pickable: true,
      opacity: 0.9,
      stroked: false,
      filled: true,
      radiusMinPixels: 8,
      radiusMaxPixels: 30,
      getPosition: d => d.coordinates,
      getRadius: d => 5 + d.value * 10,
      getFillColor: [100, 150, 255, 230],

      // Custom props for our shader
      uTime: time,
      effectType: selectedEffect,

      // Force updates when these change
      updateTriggers: {
        uTime: time,
        effectType: selectedEffect
      },

      onHover: info => setHoverInfo(info.object ? info : null)
    })
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
      >
        <Map mapStyle={MAP_STYLE} />
      </DeckGL>

      {/* Tooltip */}
      {hoverInfo && (
        <div style={{
          position: 'absolute',
          zIndex: 1,
          pointerEvents: 'none',
          left: hoverInfo.x,
          top: hoverInfo.y,
          background: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '10px 14px',
          borderRadius: '6px',
          fontSize: '13px',
          transform: 'translate(10px, 10px)'
        }}>
          <strong>Point #{hoverInfo.object.id}</strong><br />
          Value: {hoverInfo.object.value.toFixed(3)}
        </div>
      )}

      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(20, 20, 30, 0.95)',
        padding: '16px',
        borderRadius: '8px',
        width: '320px',
        fontSize: '13px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        color: '#eee',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginBottom: '8px', fontSize: '16px', color: '#fff' }}>
          04 - Shader Injection
        </h2>
        <p style={{ marginBottom: '16px', color: '#aaa', fontSize: '12px' }}>
          Custom layer with uniform blocks & shader injection
        </p>

        {/* Effect selector */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Select Effect:
          </label>
          {EFFECTS.map((effect) => (
            <div
              key={effect.id}
              onClick={() => setSelectedEffect(effect.id)}
              style={{
                padding: '10px 12px',
                marginBottom: '6px',
                background: selectedEffect === effect.id ? 'rgba(100, 150, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                cursor: 'pointer',
                border: selectedEffect === effect.id ? '1px solid rgba(100, 150, 255, 0.6)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: selectedEffect === effect.id ? '#88aaff' : '#fff' }}>
                {effect.name}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                {effect.description}
              </div>
            </div>
          ))}
        </div>

        {/* Code preview */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
            Layer Structure (deck.gl v9):
          </div>
          <pre style={{
            fontSize: '9px',
            color: '#6af',
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontFamily: 'Monaco, Consolas, monospace'
          }}>
            {`getShaders() {
              return {
                ...super.getShaders(),
                modules: [..., {
                  name: 'custom-animation',
                  uniformTypes: {
                    uTime: 'f32',
                    effectType: 'i32'
                  }
                }],
                inject: {
                  'vs:DECKGL_FILTER_SIZE': \`
                    size *= sin(
                      animatedPlot.uTime
                    );
                  \`
                }
              };
            }

            draw(opts) {
              this.state.model.shaderInputs
                .setProps({
                  animatedPlot: {
                    uTime, effectType
                  }
                });
              super.draw(opts);
            }`}
          </pre>
        </div>

        {/* Info */}
        <div style={{
          fontSize: '11px',
          color: '#888',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <strong style={{ color: '#aaa' }}>Key Concepts:</strong>
          <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
            <li><code style={{ color: '#6af' }}>modules</code> - Define uniform block with types</li>
            <li><code style={{ color: '#6af' }}>uniformTypes</code> - f32, i32, vec2, vec3, vec4, mat4</li>
            <li><code style={{ color: '#6af' }}>shaderInputs.setProps()</code> - Set uniform values</li>
            <li><code style={{ color: '#6af' }}>animatedPlot.uTime</code> - Access in GLSL</li>
          </ul>
          <p style={{ marginTop: '8px', color: '#666' }}>
            Uniform block name is auto-camelCased from module name.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
