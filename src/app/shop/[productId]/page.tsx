import { notFound } from 'next/navigation';
import { ProductDetailClient } from './ProductDetailClient';
import type { Product } from '@/types';
import styles from './page.module.css';

interface Props {
  params: Promise<{ productId: string }>;
}

import { adminDb } from '@/lib/firebase/admin';

async function getProduct(productId: string): Promise<Product | null> {
  try {
    const docSnap = await adminDb.collection('products').doc(productId).get();
    if (!docSnap.exists) return null;
    
    const data = docSnap.data();
    if (!data?.isPublished) return null;

    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    } as unknown as Product;
  } catch (err) {
    console.error('Error fetching product detail:', err);
    return null;
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { productId } = await params;
  const product = await getProduct(productId);

  if (!product) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <ProductDetailClient product={product} />
    </div>
  );
}
