'use client';

import { useEffect, useState } from 'react';
import styles from './LoadingScreen.module.css';

const LOAD_ROASTS = [
  'Evaluating your taste...',
  'Calculating your mediocrity...',
  'Loading things you can\'t afford...',
  'Preparing your ego check...',
];

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [roast, setRoast] = useState(LOAD_ROASTS[0]);

  useEffect(() => {
    setRoast(LOAD_ROASTS[Math.floor(Math.random() * LOAD_ROASTS.length)]);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <span className={styles.logo}>GERKINK</span>
        <p className={styles.roast}>{roast}</p>
        <div className={styles.bar}>
          <div className={styles.fill} />
        </div>
      </div>
    </div>
  );
}
