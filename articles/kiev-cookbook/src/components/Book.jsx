import styles from './Book.module.css';

export default function Book({ children, flipping, flipDir }) {
  const animClass = flipping
    ? flipDir > 0
      ? styles.flipForward
      : styles.flipBack
    : '';

  return (
    <div className={styles.bookViewport}>
      <div className={styles.bookWrap}>
        {/* Simulated page thickness underneath */}
        <div className={styles.pageStack} />
        <div className={`${styles.openBook} ${animClass}`}>
          <div className={styles.texture} />
          {/* Central gutter shadow */}
          <div className={styles.gutter} />
          {children}
        </div>
      </div>
    </div>
  );
}
