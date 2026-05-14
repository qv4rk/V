import styles from './TableOfContents.module.css';

export default function TableOfContents({ recipes, onSelect }) {
  return (
    <>
      {/* Left page — cover art / introduction */}
      <div className={styles.leftPage}>
        <div className={styles.texture} />
        <div className={styles.coverContent}>
          <div className={styles.ornamentTop}>✦ ✦ ✦</div>
          <h1 className={styles.mainTitle}>The Kiev Heirloom</h1>
          <div className={styles.subtitle}>Imperial Edition</div>
          <div className={styles.divider} />
          <p className={styles.intro}>
            These recipes belong to the era before the great scarcity — the Pale
            of Settlement in the last years of its lush, fat-heavy, fermented
            abundance. Here you will find the specific Kievian elegance that
            existed before Soviet standardisation erased it.
          </p>
          <div className={styles.divider} />
          <p className={styles.intro}>
            Each dish is presented twice: as it was made by those who kept the
            cellars stocked with kvass and the iron pans dark with schmaltz; and
            as it might be made today, with the same spirit and different hands.
          </p>
          <div className={styles.ornamentBottom}>
            <span>✦</span>
          </div>
          <div className={styles.year}>Kiev · circa 1920</div>
        </div>
      </div>

      {/* Right page — table of contents */}
      <div className={styles.rightPage}>
        <div className={styles.texture} />
        <h2 className={styles.tocTitle}>Contents of this Volume</h2>
        <div className={styles.tocDivider} />
        <ol className={styles.tocList}>
          {recipes.map((recipe, idx) => (
            <li key={recipe.id} className={styles.tocItem}>
              <button
                className={styles.tocButton}
                onClick={() => onSelect(idx)}
              >
                <span className={styles.tocNumber}>{String(idx + 1).padStart(2, '0')}.</span>
                <span className={styles.tocNames}>
                  <span className={styles.tocYiddish}>{recipe.yiddish}</span>
                  <span className={styles.tocEnglish}>{recipe.name}</span>
                </span>
                <span className={styles.tocDots} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
        <div className={styles.tocFootnote}>
          Select a recipe to open its pages.
          <br />
          Use the ribbons on the left to choose your method.
        </div>
      </div>
    </>
  );
}
