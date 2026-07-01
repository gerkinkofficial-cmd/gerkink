'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useRoast } from '@/hooks/useRoast';
import { getHoverRoast, getCartRoast } from '@/lib/utils/roasts';
import type { Product } from '@/types';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { toast } = useRoast();
  const [hoverRoast, setHoverRoast] = useState('');
  const [roastVisible, setRoastVisible] = useState(false);

  const defaultVariant = product.variants[0];

  const handleMouseEnter = () => {
    setHoverRoast(getHoverRoast());
    setRoastVisible(true);
  };
  const handleMouseLeave = () => setRoastVisible(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!defaultVariant) return;
    addItem(product, defaultVariant, 1);
    toast(getCartRoast(), 'success');
  };

  const tierLabel: Record<number, string> = {
    1: 'GOD TIER',
    2: 'OBSCENE',
    3: 'DELUSIONAL',
    4: 'WANNABE',
    5: 'PEASANT PREMIUM',
  };

  return (
    <Link href={`/shop/${product.id}`} className={styles.card} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className={styles.imageWrap}>
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
            className={styles.image}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <span>GERKINK</span>
          </div>
        )}

        {/* Hover roast overlay */}
        <div className={`${styles.roastOverlay} ${roastVisible ? styles.visible : ''}`}>
          <p className={styles.roastText}>{hoverRoast}</p>
        </div>

        {/* Tier badge */}
        {product.tier && (
          <span className={`${styles.tierBadge} tag tag-coral`}>
            {tierLabel[product.tier]}
          </span>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.meta}>
          <h3 className={styles.title}>{product.title}</h3>
          <span className={styles.price + ' text-price'}>
            ${product.price.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </span>
        </div>

        <button
          className={`${styles.addBtn} btn btn-primary btn-sm`}
          onClick={handleAddToCart}
          aria-label={`Add ${product.title} to cart`}
        >
          Add to Cart
        </button>
      </div>
    </Link>
  );
}
