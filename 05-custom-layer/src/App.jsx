import { useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import SquareLayer from './square-layer';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Generate random data
const generateData = (count) => {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      id: i,
      position: [
        -122.5 + Math.random() * 5,
        34 + Math.random() * 8
      ],
      size: 10 + Math.random() * 40,
      color: [
        Math.floor(Math.random() * 255),
        Math.floor(Math.random() * 255),
        Math.floor(Math.random() * 255),
        200
      ]
    });
  }
  return data;
};

const DATA = generateData(10);

const INITIAL_VIEW_STATE = {
  longitude: -120,
  latitude: 37,
  zoom: 5.5,
  pitch: 0,
  bearing: 0
};

function App() {
  const [hoverInfo, setHoverInfo] = useState(null);
  const [sizeScale, setSizeScale] = useState(1);

  const layers = [
    new SquareLayer({
      id: 'square-layer',
      data: DATA,
      pickable: true,
      getPosition: d => d.position,
      getSize: d => d.size * sizeScale,
      getColor: d => d.color,
      updateTriggers: {
        getSize: sizeScale
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
          <strong>Square #{hoverInfo.object.id}</strong><br />
          Size: {hoverInfo.object.size.toFixed(1)}
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
          05 - Custom Layer
        </h2>
        <p style={{ marginBottom: '16px', color: '#aaa', fontSize: '12px' }}>
          Build a layer from scratch with custom geometry and shaders
        </p>

        {/* Size Scale Control */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            Size Scale: {sizeScale.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={sizeScale}
            onChange={e => setSizeScale(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Layer Structure */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
            Custom Layer Structure:
          </div>
          <pre style={{
            fontSize: '9px',
            color: '#6af',
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontFamily: 'Monaco, Consolas, monospace'
          }}>
{`class SquareLayer extends Layer {
  static layerName = 'SquareLayer';
  static defaultProps = {...};

  getShaders() {
    return { vs, fs, modules };
  }

  initializeState() {
    // Define attributes
    attributeManager.addInstanced({
      instancePositions: {...},
      instanceSizes: {...},
      instanceColors: {...}
    });
  }

  updateState() {
    // Create/update model
  }

  draw() {
    // Draw with uniforms
    model.draw(renderPass);
  }

  _getModel() {
    // Create geometry & model
  }
}`}
          </pre>
        </div>

        {/* Key Concepts */}
        <div style={{
          fontSize: '11px',
          color: '#888',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <strong style={{ color: '#aaa' }}>Key Concepts:</strong>
          <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
            <li><code style={{ color: '#6af' }}>Layer</code> - Base class from @deck.gl/core</li>
            <li><code style={{ color: '#6af' }}>Model</code> - luma.gl rendering primitive</li>
            <li><code style={{ color: '#6af' }}>Geometry</code> - Vertex data container</li>
            <li><code style={{ color: '#6af' }}>addInstanced()</code> - Per-instance attributes</li>
            <li><code style={{ color: '#6af' }}>project32</code> - Coordinate projection module</li>
            <li><code style={{ color: '#6af' }}>picking</code> - Mouse picking support</li>
          </ul>
        </div>

        {/* Stats */}
        <div style={{
          marginTop: '16px',
          padding: '10px',
          background: 'rgba(100, 150, 255, 0.1)',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{DATA.length}</span>
          <span style={{ color: '#888', marginLeft: '8px' }}>squares rendered</span>
        </div>
      </div>
    </div>
  );
}

export default App;
