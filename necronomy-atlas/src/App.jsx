import React, { useState, useEffect } from 'react';
import NecronomyGlobe from './components/Globe/NecronomyGlobe';
import ArticlePanel from './components/UI/ArticlePanel';
import StarfieldBackground from './components/Starfield/StarfieldBackground';
import eventsData from './data/necronomy-events.json';

function App() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Load events from JSON
    setEvents(eventsData.events || []);
  }, []);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: '#000',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Constellation background - rotates with event dates */}
      <StarfieldBackground currentDate={selectedEvent?.date} />

      {/* Title overlay */}
      <div style={{
        position: 'absolute',
        top: '30px',
        left: '30px',
        zIndex: 100,
        pointerEvents: 'none'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: 'white',
          margin: 0,
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          letterSpacing: '-0.5px'
        }}>
          Necronomy Atlas
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'rgba(255,255,255,0.6)',
          margin: '8px 0 0 0',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}>
          Mapping Systems of Perpetual Crisis
        </p>
      </div>

      {/* Event counter */}
      <div style={{
        position: 'absolute',
        top: '30px',
        right: '30px',
        zIndex: 100,
        background: 'rgba(15, 15, 20, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '12px 20px',
        color: 'white',
        fontSize: '14px'
      }}>
        <strong>{events.length}</strong> events mapped
      </div>

      {/* Instructions */}
      {events.length === 0 && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'rgba(15, 15, 20, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px 30px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '14px',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <p style={{ margin: 0 }}>
            Add events to <code>src/data/necronomy-events.json</code> to populate the globe.
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            Click on event nodes to read their stories.
          </p>
        </div>
      )}

      {/* The Globe */}
      <NecronomyGlobe
        events={events}
        onEventClick={handleEventClick}
        selectedEvent={selectedEvent}
      />

      {/* Article Panel */}
      <ArticlePanel
        article={selectedEvent}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
      />
    </div>
  );
}

export default App;
