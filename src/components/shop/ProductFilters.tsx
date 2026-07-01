'use client';

import { useState } from 'react';
import styles from './ProductFilters.module.css';

export type SortKey = 'newest' | 'price_asc' | 'price_desc';

interface ProductFiltersProps {
  categories: string[];
  activeCategory: string;
  activeSort: SortKey;
  onCategory: (cat: string) => void;
  onSort: (sort: SortKey) => void;
  resultCount: number;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest',     label: 'Newest' },
  { value: 'price_asc',  label: 'Price: Low' },
  { value: 'price_desc', label: 'Price: High' },
];

export default function ProductFilters({
  categories,
  activeCategory,
  activeSort,
  onCategory,
  onSort,
  resultCount,
}: ProductFiltersProps) {
  const allCategories = ['All', ...categories];

  return (
    <div className={styles.filters}>
      <div className={styles.categories}>
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategory(cat === 'All' ? '' : cat)}
            className={`${styles.catBtn} ${activeCategory === (cat === 'All' ? '' : cat) ? styles.active : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className={styles.right}>
        <span className={styles.count}>{resultCount} item{resultCount !== 1 ? 's' : ''}</span>
        <div className={styles.sort}>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSort(opt.value)}
              className={`${styles.sortBtn} ${activeSort === opt.value ? styles.active : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
