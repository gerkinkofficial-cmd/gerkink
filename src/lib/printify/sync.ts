import 'server-only';
import { adminDb } from '@/lib/firebase/admin';
import { getProducts, getProduct } from './client';
import type { Product, Variant } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

export async function syncProductsFromPrintify(shopId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let synced = 0;

  try {
    const { data: printifyProducts } = await getProducts(shopId);

    for (const pp of printifyProducts) {
      try {
        const full = await getProduct(shopId, pp.id);

        const variants: Variant[] = full.variants
          .filter((v) => v.is_enabled)
          .map((v) => ({
            id: String(v.id),
            size: v.options?.size ?? 'One Size',
            color: v.options?.color ?? 'Default',
            price: v.price / 100, // Printify returns cents
            available: v.is_enabled,
            printifyVariantId: String(v.id),
          }));

        const basePrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : 0;

        const productData: Omit<Product, 'id'> = {
          printifyId: pp.id,
          title: full.title,
          description: full.description,
          section: 'valueless_bitches', // Default; owner assigns section in admin
          price: basePrice,
          images: full.images.map((img) => img.src),
          variants,
          isPublished: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Upsert by Printify ID
        const existing = await adminDb
          .collection('products')
          .where('printifyId', '==', pp.id)
          .limit(1)
          .get();

        if (existing.empty) {
          await adminDb.collection('products').add({
            ...productData,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          await existing.docs[0].ref.update({
            title: productData.title,
            description: productData.description,
            images: productData.images,
            variants: productData.variants,
            price: productData.price,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        synced++;
      } catch (err) {
        errors.push(`Product ${pp.id}: ${String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`Sync failed: ${String(err)}`);
  }

  return { synced, errors };
}
