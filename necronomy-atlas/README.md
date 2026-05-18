# Necronomy Atlas

Interactive timeline mapping systems of perpetual crisis and containment.

## Concept

**Necronomy**: Systems that profit from perpetual conflict, crisis, or containment 
without requiring conspiracy or death. Revenue streams emerge from managing problems 
that never resolve.

## Setup

```bash
npm install
npm run dev
```

## Adding Events

1. Write your article as markdown in `src/articles/`
2. Add entry to `src/data/necronomy-events.json`
3. System auto-generates globe pin and timeline position

## Event Schema

```json
{
  "id": "unique-id",
  "title": "Event Title",
  "date": {"year": 1858, "month": 7, "day": 15},
  "location": {"lat": 41.0082, "lon": 28.9784, "name": "Constantinople"},
  "type": "financial",
  "nodeColor": "#ffd700",
  "tags": ["ottoman", "debt"],
  "connections": ["other-event-id"],
  "articlePath": "/articles/filename.md"
}
```

## Tech Stack

- React + Vite
- react-globe.gl (3D Earth)
- Three.js (graphics)
- Framer Motion (animations)
- React Markdown (article rendering)

## License

Code: MIT
Content: Copyright (c) 2025 [Your Name]
