'use client';

import { TICKER_ROASTS } from '@/lib/utils/roasts';
import styles from './EgoTicker.module.css';

interface EgoTickerProps {
  messages?: string[];
  speed?: number; // seconds for one full cycle
}

export default function EgoTicker({ messages = TICKER_ROASTS, speed = 40 }: EgoTickerProps) {
  // Duplicate for seamless loop
  const items = [...messages, ...messages];

  return (
    <div className={styles.ticker} aria-hidden="true">
      <div
        className={styles.track}
        style={{ animationDuration: `${speed}s` }}
      >
        {items.map((msg, i) => (
          <span key={i} className={styles.item}>
            {msg}
            <span className={styles.sep}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
