'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css';

const NAV = [
  { href: '/admin',           label: 'Dashboard',   icon: '▣' },
  { href: '/admin/products',  label: 'Products',    icon: '◈' },
  { href: '/admin/orders',    label: 'Orders',      icon: '◎' },
  { href: '/admin/users',     label: 'Users',       icon: '◉' },
  { href: '/admin/referrals', label: 'Referrals',   icon: '◆' },
  { href: '/admin/settings',  label: 'Settings',    icon: '◐' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <Link href="/" className={styles.logo}>GERKINK</Link>
        <span className={styles.adminLabel}>Admin</span>
      </div>

      <nav className={styles.nav}>
        {NAV.map(({ href, label, icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.link} ${active ? styles.active : ''}`}
            >
              <span className={styles.icon}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <Link href="/" className={styles.backLink}>← Back to site</Link>
      </div>
    </aside>
  );
}
