import styles from './MetricsCards.module.css';

interface Metric {
  label: string;
  value: string | number;
  change?: string;
  accent?: 'coral' | 'mist' | 'default';
}

interface MetricsCardsProps {
  metrics: Metric[];
}

export default function MetricsCards({ metrics }: MetricsCardsProps) {
  return (
    <div className={styles.grid}>
      {metrics.map((m) => (
        <div key={m.label} className={`${styles.card} ${m.accent ? styles[m.accent] : ''}`}>
          <span className={styles.label}>{m.label}</span>
          <span className={styles.value}>{m.value}</span>
          {m.change && <span className={styles.change}>{m.change}</span>}
        </div>
      ))}
    </div>
  );
}
