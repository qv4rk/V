import React, { useState, useCallback } from 'react';

/**
 * Boolean search bar for the Necronomy Atlas.
 * Splits query on whitespace; all terms must match (AND logic).
 * Matches against: title, tags, excerpt, content, id.
 *
 * Props:
 *   events        - full events array
 *   onFilter(ids) - called with Set of matching event ids (null = show all)
 */
export default function SearchBar({ events, onFilter }) {
  const [query, setQuery] = useState('');

  const handleChange = useCallback((e) => {
    const raw = e.target.value;
    setQuery(raw);

    const terms = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) {
      onFilter(null);
      return;
    }

    const matchIds = new Set();
    events.forEach(ev => {
      const blob = [
        ev.title || '',
        ev.excerpt || '',
        ev.content || '',
        ev.id || '',
        (ev.tags || []).join(' '),
        (ev.location && ev.location.name) || '',
        ev.type || '',
      ].join(' ').toLowerCase();

      if (terms.every(t => blob.includes(t))) matchIds.add(ev.id);
    });
    onFilter(matchIds);
  }, [events, onFilter]);

  const clear = useCallback(() => {
    setQuery('');
    onFilter(null);
  }, [onFilter]);

  const hasQuery = query.trim().length > 0;

  return (
    <div style={{
      position: 'absolute',
      top: '90px',
      left: '30px',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(10, 10, 20, 0.82)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '8px',
      padding: '8px 12px',
      minWidth: '260px',
      maxWidth: '340px',
    }}>
      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', userSelect: 'none' }}>
        ⌕
      </span>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search tags, topics… (AND logic)"
        autoComplete="off"
        spellCheck={false}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'rgba(255,255,255,0.85)',
          fontSize: '13px',
          fontFamily: 'monospace',
          letterSpacing: '0.5px',
        }}
      />
      {hasQuery && (
        <button
          onClick={clear}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '0 2px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
