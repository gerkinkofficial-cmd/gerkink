'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRoast } from '@/hooks/useRoast';
import { getFirestoreDb, getFirebaseStorage, getFirestoreModule, getStorageModule } from '@/lib/firebase/config';
import styles from '../../page.module.css';

function EditProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { toast } = useRoast();

  // Product states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [section, setSection] = useState<'society_fuckers' | 'valueless_bitches'>('valueless_bitches');
  const [price, setPrice] = useState('');
  const [tier, setTier] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Media states
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [filename: string]: number }>({});
  const [uploading, setUploading] = useState(false);

  // Fetch product on mount or id change
  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/admin/products?id=${id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();

        setTitle(data.title || '');
        setDescription(data.description || '');
        setSection(data.section || 'valueless_bitches');
        setPrice(data.price ? data.price.toString() : '');
        setTier(data.tier ? data.tier.toString() : '');
        setIsPublished(!!data.isPublished);
        setImages(data.images || []);
        setVideos(data.videos || []);
      } catch {
        toast('Failed to load product details.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // File Upload Helper
  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    if (!id) return;
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
    const storageRef = ref(getFirebaseStorage(), `products/${id}/${filename}`);
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

  // Submit Edit Product
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !title || !price) {
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title,
          description,
          section,
          price: Number(price),
          tier: tier ? Number(tier) : null,
          isPublished,
          images,
          videos,
        }),
      });

      if (!res.ok) throw new Error();

      toast('Product updated successfully.', 'success');
      // If we opened this in a new tab, try to close it. If not, redirect.
      if (window.opener) {
        window.close();
      } else {
        router.push('/admin/products');
      }
    } catch {
      toast('Failed to update product.', 'error');
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

  if (!id) {
    return (
      <div className={styles.page} style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--accent)' }}>Invalid or missing product ID.</p>
        <button onClick={handleCancel} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Go Back
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page} style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Loading product details...
      </div>
    );
  }

  return (
    <div className={styles.page} style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit Product</h1>
        <p className={styles.subtitle}>Update collection details or custom media parameters</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--surface-1)', padding: '2rem', border: '1px solid var(--border)', borderRadius: '4px' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <input
            type="checkbox"
            id="isPublished"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="isPublished" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
            Publish product (visible in shop)
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" onClick={handleCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting || uploading} className="btn btn-primary">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EditProductPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Loading form context...
      </div>
    }>
      <EditProductForm />
    </Suspense>
  );
}
