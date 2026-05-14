import React from 'react';

export default function TableOfContents({ recipes, onSelect }) {
  return (
    <div className="toc-wrapper">
      <div className="toc-header">
        <h2>Index of Provisions</h2>
        <p>Imperial Edition · Kiev, circa 1920</p>
      </div>

      {/* Restored Intro Lore */}
      <div style={{ padding: '1.5rem 2rem', textAlign: 'center', borderBottom: '1px dotted var(--parchment-deep)' }}>
        <p style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--ink-light)', lineHeight: '1.6', marginBottom: '1rem' }}>
          These recipes belong to the era before the great scarcity — the Pale
          of Settlement in the last years of its lush, fat-heavy, fermented
          abundance. Here you will find the specific Kievian elegance that
          existed before Soviet standardisation erased it.
        </p>
        <p style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--ink-light)', lineHeight: '1.6' }}>
          Each dish is presented twice: as it was made by those who kept the
          cellars stocked with kvass and the iron pans dark with schmaltz; and
          as it might be made today, with the same spirit and different hands.
        </p>
      </div>
      
      <ul className="toc-list">
        {recipes.map((recipe, index) => (
          <li key={recipe.id} className="toc-item" onClick={() => onSelect(recipe.id)}>
            <span className="toc-item-num">{(index + 1).toString().padStart(2, '0')}.</span>
            <span className="toc-recipe-name">{recipe.name}</span>
            <span className="toc-dots"></span>
            <span className="toc-recipe-yiddish">{recipe.yiddish}</span>
          </li>
        ))}
      </ul>
      
      <div style={{ padding: '1rem', textAlign: 'center', fontFamily: 'var(--font-fell-sc)', fontSize: '0.75rem', color: 'var(--burgundy)' }}>
        Select a recipe to open its pages.
      </div>
    </div>
  );
}
