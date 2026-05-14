import React from 'react';

export default function RecipeSpread({ recipe }) {
  // We check if an SVG exists for this recipe id (the 5 you generated)
  const hasImage = ['sweet-blintzes', 'chicken-soup', 'latkes', 'challah', 'beet-borscht'].includes(recipe.id);

  return (
    <>
      {/* LEFT PAGE: THE OLD WAY */}
      <div className="page page-left">
        <div className="page-number">The Old Way</div>
        
        <div className="recipe-chapter">{recipe.subtitle}</div>
        <h2 className="recipe-title">{recipe.name}</h2>
        <div className="recipe-yiddish">{recipe.yiddish}</div>
        
        <div className="recipe-divider"></div>

        {hasImage && (
          <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
            <img 
              src={`/images/${recipe.id}.svg`} 
              alt={recipe.name} 
              style={{ maxWidth: '90%', height: 'auto', border: '1px solid rgba(154, 112, 34, 0.3)', borderRadius: '4px' }} 
            />
          </div>
        )}

        <h3 className="provisions-heading">Provisions</h3>
        <ul className="provisions-list old-way">
          {recipe.original.ings.map((ing, idx) => (
            <li key={idx}>{ing}</li>
          ))}
        </ul>

        <h3 className="steps-heading">Method</h3>
        <div className="wisdom-text" style={{marginBottom: '1rem'}}>{recipe.original.method}</div>

        <div className="wisdom-box">
          <div className="wisdom-heading">The Check</div>
          <div className="wisdom-text">{recipe.original.check}</div>
        </div>
      </div>

      {/* RIGHT PAGE: THE NEW WORLD */}
      <div className="page page-right">
        <div className="page-number">The New World</div>
        
        {/* Invisible header to keep alignment with left page */}
        <div style={{ visibility: 'hidden' }}>
          <div className="recipe-chapter">{recipe.subtitle}</div>
          <h2 className="recipe-title">{recipe.name}</h2>
          <div className="recipe-yiddish">{recipe.yiddish}</div>
          <div className="recipe-divider"></div>
        </div>

        <h3 className="provisions-heading">Modern Provisions</h3>
        <ul className="provisions-list modern-way">
          {recipe.modern.ings.map((ing, idx) => (
            <li key={idx}>{ing}</li>
          ))}
        </ul>

        <h3 className="steps-heading">Modern Method</h3>
        <div className="wisdom-text" style={{marginBottom: '1rem'}}>{recipe.modern.method}</div>

        <div className="wisdom-box modern">
          <div className="wisdom-heading">Modern Note</div>
          <div className="wisdom-text">{recipe.modern.note}</div>
          
          <div className="wisdom-heading" style={{marginTop: '0.75rem'}}>The Check</div>
          <div className="wisdom-text">{recipe.modern.check}</div>
        </div>
      </div>
    </>
  );
}
