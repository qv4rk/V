#!/usr/bin/env python3
"""
Scaffolds the Necronomy Atlas project structure.
Run: python scaffold_necronomy_atlas.py
"""

import os
import json
from pathlib import Path

PROJECT_NAME = "necronomy-atlas"

# Directory structure
DIRS = [
    "public/textures",
    "src/components/Globe",
    "src/components/Antikythera",
    "src/components/Starfield",
    "src/components/UI",
    "src/components/Editor",
    "src/data",
    "src/articles",
    "src/utils",
    "src/styles",
]

# Files to create
FILES = {
    # Root config
    "package.json": {
        "name": "necronomy-atlas",
        "version": "0.1.0",
        "type": "module",
        "scripts": {
            "dev": "vite",
            "build": "vite build",
            "preview": "vite preview"
        },
        "dependencies": {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "react-globe.gl": "^2.27.0",
            "three": "^0.160.0",
            "react-markdown": "^9.0.0",
            "remark-gfm": "^4.0.0",
            "framer-motion": "^11.0.0",
            "date-fns": "^3.0.0",
            "zustand": "^4.5.0"
        },
        "devDependencies": {
            "vite": "^5.0.0",
            "@vitejs/plugin-react": "^4.2.0"
        }
    },
    
    "vite.config.js": """import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
});
""",
    
    "public/index.html": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Necronomy Atlas</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/index.jsx"></script>
</body>
</html>
""",
    
    "src/index.jsx": """import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globe.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
""",
    
    "src/App.jsx": """import React, { useState } from 'react';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', color: '#fff' }}>
      <h1 style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
        Necronomy Atlas
      </h1>
      <p style={{ position: 'absolute', top: '60px', left: '20px', zIndex: 10 }}>
        Building components...
      </p>
    </div>
  );
}

export default App;
""",
    
    # Data files
    "src/data/necronomy-events.json": {
        "events": [],
        "eras": [
            {"name": "Ancient", "start": -500, "end": 500, "color": "#8B4513"},
            {"name": "Medieval", "start": 500, "end": 1500, "color": "#4B0082"},
            {"name": "Imperial", "start": 1500, "end": 1945, "color": "#DC143C"},
            {"name": "Modern", "start": 1945, "end": 2026, "color": "#00CED1"}
        ]
    },
    
    "src/data/event-schema.json": {
        "id": "example-event",
        "title": "Event Title",
        "date": {"year": 2024, "month": 1, "day": 1},
        "location": {"lat": 0, "lon": 0, "name": "Location Name"},
        "type": "military|financial|legal|demographic|cultural",
        "era": "ancient|medieval|imperial|modern",
        "nodeColor": "#ff4444",
        "nodeSize": 0.5,
        "tags": [],
        "connections": [],
        "articlePath": "/articles/event-name.md",
        "excerpt": "Brief description"
    },
    
    # Component placeholders
    "src/components/Globe/NecronomyGlobe.jsx": "// Globe component - will build this\n",
    "src/components/Globe/ArticleNode.jsx": "// Node component\n",
    "src/components/Globe/ConnectionArcs.jsx": "// Arc connections\n",
    "src/components/Antikythera/AntikytheraWidget.jsx": "// Antikythera widget\n",
    "src/components/Antikythera/TimeControls.jsx": "// Time controls\n",
    "src/components/Starfield/StarfieldBackground.jsx": "// Starfield background\n",
    "src/components/UI/ArticleDropdown.jsx": "// Article menu\n",
    "src/components/UI/ArticlePanel.jsx": "// Glassmorphism article panel\n",
    "src/utils/dateConverter.js": "// Date conversion utilities\n",
    "src/utils/coordinateUtils.js": "// Coordinate calculations\n",
    
    # Styles
    "src/styles/globe.css": """* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #000;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

#root {
  width: 100vw;
  height: 100vh;
}

/* Glassmorphism base */
.glass-panel {
  background: rgba(15, 15, 20, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
""",
    
    "src/styles/antikythera.css": """/* Antikythera mechanism styling */
.antikythera-widget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 200px;
  height: 200px;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 100;
}

.antikythera-widget:hover {
  transform: scale(1.05);
}

.antikythera-full {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
""",
    
    "src/styles/ui.css": """/* UI component styles */
.article-dropdown {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 200;
}

.article-panel {
  position: fixed;
  right: 0;
  top: 0;
  width: 500px;
  height: 100vh;
  padding: 40px;
  overflow-y: auto;
  transform: translateX(100%);
  transition: transform 0.4s ease;
}

.article-panel.open {
  transform: translateX(0);
}
""",
    
    "README.md": """# Necronomy Atlas

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
""",
    
    ".gitignore": """node_modules/
dist/
.DS_Store
*.log
.vite/
""",

    "LICENSE": """MIT License

Copyright (c) 2025 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""
}

def create_project():
    """Creates the project directory structure."""
    base = Path(PROJECT_NAME)
    base.mkdir(exist_ok=True)
    
    print(f"\nCreating {PROJECT_NAME}/\n")
    
    # Create directories
    for dir_path in DIRS:
        (base / dir_path).mkdir(parents=True, exist_ok=True)
        print(f"✓ {dir_path}/")
    
    # Create files
    for file_path, content in FILES.items():
        full_path = base / file_path
        
        if isinstance(content, dict):
            # JSON files
            with open(full_path, 'w') as f:
                json.dump(content, f, indent=2)
        else:
            # Text files
            with open(full_path, 'w') as f:
                f.write(content)
        
        print(f"✓ {file_path}")
    
    print(f"\n✓ Project scaffolded successfully\n")
    print("Next steps:")
    print(f"  cd {PROJECT_NAME}")
    print("  npm install")
    print("  npm run dev")
    print("\nThe dev server will start at http://localhost:5173")

if __name__ == "__main__":
    create_project()
