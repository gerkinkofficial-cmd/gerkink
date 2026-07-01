'use client';

import { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  as: 'link';
  href: string;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

function classNames(variant: Variant, size: Size, fullWidth: boolean): string {
  const base = 'btn';
  const v = variant === 'primary' ? 'btn-primary' : variant === 'secondary' ? 'btn-secondary' : 'btn-ghost';
  const s = size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : '';
  const w = fullWidth ? 'btn-full' : '';
  return [base, v, s, w].filter(Boolean).join(' ');
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${classNames(variant, size, fullWidth)} ${className}`}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            style={{ animation: 'spin 0.7s linear infinite' }}
            aria-hidden
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          {children}
        </span>
      ) : children}
    </button>
  );
}

export function LinkButton({
  as: _as,
  href,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  ...rest
}: LinkButtonProps) {
  return (
    <Link href={href} {...rest} className={`${classNames(variant, size, fullWidth)} ${className}`}>
      {children}
    </Link>
  );
}
