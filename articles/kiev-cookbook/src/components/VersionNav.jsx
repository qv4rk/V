import styles from './VersionNav.module.css';

export default function VersionNav({ version, onVersionChange, onOpenContents }) {
  return (
    <nav className={styles.nav} aria-label="Version selector">
      <button
        className={`${styles.btn} ${styles.btnContents}`}
        onClick={onOpenContents}
        title="Table of Contents"
        aria-label="Table of Contents"
      >
        Contents
      </button>

      <button
        className={`${styles.btn} ${version === 'original' ? styles.active : ''}`}
        onClick={() => onVersionChange('original')}
        aria-pressed={version === 'original'}
      >
        The Old Way
      </button>

      <button
        className={`${styles.btn} ${version === 'modern' ? styles.active : ''}`}
        onClick={() => onVersionChange('modern')}
        aria-pressed={version === 'modern'}
      >
        The New World
      </button>
    </nav>
  );
}
