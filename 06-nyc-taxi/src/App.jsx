import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { AmbientLight, PointLight, LightingEffect } from '@deck.gl/core';
import DeckGL from '@deck.gl/react';
import { PolygonLayer } from '@deck.gl/layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import 'maplibre-gl/dist/maplibre-gl.css';

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
  minWidth: '200px'
};

const buttonStyle = {
  padding: '8px 16px',
  margin: '4px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold'
};

const sliderStyle = {
  width: '100%',
  marginTop: '8px'
};

// Data URLs from deck.gl examples
const DATA_URL = {
  BUILDINGS: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/trips/buildings.json',
  TRIPS: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/trips/trips-v7.json'
};

// Lighting setup
const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const pointLight = new PointLight({
  color: [255, 255, 255],
  intensity: 2.0,
  position: [-74.05, 40.7, 8000]
});

const lightingEffect = new LightingEffect({ ambientLight, pointLight });

// Theme configuration
const theme = {
  buildingColor: [74, 80, 87],
  trailColor0: [253, 128, 93],
  trailColor1: [23, 184, 190],
  material: {
    ambient: 0.1,
    diffuse: 0.6,
    shininess: 32,
    specularColor: [60, 64, 70]
  }
};

// Initial view state
const INITIAL_VIEW_STATE = {
  longitude: -74,
  latitude: 40.72,
  zoom: 13,
  pitch: 45,
  bearing: 0
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

// Ground cover for shadow effects
const landCover = [
  [
    [-74.0, 40.7],
    [-74.02, 40.7],
    [-74.02, 40.72],
    [-74.0, 40.72]
  ]
];

// Calculate bearing between two points
function getBearing(start, end) {
  const startLng = start[0] * Math.PI / 180;
  const startLat = start[1] * Math.PI / 180;
  const endLng = end[0] * Math.PI / 180;
  const endLat = end[1] * Math.PI / 180;

  const dLng = endLng - startLng;
  const x = Math.sin(dLng) * Math.cos(endLat);
  const y = Math.cos(startLat) * Math.sin(endLat) -
            Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
}

// Get taxi position along a trip path based on current time
function getTaxiPosition(trip, currentTime) {
  if (!trip || !trip.timestamps || !trip.path) return null;

  const { timestamps, path } = trip;

  // Find the segment we're currently in
  for (let i = 0; i < timestamps.length - 1; i++) {
    if (currentTime >= timestamps[i] && currentTime <= timestamps[i + 1]) {
      const t = (currentTime - timestamps[i]) / (timestamps[i + 1] - timestamps[i]);
      const start = path[i];
      const end = path[i + 1];

      const lng = start[0] + (end[0] - start[0]) * t;
      const lat = start[1] + (end[1] - start[1]) * t;
      const bearing = getBearing(start, end);

      return { position: [lng, lat], bearing };
    }
  }

  return null;
}

export default function App() {
  const [time, setTime] = useState(0);
  const [trip, setTrip] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [timeRange, setTimeRange] = useState({ start: 0, end: 1800 });
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [followCamera, setFollowCamera] = useState(true);
  const animationRef = useRef(null);

  const trailLength = 180;

  // Load data
  useEffect(() => {
    fetch(DATA_URL.TRIPS)
      .then(res => res.json())
      .then(data => {
        // Pick a trip that's in the Manhattan area (around -74.0, 40.72)
        const manhattanTrip = data.find(t =>
          t.path[0][0] > -74.02 && t.path[0][0] < -73.97 &&
          t.path[0][1] > 40.70 && t.path[0][1] < 40.75
        ) || data[0];

        setTrip(manhattanTrip);

        // Set time range based on trip timestamps
        const timestamps = manhattanTrip.timestamps;
        setTimeRange({
          start: timestamps[0],
          end: timestamps[timestamps.length - 1]
        });
        setTime(timestamps[0]);
      });

    fetch(DATA_URL.BUILDINGS)
      .then(res => res.json())
      .then(data => setBuildings(data));
  }, []);

  // Animation loop using requestAnimationFrame
  useEffect(() => {
    if (!trip || !isPlaying) return;

    let lastFrameTime = performance.now();

    const animate = (currentFrameTime) => {
      const deltaTime = (currentFrameTime - lastFrameTime) / 1000; // Convert to seconds
      lastFrameTime = currentFrameTime;

      setTime(prevTime => {
        // Speed factor: how many "time units" per second
        const timeIncrement = deltaTime * 50 * speed;
        let newTime = prevTime + timeIncrement;

        // Loop back to start if we've reached the end
        if (newTime > timeRange.end) {
          newTime = timeRange.start;
        }

        return newTime;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [trip, timeRange, isPlaying, speed]);

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleRestart = () => setTime(timeRange.start);

  // Get taxi position along the trip
  const taxiPosition = useMemo(() => {
    return getTaxiPosition(trip, time);
  }, [trip, time]);

  const taxiData = taxiPosition ? [taxiPosition] : [];

  // Calculate view state - follow taxi if enabled
  const viewState = useMemo(() => {
    if (followCamera && taxiPosition) {
      return {
        longitude: taxiPosition.position[0],
        latitude: taxiPosition.position[1],
        zoom: 17,
        pitch: 60,
        bearing: -taxiPosition.bearing,
        transitionDuration: 0
      };
    }
    return INITIAL_VIEW_STATE;
  }, [followCamera, taxiPosition]);

  // Get just the followed trip for the trail
  const tripData = trip ? [trip] : [];

  const layers = [
    // Ground layer for shadows
    new PolygonLayer({
      id: 'ground',
      data: landCover,
      getPolygon: f => f,
      stroked: false,
      getFillColor: [0, 0, 0, 0]
    }),

    // Single animated trip trail
    new TripsLayer({
      id: 'trips',
      data: tripData,
      getPath: d => d.path,
      getTimestamps: d => d.timestamps,
      getColor: [253, 128, 93],
      opacity: 0.8,
      widthMinPixels: 4,
      rounded: true,
      trailLength,
      currentTime: time,
      shadowEnabled: false
    }),

    // 3D Buildings
    new PolygonLayer({
      id: 'buildings',
      data: buildings,
      extruded: true,
      wireframe: false,
      opacity: 0.5,
      getPolygon: f => f.polygon,
      getElevation: f => f.height,
      getFillColor: theme.buildingColor,
      material: theme.material
    }),

    // Taxi model following the trip
    new ScenegraphLayer({
      id: 'taxi',
      data: taxiData,
      scenegraph: '/taxi/scene.gltf',
      getPosition: d => d.position,
      getOrientation: d => [0, 180 - d.bearing, 90],
      sizeScale: 3,
      _lighting: 'pbr'
    })
  ];

  // Calculate progress percentage
  const progress = timeRange.end > timeRange.start
    ? ((time - timeRange.start) / (timeRange.end - timeRange.start)) * 100
    : 0;

  return (
    <>
      <DeckGL
        layers={layers}
        effects={[lightingEffect]}
        viewState={viewState}
        controller={!followCamera}
      >
        <Map reuseMaps mapStyle={MAP_STYLE} />
      </DeckGL>

      {/* Control Panel */}
      <div style={controlStyle}>
        <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '16px' }}>
          NYC Taxi Animation
        </div>

        {/* Play/Pause and Restart buttons */}
        <div style={{ marginBottom: '12px' }}>
          <button
            style={{
              ...buttonStyle,
              background: isPlaying ? '#e74c3c' : '#2ecc71',
              color: 'white'
            }}
            onClick={handlePlayPause}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            style={{
              ...buttonStyle,
              background: '#3498db',
              color: 'white'
            }}
            onClick={handleRestart}
          >
            ↺ Restart
          </button>
        </div>

        {/* Speed control */}
        <div style={{ marginBottom: '8px' }}>
          <label>Speed: {speed.toFixed(1)}x</label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>

        {/* Follow camera toggle */}
        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={followCamera}
              onChange={(e) => setFollowCamera(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Follow Taxi
          </label>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: '12px' }}>
          <label>Progress: {progress.toFixed(0)}%</label>
          <div style={{
            width: '100%',
            height: '8px',
            background: '#333',
            borderRadius: '4px',
            marginTop: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: '#fd805d',
              transition: 'width 0.1s'
            }} />
          </div>
        </div>
      </div>
    </>
  );
}
