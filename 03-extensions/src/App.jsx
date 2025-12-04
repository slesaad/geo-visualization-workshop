import { useState, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import { DataFilterExtension, MaskExtension, ClipExtension, BrushingExtension } from '@deck.gl/extensions';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Generate random points with year data
const generatePoints = (count) => {
  const points = [];
  for (let i = 0; i < count; i++) {
    points.push({
      id: i,
      coordinates: [
        -122.5 + Math.random() * 5,  // longitude: roughly California
        34 + Math.random() * 8        // latitude: roughly California
      ],
      year: 2010 + Math.floor(Math.random() * 14),  // 2010-2023
      value: Math.random() * 100,
      category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)]
    });
  }
  return points;
};

const POINTS = generatePoints(500);

// Mask polygon - San Francisco Bay Area (approximate)
const BAY_AREA_MASK = {
  type: 'Feature',
  properties: { name: 'Bay Area' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-122.8, 37.2],
      [-122.8, 38.0],
      [-121.5, 38.0],
      [-121.5, 37.2],
      [-122.8, 37.2]
    ]]
  }
};

// Southern California mask
const SOCAL_MASK = {
  type: 'Feature',
  properties: { name: 'SoCal' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-118.8, 33.5],
      [-118.8, 34.5],
      [-117.0, 34.5],
      [-117.0, 33.5],
      [-118.8, 33.5]
    ]]
  }
};

const INITIAL_VIEW_STATE = {
  longitude: -120,
  latitude: 37,
  zoom: 5.5,
  pitch: 0,
  bearing: 0
};

