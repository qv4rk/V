import React, { useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';

const NecronomyGlobe = ({ events, onEventClick, selectedEvent }) => {
  const globeRef = useRef();
  const [globeReady, setGlobeReady] = useState(false);

  useEffect(() => {
    if (globeRef.current) {
      setGlobeReady(true);
      
      // Auto-rotate when idle
      const controls = globeRef.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enableZoom = true;
    }
  }, []);

  // When an event is selected, zoom to it
  useEffect(() => {
    if (selectedEvent && globeRef.current && globeReady) {
      globeRef.current.pointOfView(
        {
          lat: selectedEvent.location.lat,
          lng: selectedEvent.location.lon,
          altitude: 1.5
        },
        2000 // 2 second transition
      );
    }
  }, [selectedEvent, globeReady]);

  return (
    <Globe
      ref={globeRef}
      
      // Globe texture
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      
      // Background
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      
      // Event nodes as glowing points
      pointsData={events}
      pointLat={d => d.location.lat}
      pointLng={d => d.location.lon}
      pointColor={d => d.nodeColor || '#ff4444'}
      pointAltitude={d => d.nodeSize || 0.01}
      pointRadius={d => d.nodeSize || 0.5}
      pointLabel={d => `
        <div style="
          background: rgba(0,0,0,0.8);
          padding: 8px 12px;
          border-radius: 6px;
          color: white;
          font-family: sans-serif;
          font-size: 14px;
        ">
          <strong>${d.title}</strong><br/>
          ${d.location.name}<br/>
          ${d.date.year}
        </div>
      `}
      
      // Click handler
      onPointClick={(point) => {
        if (onEventClick) {
          onEventClick(point);
        }
      }}
      
      // Atmosphere
      atmosphereColor="rgba(100, 150, 255, 0.5)"
      atmosphereAltitude={0.2}
    />
  );
};

export default NecronomyGlobe;
