'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoast } from '@/hooks/useRoast';
import { getFirestoreDb, getFirebaseStorage, getFirestoreModule, getStorageModule } from '@/lib/firebase/config';
import styles from '../../page.module.css';

export default function AddProductPage() {
  const router = useRouter();
  const { toast } = useRoast();

  // Form states
  const [printifyId, setPrintifyId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [section, setSection] = useState<'society_fuckers' | 'valueless_bitches'>('valueless_bitches');
  const [price, setPrice] = useState('');
  const [tier, setTier] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Variants Manager State
  const [hasVariants, setHasVariants] = useState(false);
  const [variantsColors, setVariantsColors] = useState<Array<{ name: string; hex: string }>>([]);
  const [variantsSizes, setVariantsSizes] = useState<string[]>([]);
  const [variantsList, setVariantsList] = useState<Array<{
    id: string;
    size: string;
    color: string;
    colorHex?: string;
    price: number;
    available: boolean;
  }>>([]);

  // Color Input State
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#ffffff');

  // Media states
  const [productId, setProductId] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [filename: string]: number }>({});
  const [uploading, setUploading] = useState(false);

  // Sync variant combinations state on change
  useEffect(() => {
    if (!hasVariants) {
      setVariantsList([]);
      return;
    }

    const activeColors = variantsColors.length > 0 ? variantsColors : [{ name: 'Default', hex: '#ffffff' }];
    const activeSizes = variantsSizes.length > 0 ? variantsSizes : ['One Size'];

    const newList: typeof variantsList = [];
    let idCounter = Date.now();

    activeColors.forEach((c) => {
      activeSizes.forEach((s) => {
        const existing = variantsList.find((v) => v.color === c.name && v.size === s);
        newList.push({
          id: existing?.id || `custom_${idCounter++}`,
          size: s,
          color: c.name,
          colorHex: c.hex,
          price: existing ? existing.price : (Number(price) || 0),
          available: existing ? existing.available : true,
        });
      });
    });

    setVariantsList(newList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasVariants, variantsColors, variantsSizes]);

  // Update prices on base price change for non-customized variants
  useEffect(() => {
    if (!hasVariants || variantsList.length === 0) return;
    setVariantsList((prev) =>
      prev.map((v) => {
        // If the variant's price matches the previous price (or is 0), update it to new base price
        return {
          ...v,
          price: v.price === 0 ? (Number(price) || 0) : v.price
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price]);

  // Initialize Product ID on load
  useEffect(() => {
    const { collection, doc } = getFirestoreModule();
    const newId = doc(collection(getFirestoreDb(), 'products')).id;
    setProductId(newId);
  }, []);

  // File Upload Helper
  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    if (type === 'image' && images.length >= 7) {
      toast('Maximum 7 images allowed.', 'error');
      return;
    }
    if (type === 'video' && videos.length >= 2) {
      toast('Maximum 2 videos allowed.', 'error');
      return;
    }

    const { ref, uploadBytesResumable, getDownloadURL } = getStorageModule();
    const filename = `${Date.now()}_${file.name}`;
    const storageRef = ref(getFirebaseStorage(), `products/${productId}/${filename}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploading(true);
    setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

    return new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress((prev) => ({ ...prev, [file.name]: Math.round(progress) }));
        },
        (error) => {
          console.error('Upload failed:', error);
          toast(`Upload failed for ${file.name}`, 'error');
          setUploadProgress((prev) => {
            const next = { ...prev };
            delete next[file.name];
            return next;
          });
          setUploading(false);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (type === 'image') {
              setImages((prev) => [...prev, downloadUrl]);
            } else {
              setVideos((prev) => [...prev, downloadUrl]);
            }
            setUploadProgress((prev) => {
              const next = { ...prev };
              delete next[file.name];
              return next;
            });
            setUploading(false);
            resolve(downloadUrl);
          } catch (err) {
            setUploading(false);
            reject(err);
          }
        }
      );
    });
  };

  // Remove Media Helper
  const handleRemoveMedia = async (url: string, type: 'image' | 'video') => {
    try {
      if (url.includes('firebasestorage.googleapis.com')) {
        const { ref, deleteObject } = getStorageModule();
        const storageRef = ref(getFirebaseStorage(), url);
        await deleteObject(storageRef).catch((err) => {
          console.warn('Could not delete object from Storage (might not exist):', err);
        });
      }
    } catch (err) {
      console.error('Error removing file from storage:', err);
    }

    if (type === 'image') {
      setImages((prev) => prev.filter((u) => u !== url));
    } else {
      setVideos((prev) => prev.filter((u) => u !== url));
    }
  };

  // Submit manual Add Product
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!printifyId || !title || !price) {
      toast('Please fill in required fields.', 'error');
      return;
    }

    if (uploading || Object.keys(uploadProgress).length > 0) {
      toast('Please wait for uploads to finish.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: productId,
          printifyId,
          title,
          description,
          section,
          price: Number(price),
          tier: tier ? Number(tier) : undefined,
          isPublished,
          images,
          videos,
          variants: hasVariants ? variantsList : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add product');
      }

      toast('Product created successfully.', 'success');
      // If we opened this in a new tab, try to close it. If not, redirect.
      if (window.opener) {
        window.close();
      } else {
        router.push('/admin/products');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to add product.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.opener) {
      window.close();
    } else {
      router.push('/admin/products');
    }
  };

  return (
    <div className={styles.page} style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className={styles.header}>
        <h1 className={styles.title}>Add Custom Product</h1>
        <p className={styles.subtitle}>Create a manually managed custom item</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--surface-1)', padding: '2rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
        <div>
          <label className="input-label">Printify Product ID (Required)</label>
          <input
            type="text"
            className="input"
            value={printifyId}
            onChange={(e) => setPrintifyId(e.target.value)}
            placeholder="e.g. 64b8fbca928..."
            required
          />
        </div>

        <div>
          <label className="input-label">Product Title (Required)</label>
          <input
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brutal design title"
            required
          />
        </div>

        <div>
          <label className="input-label">Description</label>
          <textarea
            className="input"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Product narrative / roast details"
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Media Manager */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <div>
            <label className="input-label">Product Images (Up to 7)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
              {images.map((url, index) => (
                <div key={url} style={{ position: 'relative', aspectRatio: '1', border: '1px solid var(--border)', background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <img src={url} alt={`image-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(url, 'image')}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'var(--accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {images.length < 7 && (
                <label style={{
                  aspectRatio: '1',
                  border: '2px dashed var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'var(--surface-2)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  gap: '0.25rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>+</span>
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      if (e.target.files) {
                        const files = Array.from(e.target.files);
                        const remaining = 7 - images.length;
                        const filesToUpload = files.slice(0, remaining);
                        for (const file of filesToUpload) {
                          await handleFileUpload(file, 'image');
                        }
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="input-label">Product Videos (Up to 2)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
              {videos.map((url, index) => (
                <div key={url} style={{ position: 'relative', aspectRatio: '1', border: '1px solid var(--border)', background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <video src={url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(url, 'video')}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'var(--accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {videos.length < 2 && (
                <label style={{
                  aspectRatio: '1',
                  border: '2px dashed var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'var(--surface-2)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  gap: '0.25rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>+</span>
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={async (e) => {
                      if (e.target.files) {
                        const files = Array.from(e.target.files);
                        const remaining = 2 - videos.length;
                        const filesToUpload = files.slice(0, remaining);
                        for (const file of filesToUpload) {
                          await handleFileUpload(file, 'video');
                        }
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>

          {Object.keys(uploadProgress).length > 0 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '0.25rem' }}>
              {Object.entries(uploadProgress).map(([name, pct]) => (
                <div key={name}>Uploading {name}: {pct}%</div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <div>
            <label className="input-label">Collection</label>
            <select
              className="input"
              value={section}
              onChange={(e) => {
                const val = e.target.value as 'society_fuckers' | 'valueless_bitches';
                setSection(val);
                if (val === 'valueless_bitches') setTier('');
              }}
              style={{ background: 'var(--surface-2)' }}
            >
              <option value="valueless_bitches">Valueless Bi*ches (Streetwear)</option>
              <option value="society_fuckers">Society Fu*kers (Luxury)</option>
            </select>
          </div>

          <div>
            <label className="input-label">Price (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {section === 'society_fuckers' && (
          <div>
            <label className="input-label">Luxury Tier (1 - 5)</label>
            <select
              className="input"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              style={{ background: 'var(--surface-2)' }}
            >
              <option value="">No Tier</option>
              <option value="1">Tier 1 — Novice</option>
              <option value="2">Tier 2 — Amateur</option>
              <option value="3">Tier 3 — Middle Class</option>
              <option value="4">Tier 4 — Rich Kid</option>
              <option value="5">Tier 5 — Overlord</option>
            </select>
          </div>
        )}

        {/* Variants Manager Section */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="hasVariants"
              checked={hasVariants}
              onChange={(e) => setHasVariants(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="hasVariants" style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
              This product has multiple color or size options
            </label>
          </div>

          {hasVariants && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--surface-2)', padding: '1.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
              
              {/* Color Configuration */}
              <div>
                <label className="input-label" style={{ marginBottom: '0.5rem' }}>Configure Colors</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    className="input"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    placeholder="e.g. White, Black, Navy"
                    style={{ background: 'var(--surface-1)' }}
                  />
                  <input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    style={{ width: '44px', height: '44px', padding: '0', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', borderRadius: '4px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (!newColorName.trim()) {
                        toast('Color name is required', 'error');
                        return;
                      }
                      if (variantsColors.some((c) => c.name.toLowerCase() === newColorName.trim().toLowerCase())) {
                        toast('Color already added', 'error');
                        return;
                      }
                      setVariantsColors((prev) => [...prev, { name: newColorName.trim(), hex: newColorHex }]);
                      setNewColorName('');
                    }}
                  >
                    Add Color
                  </button>
                </div>

                {variantsColors.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {variantsColors.map((color, index) => (
                      <div
                        key={color.name + index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: 'var(--surface-1)',
                          border: '1px solid var(--border)',
                          padding: '0.25rem 0.5rem 0.25rem 0.25rem',
                          borderRadius: '2px',
                          fontSize: '0.75rem'
                        }}
                      >
                        <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', background: color.hex, border: '1px solid var(--border)' }} />
                        <span>{color.name}</span>
                        <button
                          type="button"
                          onClick={() => setVariantsColors((prev) => prev.filter((_, i) => i !== index))}
                          style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '0 0.25rem', fontWeight: 'bold' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Size Configuration */}
              <div>
                <label className="input-label" style={{ marginBottom: '0.5rem' }}>Configure Sizes</label>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {['S', 'M', 'L', 'XL', 'XXL', '3XL', 'One Size'].map((size) => {
                    const isChecked = variantsSizes.includes(size);
                    return (
                      <label key={size} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setVariantsSizes((prev) => prev.filter((s) => s !== size));
                            } else {
                              setVariantsSizes((prev) => [...prev, size]);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{size}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Generated Variants Pricing Table */}
              {variantsList.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <label className="input-label" style={{ marginBottom: '0.5rem' }}>Manage Variants Matrix ({variantsList.length})</label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                    Adjust custom pricing or availability for specific color/size options.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '2px', background: 'var(--surface-1)' }}>
                    {variantsList.map((variant, index) => (
                      <div
                        key={variant.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          padding: '0.5rem 0.75rem',
                          borderBottom: index < variantsList.length - 1 ? '1px solid var(--border)' : 'none',
                          opacity: variant.available ? 1 : 0.5
                        }}
                      >
                        {/* Variant Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '0' }}>
                          {variant.colorHex && (
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: variant.colorHex, border: '1px solid var(--border)', flexShrink: 0 }} />
                          )}
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {variant.color} / {variant.size}
                          </span>
                        </div>

                        {/* Custom Price & Availability controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={variant.price}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setVariantsList((prev) =>
                                  prev.map((v, i) => (i === index ? { ...v, price: val } : v))
                                );
                              }}
                              style={{ width: '70px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '2px', color: 'var(--text-primary)' }}
                            />
                          </div>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={variant.available}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setVariantsList((prev) =>
                                  prev.map((v, i) => (i === index ? { ...v, available: val } : v))
                                );
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>Active</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <input
            type="checkbox"
            id="isPublished"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="isPublished" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
            Publish immediately (visible in shop)
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" onClick={handleCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting || uploading} className="btn btn-primary">
            {submitting ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
