import { useState } from 'react';
import { DeckGL } from '@deck.gl/react';
import {
  ScatterplotLayer,
  ArcLayer,
  TextLayer,
  PathLayer,
  GeoJsonLayer
} from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Cities data
const CITIES = [
  { name: 'San Francisco', coordinates: [-122.4194, 37.7749], population: 883305 },
  { name: 'Los Angeles', coordinates: [-118.2437, 34.0522], population: 3979576 },
  { name: 'Seattle', coordinates: [-122.3321, 47.6062], population: 753675 },
  { name: 'Portland', coordinates: [-122.6750, 45.5152], population: 654741 },
  { name: 'Phoenix', coordinates: [-112.0740, 33.4484], population: 1680992 },
  { name: 'Denver', coordinates: [-104.9903, 39.7392], population: 727211 },
];

// Connections between cities (for ArcLayer)
const CONNECTIONS = [
  { from: CITIES[0], to: CITIES[1], volume: 5000 },  // SF -> LA
  { from: CITIES[0], to: CITIES[2], volume: 3000 },  // SF -> Seattle
  { from: CITIES[2], to: CITIES[3], volume: 4000 },  // Seattle -> Portland
  { from: CITIES[1], to: CITIES[4], volume: 2500 },  // LA -> Phoenix
  { from: CITIES[4], to: CITIES[5], volume: 1500 },  // Phoenix -> Denver
  { from: CITIES[5], to: CITIES[0], volume: 2000 },  // Denver -> SF
];

// A path showing a route (for PathLayer)
const ROUTE_PATH = [
  { path: [
    [-122.4194, 37.7749],  // SF
    [-121.8863, 37.3382],  // San Jose
    [-119.4179, 36.7783],  // Fresno
    [-118.2437, 34.0522],  // LA
  ], name: 'California Route' }
];

// GeoJSON for a simple polygon (California approximate boundary)
const CALIFORNIA_GEOJSON = {
  type: 'Feature',
  properties: { name: 'California Region' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-124.4096, 42.0095],
      [-124.2120, 41.9983],
      [-123.6237, 39.8164],
      [-123.0651, 38.4633],
      [-122.3890, 37.7836],
      [-121.8853, 36.6002],
      [-120.6440, 35.1362],
      [-117.6678, 33.0505],
      [-114.6298, 32.7218],
      [-114.6185, 34.8752],
      [-117.0089, 36.9589],
      [-118.3594, 38.9205],
      [-120.0010, 41.9950],
      [-124.4096, 42.0095]
    ]]
  }
};

const INITIAL_VIEW_STATE = {
  longitude: -119,
  latitude: 37.5,
  zoom: 5,
  pitch: 30,
  bearing: 0
};

