import styles from '../support.module.css';

export const metadata = {
  title: 'Terms & Conditions — GERKINK',
  description: 'The rules of the game. Read them or don\'t. You agree by staying here.',
};

export default function TermsPage() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <span className="text-label" style={{ color: 'var(--text-muted)' }}>GERKINK</span>
          <h1 className={styles.heroTitle}>Terms of Service</h1>
          <p className={styles.heroDesc}>
            The fine print you won&apos;t read, but are legally bound by anyway. Welcome to the club.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.article}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Agreement to Terms</h2>
            <p className={styles.bodyText}>
              By accessing or using our website, you agree to be bound by these Terms of Service. If you do not agree, 
              please leave immediately. Your presence here is voluntary, your purchases are binding, and your style 
              complaints will be ignored.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Intellectual Property</h2>
            <p className={styles.bodyText}>
              All content on this site, including designs, illustrations, texts, mockups, logos, and code, is the property 
              of GERKINK. Do not copy, replicate, or repurpose our designs unless you want to hear from our legal counsel. 
              Be original. It&apos;s better for your personality anyway.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Purchases & Payments</h2>
            <p className={styles.bodyText}>
              We accept payments via Razorpay. You guarantee that all payment information provided is accurate and that 
              you are authorized to make the transaction. All prices are displayed in USD (or converted locally) and are 
              subject to change without notice. We reserve the right to refuse or cancel any order at our discretion.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Governing Law</h2>
            <p className={styles.bodyText}>
              These terms are governed by and construed in accordance with the laws governing our brand operations. Any 
              disputes arising from these terms will be settled exclusively in the competent courts of our choice.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Contact</h2>
            <p className={styles.bodyText}>
              For legal inquiries or questions regarding our terms, reach out via the support email listed on our contact page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
