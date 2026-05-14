import React, { useState } from 'react';
import { recipes } from './data/recipes';
import TableOfContents from './components/TableOfContents';
import RecipeSpread from './components/RecipeSpread';
import './index.css';

export default function App() {
  const [currentRecipeId, setCurrentRecipeId] = useState(null);

  const currentRecipe = recipes.find(r => r.id === currentRecipeId);

  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="masthead-byline">Strawberry Mansion, Philadelphia</div>
        <h1 className="masthead-title">The Kiev Heirloom</h1>
        <div className="masthead-subtitle">Pre-1930s Ashkenazi Jewish Recipes</div>
      </header>

      {!currentRecipe ? (
        <TableOfContents recipes={recipes} onSelect={setCurrentRecipeId} />
      ) : (
        <>
          <main className="book-scene">
            <div className="book-wrapper">
              <div className="page-stack"></div>
              <div className="open-book">
                <RecipeSpread recipe={currentRecipe} />
              </div>
            </div>
          </main>

          <div className="book-nav">
            <button className="nav-btn" onClick={() => setCurrentRecipeId(null)}>
              Return to Index
            </button>
          </div>
        </>
      )}
      
      <footer className="colophon">
        <div className="colophon-ornament">✦</div>
        <div className="colophon-text">
          Remembered from Page Street.<br />
          The food of the grandmothers, preserved for the new world.
        </div>
      </footer>
    </div>
  );
}
