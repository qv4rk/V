import React, { useState, useEffect, useCallback } from 'react';
import NecronomyGlobe from './components/Globe/NecronomyGlobe';
import ArticlePanel from './components/UI/ArticlePanel';
import StarfieldBackground from './components/Starfield/StarfieldBackground';
import SearchBar from './components/UI/SearchBar';
import eventsData from './data/necronomy-events.json';

function App() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [filterIds, setFilterIds] = useState(null); // null = show all

  useEffect(() => {
    // Handle both array format and { events: [...] } format
    const list = Array.isArray(eventsData)
      ? eventsData
      : (eventsData.events || []);
    setEvents(list);
  }, []);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => setIsPanelOpen(false);

  const handleFilter = useCallback((ids) => setFilterIds(ids), []);

  // Apply search filter to displayed events
  const displayedEvents = filterIds
    ? events.filter(ev => filterIds.has(ev.id))
    : events;

  const matchCount = filterIds ? displayedEvents.length : events.length;
  const isFiltered = filterIds !== null;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <StarfieldBackground currentDate={selectedEvent?.date} />

      {/* Title */}
      <div style={{
        position: 'absolute', top: '30px', left: '30px',
        zIndex: 100, pointerEvents: 'none',
      }}>
        <h1 style={{
          fontSize: '28px', fontWeight: '700', color: 'white',
          margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          letterSpacing: '-0.5px',
        }}>
          Necronomy Atlas
        </h1>
        <p style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.5)',
          margin: '6px 0 0 0', textShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}>
          Mapping Systems of Perpetual Crisis
        </p>
      </div>

      {/* Home link */}
      <a href="../index.html" style={{
        position: 'absolute', top: '30px', right: '160px',
        zIndex: 100,
        background: 'rgba(10,10,20,0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '8px 16px',
        color: 'rgba(255,255,255,0.6)',
        textDecoration: 'none',
        fontSize: '13px',
      }}>
        ← Home
      </a>

      {/* Event counter */}
      <div style={{
        position: 'absolute', top: '30px', right: '30px',
        zIndex: 100,
        background: 'rgba(15,15,20,0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '10px 18px',
        color: 'white', fontSize: '13px',
      }}>
        <strong>{matchCount}</strong>
        {isFiltered ? ` / ${events.length}` : ''} events
        {isFiltered && <span style={{ color: 'rgba(0,229,255,0.8)', marginLeft: '6px' }}>filtered</span>}
      </div>

      {/* Search Bar */}
      <SearchBar events={events} onFilter={handleFilter} />

      {/* Globe — receives only the filtered set */}
      <NecronomyGlobe
        events={displayedEvents}
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