function App() {
  const [yearRange, setYearRange] = useState([2010, 2023]);
  const [valueRange, setValueRange] = useState([0, 100]);
  const [selectedMask, setSelectedMask] = useState('none');
  const [enableFilter, setEnableFilter] = useState(true);
  const [enableMask, setEnableMask] = useState(false);
  const [enableClip, setEnableClip] = useState(false);
  const [clipBounds, setClipBounds] = useState([-122, 36, -118, 39]);
  const [enableBrushing, setEnableBrushing] = useState(false);
  const [brushRadius, setBrushRadius] = useState(100000); // 100km in meters
  const [mousePosition, setMousePosition] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);

  // Get current mask geometry
  const maskData = useMemo(() => {
    if (selectedMask === 'bayarea') return BAY_AREA_MASK;
    if (selectedMask === 'socal') return SOCAL_MASK;
    return null;
  }, [selectedMask]);

  // Count filtered points for stats
  const filteredCount = useMemo(() => {
    return POINTS.filter(p =>
      p.year >= yearRange[0] && p.year <= yearRange[1] &&
      p.value >= valueRange[0] && p.value <= valueRange[1]
    ).length;
  }, [yearRange, valueRange]);

  // Only apply mask when enabled and a region is selected
  const shouldApplyMask = enableMask && maskData;

  // Build extensions array dynamically
  const getExtensions = () => {
    const exts = [new DataFilterExtension({ filterSize: 2 })];
    if (shouldApplyMask) exts.push(new MaskExtension());
    if (enableClip) exts.push(new ClipExtension());
    if (enableBrushing) exts.push(new BrushingExtension());
    return exts;
  };

  const layers = [
    // Clip bounds visualization (shows the clip rectangle)
    enableClip && new GeoJsonLayer({
      id: 'clip-bounds-outline',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [clipBounds[0], clipBounds[1]],
            [clipBounds[2], clipBounds[1]],
            [clipBounds[2], clipBounds[3]],
            [clipBounds[0], clipBounds[3]],
            [clipBounds[0], clipBounds[1]]
          ]]
        }
      },
      stroked: true,
      filled: false,
      lineWidthMinPixels: 2,
      getLineColor: [255, 100, 0, 200],
    }),

    // Mask outline layer (shows the mask boundary)
    shouldApplyMask && new GeoJsonLayer({
      id: 'mask-outline',
      data: maskData,
      stroked: true,
      filled: false,
      lineWidthMinPixels: 3,
      getLineColor: [100, 100, 255, 200],
    }),

    // Mask layer (defines the mask region)
    shouldApplyMask && new GeoJsonLayer({
      id: 'mask-layer',
      data: maskData,
      stroked: false,
      filled: true,
      getFillColor: [255, 255, 255, 255],
      operation: 'mask',
    }),

    // Main scatterplot layer with extensions
    new ScatterplotLayer({
      id: 'points-layer',
      data: POINTS,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusMinPixels: 4,
      radiusMaxPixels: 15,
      lineWidthMinPixels: 1,
      getPosition: d => d.coordinates,
      getRadius: d => 3 + d.value / 10,
      getFillColor: d => {
        if (d.category === 'A') return [255, 100, 100, 230];
        if (d.category === 'B') return [100, 255, 100, 230];
        return [100, 100, 255, 230];
      },
      getLineColor: [255, 255, 255, 200],

      // DataFilterExtension props
      getFilterValue: d => [d.year, d.value],
      filterRange: enableFilter ? [
        [yearRange[0], yearRange[1]],
        [valueRange[0], valueRange[1]]
      ] : [[2010, 2023], [0, 100]],
      filterSoftRange: enableFilter ? [
        [yearRange[0], yearRange[1]],
        [valueRange[0], valueRange[1]]
      ] : null,

      // ClipExtension props
      clipBounds: enableClip ? clipBounds : null,

      // MaskExtension props
      maskId: shouldApplyMask ? 'mask-layer' : null,

      // BrushingExtension props
      brushingEnabled: enableBrushing,
      brushingTarget: 'source',
      brushingRadius: brushRadius,
      mousePosition: mousePosition,

      // Extensions
      extensions: getExtensions(),

      // Update triggers
      updateTriggers: {
        getFilterValue: [yearRange, valueRange],
        maskId: [shouldApplyMask, selectedMask],
        clipBounds: [enableClip, clipBounds],
        extensions: [shouldApplyMask, enableClip, enableBrushing]
      },

      onHover: info => setHoverInfo(info.object ? info : null)
    })
  ].filter(Boolean);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        onHover={info => {
          if (enableBrushing) {
            setMousePosition(info.coordinate || null);
          }
        }}
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
          Year: {hoverInfo.object.year}<br />
          Value: {hoverInfo.object.value.toFixed(1)}<br />
          Category: {hoverInfo.object.category}
        </div>
      )}

      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '16px',
        borderRadius: '8px',
        width: '320px',
        fontSize: '13px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginBottom: '8px', fontSize: '16px', color: '#333' }}>
          03 - Extensions
        </h2>
        <p style={{ marginBottom: '16px', color: '#666', fontSize: '12px' }}>
          Filter, mask, clip, and brush - deck.gl extensions
        </p>

        {/* Stats */}
        <div style={{
          background: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
            {filteredCount}
          </span>
          <span style={{ color: '#666', marginLeft: '8px' }}>
            / {POINTS.length} points visible
          </span>
        </div>

        {/* DataFilterExtension Controls */}
        <div style={{
          marginBottom: '12px',
          padding: '12px',
          background: '#f0f7ff',
          borderRadius: '6px',
          border: '1px solid #cce0ff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={enableFilter}
              onChange={e => setEnableFilter(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <strong style={{ color: '#0066cc' }}>DataFilterExtension</strong>
          </div>

          <div style={{ marginBottom: '12px', opacity: enableFilter ? 1 : 0.5 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Year Range: {yearRange[0]} - {yearRange[1]}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="range"
                min="2010"
                max="2023"
                value={yearRange[0]}
                onChange={e => setYearRange([parseInt(e.target.value), yearRange[1]])}
                disabled={!enableFilter}
                style={{ flex: 1 }}
              />
              <input
                type="range"
                min="2010"
                max="2023"
                value={yearRange[1]}
                onChange={e => setYearRange([yearRange[0], parseInt(e.target.value)])}
                disabled={!enableFilter}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div style={{ opacity: enableFilter ? 1 : 0.5 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Value Range: {valueRange[0]} - {valueRange[1]}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={valueRange[0]}
                onChange={e => setValueRange([parseInt(e.target.value), valueRange[1]])}
                disabled={!enableFilter}
                style={{ flex: 1 }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={valueRange[1]}
                onChange={e => setValueRange([valueRange[0], parseInt(e.target.value)])}
                disabled={!enableFilter}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>

        {/* MaskExtension Controls */}
        <div style={{
          marginBottom: '12px',
          padding: '12px',
          background: '#f0fff0',
          borderRadius: '6px',
          border: '1px solid #cce0cc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={enableMask}
              onChange={e => setEnableMask(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <strong style={{ color: '#006600' }}>MaskExtension</strong>
          </div>

          <div style={{ opacity: enableMask ? 1 : 0.5 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px' }}>
              Select mask region:
            </label>
            <select
              value={selectedMask}
              onChange={e => setSelectedMask(e.target.value)}
              disabled={!enableMask}
              style={{
                width: '100%',
                padding: '6px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            >
              <option value="none">No mask</option>
              <option value="bayarea">Bay Area</option>
              <option value="socal">Southern California</option>
            </select>
          </div>
        </div>

        {/* ClipExtension Controls */}
        <div style={{
          marginBottom: '12px',
          padding: '12px',
          background: '#fff5f0',
          borderRadius: '6px',
          border: '1px solid #ffcccc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={enableClip}
              onChange={e => setEnableClip(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <strong style={{ color: '#cc3300' }}>ClipExtension</strong>
          </div>

          <div style={{ opacity: enableClip ? 1 : 0.5 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Min Longitude: {clipBounds[0].toFixed(1)}
            </label>
            <input
              type="range"
              min="-125"
              max="-115"
              step="0.5"
              value={clipBounds[0]}
              onChange={e => setClipBounds([parseFloat(e.target.value), clipBounds[1], clipBounds[2], clipBounds[3]])}
              disabled={!enableClip}
              style={{ width: '100%', marginBottom: '8px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Max Longitude: {clipBounds[2].toFixed(1)}
            </label>
            <input
              type="range"
              min="-125"
              max="-115"
              step="0.5"
              value={clipBounds[2]}
              onChange={e => setClipBounds([clipBounds[0], clipBounds[1], parseFloat(e.target.value), clipBounds[3]])}
              disabled={!enableClip}
              style={{ width: '100%', marginBottom: '8px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Min Latitude: {clipBounds[1].toFixed(1)}
            </label>
            <input
              type="range"
              min="32"
              max="42"
              step="0.5"
              value={clipBounds[1]}
              onChange={e => setClipBounds([clipBounds[0], parseFloat(e.target.value), clipBounds[2], clipBounds[3]])}
              disabled={!enableClip}
              style={{ width: '100%', marginBottom: '8px' }}
            />

            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Max Latitude: {clipBounds[3].toFixed(1)}
            </label>
            <input
              type="range"
              min="32"
              max="42"
              step="0.5"
              value={clipBounds[3]}
              onChange={e => setClipBounds([clipBounds[0], clipBounds[1], clipBounds[2], parseFloat(e.target.value)])}
              disabled={!enableClip}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* BrushingExtension Controls */}
        <div style={{
          marginBottom: '12px',
          padding: '12px',
          background: '#f5f0ff',
          borderRadius: '6px',
          border: '1px solid #d0c0e0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={enableBrushing}
              onChange={e => setEnableBrushing(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <strong style={{ color: '#6600cc' }}>BrushingExtension</strong>
          </div>
          <p style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>
            Only shows points within radius of cursor. Move mouse to reveal points.
          </p>
          <div style={{ opacity: enableBrushing ? 1 : 0.5 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Brush Radius: {Math.round(brushRadius / 1000)} km
            </label>
            <input
              type="range"
              min="10000"
              max="300000"
              step="10000"
              value={brushRadius}
              onChange={e => setBrushRadius(parseInt(e.target.value))}
              disabled={!enableBrushing}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Legend */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
            Categories:
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'rgb(255,100,100)', borderRadius: '50%', marginRight: '4px' }}></span>A</span>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'rgb(100,255,100)', borderRadius: '50%', marginRight: '4px' }}></span>B</span>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'rgb(100,100,255)', borderRadius: '50%', marginRight: '4px' }}></span>C</span>
          </div>
        </div>

        <div style={{
          paddingTop: '12px',
          borderTop: '1px solid #eee',
          color: '#666',
          fontSize: '11px'
        }}>
          <strong>Exercise:</strong> Try each extension! Filter by year, mask to Bay Area, clip bounds, or brush to explore.
        </div>
      </div>
    </div>
  );
}

export default App;
