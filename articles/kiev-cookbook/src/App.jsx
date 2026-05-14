import { useState, useCallback } from 'react';
import Book from './components/Book';
import TableOfContents from './components/TableOfContents';
import RecipeSpread from './components/RecipeSpread';
import VersionNav from './components/VersionNav';
import { recipes } from './data/recipes';
import styles from './App.module.css';

export default function App() {
  // -1 = Table of Contents / cover spread
  const [currentPage, setCurrentPage] = useState(-1);
  const [version, setVersion] = useState('original');
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState(1);

  const goTo = useCallback((idx, dir = 1) => {
    setFlipDir(dir);
    setFlipping(true);
    setTimeout(() => {
      setCurrentPage(idx);
      setFlipping(false);
    }, 300);
  }, []);

  const openContents = useCallback(() => {
    goTo(-1, -1);
  }, [goTo]);

  const nextRecipe = useCallback(() => {
    if (currentPage < recipes.length - 1) {
      goTo(currentPage + 1, 1);
    }
  }, [currentPage, goTo]);

  const prevRecipe = useCallback(() => {
    if (currentPage > 0) {
      goTo(currentPage - 1, -1);
    } else {
      goTo(-1, -1);
    }
  }, [currentPage, goTo]);

  return (
    <div className={styles.app}>
      <VersionNav
        version={version}
        onVersionChange={setVersion}
        onOpenContents={openContents}
      />

      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.siteTitle}>The Kiev Heirloom</h1>
          <span className={styles.siteSub}>Imperial Edition · 1920</span>
        </header>

        <Book flipping={flipping} flipDir={flipDir}>
          {currentPage === -1 ? (
            <TableOfContents
              recipes={recipes}
              onSelect={(idx) => goTo(idx, 1)}
            />
          ) : (
            <RecipeSpread
              recipe={recipes[currentPage]}
              version={version}
              onNext={nextRecipe}
              onPrev={prevRecipe}
              currentIdx={currentPage}
              total={recipes.length}
            />
          )}
        </Book>

        <footer className={styles.footer}>
          <span>
            Recipes of the Pale of Settlement &mdash; Pre-Revolutionary Kiev
          </span>
        </footer>
      </main>
    </div>
  );
}
