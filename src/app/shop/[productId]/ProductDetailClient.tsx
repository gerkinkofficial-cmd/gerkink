'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useRoast } from '@/hooks/useRoast';
import { getCartRoast } from '@/lib/utils/roasts';
import PriceTag from '@/components/ui/PriceTag';
import type { Product, Variant } from '@/types';
import styles from './ProductDetailClient.module.css';

interface ProductDetailClientProps {
  product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { addItem } = useCart();
  const { toast } = useRoast();
  const [selectedVariant, setSelectedVariant] = useState<Variant>(product.variants[0]);
  const [selectedMedia, setSelectedMedia] = useState(0);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!selectedVariant) return;
    addItem(product, selectedVariant, 1);
    toast(getCartRoast(), 'success');
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // Group variants by color for size selection
  const colors = [...new Set(product.variants.map((v) => v.color))];
  const sizes = [...new Set(
    product.variants
      .filter((v) => v.color === selectedVariant?.color)
      .map((v) => v.size)
  )];

  const media = [
    ...product.images.map((url) => ({ type: 'image' as const, url })),
    ...(product.videos || []).map((url) => ({ type: 'video' as const, url })),
  ];

  const currentMedia = media[selectedMedia] || media[0];

  return (
    <div className={styles.layout}>
      {/* Image/Video Gallery */}
      <div className={styles.gallery}>
        <div className={styles.mainImage}>
          {currentMedia ? (
            currentMedia.type === 'video' ? (
              <video
                src={currentMedia.url}
                controls
                loop
                muted
                autoPlay
                playsInline
                className={styles.img}
              />
            ) : (
              <Image
                src={currentMedia.url}
                alt={product.title}
                fill
                sizes="(max-width:768px) 100vw, 50vw"
                className={styles.img}
                priority
              />
            )
          ) : (
            <div className={styles.imgPlaceholder}>GERKINK</div>
          )}
        </div>
        {media.length > 1 && (
          <div className={styles.thumbs}>
            {media.map((item, i) => (
              <button
                key={i}
                className={`${styles.thumb} ${selectedMedia === i ? styles.thumbActive : ''}`}
                onClick={() => setSelectedMedia(i)}
                aria-label={`View media ${i + 1}`}
                style={{ position: 'relative' }}
              >
                {item.type === 'video' ? (
                  <>
                    <video src={item.url} muted className={styles.thumbImg} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.4)',
                      color: '#fff',
                      fontSize: '1rem',
                      pointerEvents: 'none'
                    }}>
                      ▶
                    </div>
                  </>
                ) : (
                  <Image src={item.url} alt="" fill sizes="80px" className={styles.thumbImg} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className={styles.info}>
        <div className={styles.infoTop}>
          <div className={styles.breadcrumb}>
            <Link href="/shop">Shop</Link>
            <span>→</span>
            <Link href={`/shop/${product.section === 'society_fuckers' ? 'society-fuckers' : 'valueless-bitches'}`}>
              {product.section === 'society_fuckers' ? 'Society Fu*kers' : 'Valueless Bi*ches'}
            </Link>
          </div>

          {product.tier && (
            <span className="tag tag-coral">{
              { 1: 'GOD TIER', 2: 'OBSCENE', 3: 'DELUSIONAL', 4: 'WANNABE', 5: 'PEASANT PREMIUM' }[product.tier]
            }</span>
          )}

          <h1 className={styles.title}>{product.title}</h1>

          <PriceTag
            price={selectedVariant?.price ?? product.price}
            tier={product.tier}
            size="xl"
            animate
          />
        </div>

        {/* Variant Selection */}
        {colors.length > 1 && (
          <div className={styles.variantGroup}>
            <label className="input-label">Color — {selectedVariant?.color}</label>
            <div className={styles.colorSwatches}>
              {colors.map((color) => {
                const v = product.variants.find((variant) => variant.color === color);
                if (!v) return null;
                return (
                  <button
                    key={color}
                    className={`${styles.swatch} ${selectedVariant?.color === color ? styles.swatchActive : ''}`}
                    onClick={() => {
                      const matching = product.variants.find(
                        (pv) => pv.color === color && pv.size === selectedVariant?.size
                      ) ?? v;
                      setSelectedVariant(matching);
                    }}
                    style={{ background: v.colorHex ?? 'var(--fog)' }}
                    aria-label={`Color: ${color}`}
                    title={color}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.variantGroup}>
          <label className="input-label">Size — {selectedVariant?.size}</label>
          <div className={styles.sizes}>
            {sizes.map((size) => {
              const v = product.variants.find(
                (pv) => pv.size === size && pv.color === selectedVariant?.color
              );
              return (
                <button
                  key={size}
                  disabled={!v?.available}
                  className={`${styles.sizeBtn} ${selectedVariant?.size === size ? styles.sizeBtnActive : ''}`}
                  onClick={() => v && setSelectedVariant(v)}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        <button
          className={`btn btn-primary btn-lg btn-full ${styles.addBtn}`}
          onClick={handleAdd}
          disabled={!selectedVariant?.available}
        >
          {added
            ? 'Finally making a good decision for once.'
            : selectedVariant?.available
            ? 'Add to Cart'
            : 'Out of Stock — Like Your Personality'}
        </button>

        {/* Description */}
        <div className={styles.desc}>
          <p>{product.description}</p>
        </div>
      </div>
    </div>
  );
}
