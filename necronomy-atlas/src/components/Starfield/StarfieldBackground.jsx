import React, { useEffect, useRef } from 'react';

const StarfieldBackground = ({ currentDate }) => {
  const containerRef = useRef(null);
  const celestialRef = useRef(null);

  useEffect(() => {
    // Load d3-celestial if not already loaded
    if (!window.Celestial) {
      console.warn('d3-celestial not loaded yet');
      return;
    }

    if (!celestialRef.current && containerRef.current) {
      // Initialize celestial map
      const config = {
        width: window.innerWidth,
        projection: "equirectangular", // Flat projection works well behind globe
        interactive: false, // Don't allow user interaction (globe handles that)
        form: false, // Hide the form controls
        location: false, // Hide location controls
        stars: {
          show: true,
          limit: 6, // Magnitude limit (lower = more stars)
          colors: true,
          size: 5,
          designation: false, // Don't show star names
        },
        constellations: {
          show: true,
          names: false, // Hide constellation names initially
          lines: true,
          bounds: false,
        },
        mw: {
          show: true, // Show Milky Way
          style: { fill: "rgba(255,255,255,0.05)", opacity: 0.3 }
        },
        lines: {
          graticule: { show: false }, // Hide grid lines
          equatorial: { show: false },
          ecliptic: { show: false },
          galactic: { show: false },
          supergalactic: { show: false }
        },
        background: { fill: "transparent" }, // Transparent so Earth shows through
        horizon: { show: false },
        datapath: "/d3-celestial/data/", // Path to constellation data
      };

      // Initialize Celestial
      window.Celestial.display(config);
      celestialRef.current = true;
    }
  }, []);

  // Update celestial map when date changes
  useEffect(() => {
    if (window.Celestial && currentDate) {
      // Convert event date to JavaScript Date object
      const date = new Date(
        currentDate.year,
        currentDate.month - 1 || 0,
        currentDate.day || 1
      );
      
      // Update celestial map to show sky at that date
      window.Celestial.date(date);
    }
  }, [currentDate]);

  return (
    <div
      ref={containerRef}
      id="celestial-map"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1, // Behind everything
        opacity: 0.4, // Subtle background
        pointerEvents: 'none', // Don't interfere with globe interactions
      }}
    />
  );
};

export default StarfieldBackground;
