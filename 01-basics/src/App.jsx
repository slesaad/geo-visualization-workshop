import { useState } from 'react';
import { DeckGL } from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Sample data: cities with coordinates
const CITIES = [
  { name: 'San Francisco', coordinates: [-122.4194, 37.7749], population: 883305 },
  { name: 'Los Angeles', coordinates: [-118.2437, 34.0522], population: 3979576 },
  { name: 'Seattle', coordinates: [-122.3321, 47.6062], population: 753675 },
  { name: 'Portland', coordinates: [-122.6750, 45.5152], population: 654741 },
  { name: 'San Diego', coordinates: [-117.1611, 32.7157], population: 1423851 },
  { name: 'Las Vegas', coordinates: [-115.1398, 36.1699], population: 651319 },
  { name: 'Phoenix', coordinates: [-112.0740, 33.4484], population: 1680992 },
  { name: 'Denver', coordinates: [-104.9903, 39.7392], population: 727211 },
  { name: 'Salt Lake City', coordinates: [-111.8910, 40.7608], population: 200567 },
  { name: 'Boise', coordinates: [-116.2023, 43.6150], population: 235684 },
];

// Initial view state centered on western USA
const INITIAL_VIEW_STATE = {
  longitude: -118,
  latitude: 40,
  zoom: 4,
  pitch: 0,
  bearing: 0
};

function App() {
  const [hoverInfo, setHoverInfo] = useState(null);

  // Create the ScatterplotLayer
  const layers = [
    new ScatterplotLayer({
      id: 'cities-layer',
      data: CITIES,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 5,
      radiusMaxPixels: 100,
      lineWidthMinPixels: 1,
      // Accessors - these define how to read data from each item
      getPosition: d => d.coordinates,
      getRadius: d => Math.sqrt(d.population) * 10,
      getFillColor: [255, 140, 0, 200],      // Orange fill
      getLineColor: [0, 0, 0, 255],          // Black stroke
      // Hover handler
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
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          transform: 'translate(10px, 10px)'
        }}>
          <strong>{hoverInfo.object.name}</strong>
          <br />
          Population: {hoverInfo.object.population.toLocaleString()}
        </div>
      )}

      {/* Instructions Panel */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '16px',
        borderRadius: '8px',
        maxWidth: '300px',
        fontSize: '14px'
      }}>
        <h2 style={{ marginBottom: '12px', fontSize: '18px' }}>01 - Deck.gl Basics</h2>
        <p style={{ marginBottom: '8px' }}>
          This is a simple ScatterplotLayer showing cities in the western USA.
        </p>
        <p style={{ marginBottom: '8px' }}>
          <strong>Controls:</strong>
        </p>
        <ul style={{ marginLeft: '16px', marginBottom: '12px' }}>
          <li>Drag to pan</li>
          <li>Scroll to zoom</li>
          <li>Hover for tooltip</li>
        </ul>
        <p style={{ color: '#ffa500' }}>
          <strong>Exercise:</strong> Try changing the colors, sizes, and adding more cities!
        </p>
      </div>
    </div>
  );
}

export default App;