function App() {
  const [hoverInfo, setHoverInfo] = useState(null);
  const [visibleLayers, setVisibleLayers] = useState({
    geojson: true,
    scatterplot: true,
    arc: true,
    path: true,
    text: true
  });

  const toggleLayer = (layerName) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layerName]: !prev[layerName]
    }));
  };

  const layers = [
    // 1. GeoJsonLayer - Shows a polygon region
    visibleLayers.geojson && new GeoJsonLayer({
      id: 'geojson-layer',
      data: CALIFORNIA_GEOJSON,
      pickable: true,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 2,
      getFillColor: [100, 150, 200, 50],
      getLineColor: [100, 150, 200, 200],
      onHover: info => setHoverInfo(info.object ? { ...info, layerType: 'GeoJSON' } : null)
    }),

    // 2. PathLayer - Shows a route
    visibleLayers.path && new PathLayer({
      id: 'path-layer',
      data: ROUTE_PATH,
      pickable: true,
      widthScale: 20,
      widthMinPixels: 3,
      getPath: d => d.path,
      getColor: [255, 100, 100, 200],
      getWidth: 5,
      onHover: info => setHoverInfo(info.object ? { ...info, layerType: 'Path' } : null)
    }),

    // 3. ArcLayer - Shows connections between cities
    visibleLayers.arc && new ArcLayer({
      id: 'arc-layer',
      data: CONNECTIONS,
      pickable: true,
      getSourcePosition: d => d.from.coordinates,
      getTargetPosition: d => d.to.coordinates,
      getSourceColor: [0, 200, 100, 200],
      getTargetColor: [200, 100, 0, 200],
      getWidth: d => Math.sqrt(d.volume) / 10,
      onHover: info => setHoverInfo(info.object ? { ...info, layerType: 'Arc' } : null)
    }),

    // 4. ScatterplotLayer - Shows city points
    visibleLayers.scatterplot && new ScatterplotLayer({
      id: 'scatterplot-layer',
      data: CITIES,
      pickable: true,
      opacity: 0.9,
      stroked: true,
      filled: true,
      radiusMinPixels: 8,
      radiusMaxPixels: 50,
      lineWidthMinPixels: 2,
      getPosition: d => d.coordinates,
      getRadius: d => Math.sqrt(d.population) * 5,
      getFillColor: [255, 200, 0, 200],
      getLineColor: [50, 50, 50, 255],
      onHover: info => setHoverInfo(info.object ? { ...info, layerType: 'Scatterplot' } : null)
    }),

    // 5. TextLayer - Shows city labels
    visibleLayers.text && new TextLayer({
      id: 'text-layer',
      data: CITIES,
      pickable: true,
      getPosition: d => d.coordinates,
      getText: d => d.name,
      getSize: 14,
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      getPixelOffset: [0, -20],
      getColor: [30, 30, 30, 255],
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      onHover: info => setHoverInfo(info.object ? { ...info, layerType: 'Text' } : null)
    })
  ].filter(Boolean);

  const renderTooltip = () => {
    if (!hoverInfo) return null;

    let content;
    switch (hoverInfo.layerType) {
      case 'Scatterplot':
      case 'Text':
        content = (
          <>
            <strong>{hoverInfo.object.name}</strong><br />
            Population: {hoverInfo.object.population.toLocaleString()}
          </>
        );
        break;
      case 'Arc':
        content = (
          <>
            <strong>{hoverInfo.object.from.name} → {hoverInfo.object.to.name}</strong><br />
            Volume: {hoverInfo.object.volume.toLocaleString()}
          </>
        );
        break;
      case 'Path':
        content = <strong>{hoverInfo.object.name}</strong>;
        break;
      case 'GeoJSON':
        content = <strong>{hoverInfo.object.properties.name}</strong>;
        break;
      default:
        content = <strong>Unknown layer</strong>;
    }

    return (
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
        transform: 'translate(10px, 10px)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>
          {hoverInfo.layerType} Layer
        </div>
        {content}
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
      >
        <Map mapStyle={MAP_STYLE} />
      </DeckGL>

      {renderTooltip()}

      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '16px',
        borderRadius: '8px',
        maxWidth: '280px',
        fontSize: '13px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
      }}>
        <h2 style={{ marginBottom: '12px', fontSize: '16px', color: '#333' }}>
          02 - Layer Types
        </h2>

        <p style={{ marginBottom: '12px', color: '#666', fontSize: '12px' }}>
          Toggle layers to understand how they work together:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { key: 'geojson', label: 'GeoJsonLayer', color: '#6496c8', desc: 'Polygons & regions' },
            { key: 'scatterplot', label: 'ScatterplotLayer', color: '#ffc800', desc: 'City points' },
            { key: 'arc', label: 'ArcLayer', color: '#00c864', desc: 'Connections' },
            { key: 'path', label: 'PathLayer', color: '#ff6464', desc: 'Routes' },
            { key: 'text', label: 'TextLayer', color: '#333', desc: 'Labels' },
          ].map(layer => (
            <label key={layer.key} style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '4px',
              background: visibleLayers[layer.key] ? '#f0f7ff' : '#f5f5f5',
              border: `1px solid ${visibleLayers[layer.key] ? layer.color : '#ddd'}`
            }}>
              <input
                type="checkbox"
                checked={visibleLayers[layer.key]}
                onChange={() => toggleLayer(layer.key)}
                style={{ marginRight: '8px' }}
              />
              <span style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                background: layer.color,
                marginRight: '8px'
              }} />
              <span style={{ flex: 1 }}>
                <strong style={{ fontSize: '12px' }}>{layer.label}</strong>
                <span style={{ color: '#888', fontSize: '11px', marginLeft: '6px' }}>
                  {layer.desc}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #eee',
          color: '#666',
          fontSize: '12px'
        }}>
          <strong>Exercise:</strong> Add an IconLayer for airports or a PolygonLayer for states!
        </div>
      </div>
    </div>
  );
}

export default App;
