import styles from './PriceTag.module.css';

interface PriceTagProps {
  price: number;
  tier?: 1 | 2 | 3 | 4 | 5;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
}

const TIER_COLORS: Record<number, string> = {
  1: '#FFD700', // Gold for god tier
  2: '#B4C7D9', // Mist for obscene
  3: '#FF8E8E', // Light coral for delusional
  4: '#FF6B6B', // Coral for wannabe
  5: '#8491A3', // Smoke for peasant premium
};

export default function PriceTag({ price, tier, size = 'md', animate = false }: PriceTagProps) {
  const color = tier ? TIER_COLORS[tier] : 'var(--accent)';
  const formatted = price >= 1_000_000
    ? `$${(price / 1_000_000).toFixed(0)}M`
    : price >= 1_000
    ? `$${(price / 1_000).toFixed(0)}K`
    : `$${price.toFixed(0)}`;

  return (
    <span
      className={`${styles.tag} ${styles[size]} ${animate ? styles.animate : ''}`}
      style={{ color }}
    >
      <span className={styles.symbol}>$</span>
      {price.toLocaleString('en-US')}
    </span>
  );
}
