# The Kiev Heirloom — Imperial Edition

A digital cookbook celebrating pre-revolutionary Kievian Jewish cuisine, presented as an open book with authentic 1920s aesthetics.

## Recipes Included

1. **Der Royte Borsch** — Imperial Beet Borscht
2. **Gehakte Leber** — Hand-Hacked Liver  
3. **Kashe un Gribenes** — Kasha with Gribenes
4. **Holishkes** — Stuffed Cabbage
5. **Tshulent** — Sabbath Cholent
6. **Gefilte Fisch** — Kiev Gefilte Fish
7. **Tsimes** — Sweet Tzimmes
8. **Lekach** — Honey Cake

Each recipe is presented in two versions:
- **The Old Way** — the authentic pre-1930s method
- **The New World** — a modern interpretation with contemporary technique

## Getting Started

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Building for Production

```bash
npm run build
```

The `dist/` folder is ready to deploy to any static host.

## Deployment Options

### Netlify (recommended — drag & drop)
1. Run `npm run build`
2. Drag the `dist/` folder to [netlify.com/drop](https://netlify.com/drop)

### Vercel
```bash
npm install -g vercel
vercel
```

### GitHub Pages
1. Add `base: '/your-repo-name/'` to `vite.config.js`
2. Run `npm run build`
3. Push the `dist/` folder to your `gh-pages` branch

### Any Static Host (Render, Surge, Cloudflare Pages)
Upload the contents of `dist/` — this is a fully static site with no server requirements.

## Project Structure

```
src/
├── main.jsx              # Entry point
├── App.jsx               # Root component + page state
├── App.module.css
├── index.css             # Global tokens + base styles
├── data/
│   └── recipes.js        # All recipe data — add new recipes here
└── components/
    ├── Book.jsx           # 3D book shell + page flip animation
    ├── Book.module.css
    ├── TableOfContents.jsx  # Opening spread
    ├── TableOfContents.module.css
    ├── RecipeSpread.jsx   # Two-page recipe layout
    ├── RecipeSpread.module.css
    ├── VersionNav.jsx     # Sidebar bookmark tabs
    └── VersionNav.module.css
```

## Adding New Recipes

Open `src/data/recipes.js` and add a new object to the `recipes` array following the existing structure:

```js
{
  id: 'unique-id',
  name: 'English Name',
  yiddish: 'Yiddisher Name',
  subtitle: 'A poetic subtitle',
  original: {
    label: 'The Old Way',
    ings: ['...'],
    method: '...',
    check: '...',
    note: '...',
  },
  modern: {
    label: 'The New World',
    ings: ['...'],
    method: '...',
    check: '...',
    note: '...',
  },
}
```

That's it — the recipe will appear automatically in the Table of Contents.

## Fonts

This project uses Google Fonts (loaded via CDN in `index.html`):
- **UnifrakturMaguntia** — Fraktur display type for headings
- **Old Standard TT** — body text
- **Special Elite** — labels and annotations
