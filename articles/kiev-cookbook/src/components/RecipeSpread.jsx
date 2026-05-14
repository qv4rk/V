import styles from './RecipeSpread.module.css';

export default function RecipeSpread({ recipe, version, onNext, onPrev, currentIdx, total }) {
  const v = recipe[version];

  return (
    <>
      {/* Left page — recipe header + ingredients */}
      <div className={styles.leftPage}>
        <div className={styles.texture} />

        <div className={styles.recipeHeader}>
          <div className={styles.ornament}>✦</div>
          <h2 className={styles.yiddishTitle}>{recipe.yiddish}</h2>
          <h3 className={styles.recipeName}>{recipe.name}</h3>
          <p className={styles.subtitle}>{recipe.subtitle}</p>
          <div className={styles.headerDivider} />
        </div>

        <div className={styles.versionBadge}>
          <span className={styles.versionLabel}>{v.label}</span>
        </div>

        <h4 className={styles.sectionHead}>Provisions</h4>
        <ul className={styles.ingList}>
          {v.ings.map((ing, i) => (
            <li key={i} className={styles.ingItem}>
              <span className={styles.ingBullet}>◆</span>
              {ing}
            </li>
          ))}
        </ul>

        <div className={styles.checkBlock}>
          <span className={styles.checkLabel}>How You Know It Is Right —</span>
          <p className={styles.checkText}>{v.check}</p>
        </div>

        <div className={styles.pageNav}>
          <button
            className={styles.navBtn}
            onClick={onPrev}
            disabled={currentIdx < 0}
            aria-label="Previous recipe"
          >
            ← {currentIdx === 0 ? 'Contents' : 'Previous'}
          </button>
          <span className={styles.pageCount}>
            {currentIdx + 1} / {total}
          </span>
          <button
            className={styles.navBtn}
            onClick={onNext}
            disabled={currentIdx >= total - 1}
            aria-label="Next recipe"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Right page — method + note */}
      <div className={styles.rightPage}>
        <div className={styles.texture} />

        <h4 className={styles.sectionHead}>The Sacred Labour</h4>
        <p className={styles.methodText}>{v.method}</p>

        <div className={styles.grandmaNote}>
          <span className={styles.noteLabel}>A Word of Warning —</span>
          <p className={styles.noteText}>{v.note}</p>
        </div>

        <div className={styles.decorativeRule} />
        <div className={styles.footnoteArea}>
          <span className={styles.footnoteRecipe}>{recipe.name}</span>
        </div>
      </div>
    </>
  );
}
