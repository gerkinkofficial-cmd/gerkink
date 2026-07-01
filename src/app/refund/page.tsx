import Link from 'next/link';
import styles from '../support.module.css';

export const metadata = {
  title: 'Refund & Replacement Policy — GERKINK',
  description: 'No refunds. Replacements are possible if we made a mistake. Details inside.',
};

export default function RefundPage() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <span className="text-label" style={{ color: 'var(--text-muted)' }}>GERKINK</span>
          <h1 className={styles.heroTitle}>Refund &amp; Replace</h1>
          <p className={styles.heroDesc}>
            Let&apos;s be completely honest: we don&apos;t do buyers remorse. Read our policy carefully.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.article}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>1. No Refunds</h2>
            <p className={styles.bodyText}>
              We enforce a strict <span className={styles.emphasis}>No Refunds</span> policy on all purchases. 
              Once an order is paid and submitted, Printify automatically prints it. We do not refund money 
              because you changed your mind, picked the wrong size, or decided your personal brand isn&apos;t ready 
              for our clothing.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Replacement Policy</h2>
            <p className={styles.bodyText}>
              If your item arrived damaged, defective, or we sent you the wrong design/size by mistake, we will gladly 
              issue a <span className={styles.emphasis}>Free Replacement</span>. 
            </p>
            <p className={styles.bodyText}>
              To initiate a replacement, you must contact us within 14 days of delivery.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>3. How to Request a Replacement</h2>
            <p className={styles.bodyText}>
              Please email us at <span className={styles.emphasis}>support@gerkink.com</span> or submit a message on our{' '}
              <Link href="/contact" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                Contact Page
              </Link>.
            </p>
            <p className={styles.bodyText}>
              In your request, please include:
            </p>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.95rem' }}>
              <li>Your order number (e.g. #2347)</li>
              <li>A description of the issue</li>
              <li>Clear photo evidence of the damage or defect</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
