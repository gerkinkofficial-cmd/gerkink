'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useRoast } from '@/hooks/useRoast';
import { addressSchema } from '@/lib/utils/validation';
import { getFirestoreDb, getFirestoreModule } from '@/lib/firebase/config';
import RazorpayButton from '@/components/checkout/RazorpayButton';
import styles from './page.module.css';
import type { Address } from '@/types';

type Step = 'address' | 'payment';

export default function CheckoutPage() {
  const { items, subtotal, referralCode, clearCart } = useCart();
  const { firebaseUser, user } = useAuth();
  const router = useRouter();
  const { toast } = useRoast();

  const [step, setStep]               = useState<Step>('address');
  const [address, setAddress]         = useState<Address | null>(null);
  const [orderData, setOrderData]     = useState<{ orderId: string; razorpayOrderId: string; amount: number; currency: string; paymentMethod?: string } | null>(null);
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'crypto'>('razorpay');
  const [txHash, setTxHash]           = useState('');
  const [submittingCrypto, setSubmittingCrypto] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput]         = useState('');
  const [appliedCoupon, setAppliedCoupon]     = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount]   = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const tax = subtotal * 0.08;
  const totalBeforeDiscount = subtotal + tax;
  const discountAmount = Math.min(couponDiscount, totalBeforeDiscount);
  const grandTotal = Math.max(0, totalBeforeDiscount - discountAmount);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && items.length === 0) {
      router.replace('/cart');
    }
  }, [mounted, items, router]);

  if (!mounted) {
    return (
      <div className={styles.loading}>
        <span>Preparing checkout...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    if (!user) {
      toast('You must be logged in to apply a coupon.', 'error');
      return;
    }
    setValidatingCoupon(true);
    try {
      const { collection, query, where, getDocs, limit } = getFirestoreModule();
      const db = getFirestoreDb();
      const q = query(
        collection(db, 'coupons'),
        where('code', '==', couponInput.trim().toUpperCase()),
        where('userId', '==', user.uid),
        where('isUsed', '==', false),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        toast('Invalid or already used coupon code.', 'error');
        setAppliedCoupon(null);
        setCouponDiscount(0);
      } else {
        const couponDoc = snap.docs[0].data();
        const value = couponDoc.value ?? 100;
        setAppliedCoupon(couponInput.trim().toUpperCase());
        setCouponDiscount(value);
        toast(`$${value} discount applied!`, 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Error validating coupon', 'error');
    } finally {
      setValidatingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput('');
    toast('Coupon removed', 'success');
  }

  async function handleAddressSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const raw = {
      name:    fd.get('name') as string,
      street:  fd.get('street') as string,
      city:    fd.get('city') as string,
      state:   fd.get('state') as string,
      zip:     fd.get('zip') as string,
      country: fd.get('country') as string,
      phone:   (fd.get('phone') as string) || undefined,
    };

    const result = addressSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((i) => { fieldErrors[i.path[0] as string] = i.message; });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.product.id,
            variantId: i.variant.id,
            quantity:  i.quantity,
          })),
          referralCode: referralCode || undefined,
          couponCode: appliedCoupon || undefined,
          shippingAddress: result.data,
          paymentMethod,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Order creation failed');
      }

      const data = await res.json();
      setAddress(result.data);
      setOrderData(data);
      setStep('payment');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleFreeCheckout() {
    if (!orderData) return;
    setLoading(true);
    try {
      const res = await fetch('/api/payment/verify-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderData.orderId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Free order checkout failed');
      }

      toast('Order placed successfully!', 'success');
      clearCart();
      router.push('/account');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Left — Steps */}
        <div className={styles.main}>
          <div className={styles.steps}>
            <span className={`${styles.step} ${step === 'address' ? styles.stepActive : styles.stepDone}`}>1 Shipping</span>
            <span className={styles.stepSep}>→</span>
            <span className={`${styles.step} ${step === 'payment' ? styles.stepActive : ''}`}>2 Payment</span>
          </div>

          {step === 'address' && (
            <form onSubmit={handleAddressSubmit} noValidate className={styles.form}>
              <h2 className={styles.formTitle}>Shipping Address</h2>

              {[
                { id: 'name',    label: 'Full Name',    placeholder: 'Jane Smith',         type: 'text' },
                { id: 'street',  label: 'Street',       placeholder: '123 Main St',        type: 'text' },
                { id: 'city',    label: 'City',         placeholder: 'New York',           type: 'text' },
                { id: 'state',   label: 'State / Region', placeholder: 'NY',              type: 'text' },
                { id: 'zip',     label: 'ZIP / Postal', placeholder: '10001',              type: 'text' },
                { id: 'country', label: 'Country',      placeholder: 'US',                 type: 'text' },
                { id: 'phone',   label: 'Phone (optional)', placeholder: '+1 555 0000',   type: 'tel'  },
              ].map((field) => (
                <div key={field.id}>
                  <label htmlFor={field.id} className="input-label">{field.label}</label>
                  <input id={field.id} name={field.id} type={field.type}
                    className="input" placeholder={field.placeholder} />
                  {errors[field.id] && <span className={styles.fieldError}>{errors[field.id]}</span>}
                </div>
              ))}

              {/* Payment Method Selector */}
              <div style={{ margin: '1.5rem 0 0.5rem 0' }}>
                <label className="input-label" style={{ marginBottom: '0.75rem', display: 'block', fontWeight: 'bold' }}>Payment Method</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    border: `1px solid ${paymentMethod === 'razorpay' ? 'var(--text-primary)' : 'var(--border)'}`,
                    background: paymentMethod === 'razorpay' ? 'var(--surface-2)' : 'transparent',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === 'razorpay'}
                      onChange={() => setPaymentMethod('razorpay')}
                      style={{ cursor: 'pointer' }}
                    />
                    <div>
                      <span style={{ fontWeight: 'bold', display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Credit Card / UPI</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>Secure checkout via Razorpay gateway</span>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    border: `1px solid ${paymentMethod === 'crypto' ? 'var(--text-primary)' : 'var(--border)'}`,
                    background: paymentMethod === 'crypto' ? 'var(--surface-2)' : 'transparent',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === 'crypto'}
                      onChange={() => setPaymentMethod('crypto')}
                      style={{ cursor: 'pointer' }}
                    />
                    <div>
                      <span style={{ fontWeight: 'bold', display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Cryptocurrency (USDT/USDC)</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>Pay with stablecoins directly on Ethereum, Polygon, or Solana networks</span>
                    </div>
                  </label>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full">
                {loading ? 'Processing...' : 'Continue to Payment →'}
              </button>
            </form>
          )}

          {step === 'payment' && orderData && (
            <div className={styles.paymentStep}>
              <h2 className={styles.formTitle}>Payment</h2>
              {orderData.razorpayOrderId === 'free_order' ? (
                <>
                  <p className={styles.paymentNote}>
                    Your order is fully covered by your store coupon. No payment required.
                  </p>
                  <button
                    onClick={handleFreeCheckout}
                    disabled={loading}
                    className="btn btn-primary btn-lg btn-full"
                  >
                    {loading ? 'Placing Order...' : 'Confirm Free Order →'}
                  </button>
                </>
              ) : orderData.paymentMethod === 'crypto' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <p className={styles.paymentNote}>
                    To complete your order, transfer exactly <strong>${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT / USDC</strong> to one of the public wallets below.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--surface-2)', padding: '1.25rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>USDT / USDC (Solana Network - SPL)</span>
                      <code style={{ fontSize: '0.85rem', wordBreak: 'break-all', display: 'block', background: 'var(--surface-1)', padding: '0.5rem', borderRadius: '2px', border: '1px solid var(--border)', fontFamily: 'monospace' }}>
                        7xL2Z8tM1Xp4Jm9wKqyR5dV6bN3uG1hE8cW8sQ4aT7yN
                      </code>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>USDT / USDC (Ethereum / Polygon - ERC20)</span>
                      <code style={{ fontSize: '0.85rem', wordBreak: 'break-all', display: 'block', background: 'var(--surface-1)', padding: '0.5rem', borderRadius: '2px', border: '1px solid var(--border)', fontFamily: 'monospace' }}>
                        0x9E7F6A8B5C3D1E4028A94F7B3625D184E9C0A2D3
                      </code>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                      <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block', fontWeight: 'bold' }}>Submit Transaction Hash (TxID)</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. 0x4f8a... or Solana signature"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        style={{ background: 'var(--surface-1)' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        Paste the transaction hash / ID from your wallet after transferring the funds.
                      </span>
                    </div>
                  </div>

                  <button
                    disabled={submittingCrypto || !txHash.trim()}
                    onClick={async () => {
                      if (!txHash.trim()) return;
                      setSubmittingCrypto(true);
                      try {
                        const res = await fetch('/api/payment/verify-crypto', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            orderId: orderData.orderId,
                            txHash: txHash.trim(),
                          }),
                        });
                        
                        if (!res.ok) {
                          const err = await res.json();
                          throw new Error(err.error || 'Failed to submit transaction');
                        }

                        toast('Transaction submitted! We will verify it and update your order.', 'success');
                        clearCart();
                        router.push('/account');
                      } catch (err: any) {
                        toast(err.message || 'Error submitting transaction hash', 'error');
                      } finally {
                        setSubmittingCrypto(false);
                      }
                    }}
                    className="btn btn-primary btn-lg btn-full"
                  >
                    {submittingCrypto ? 'Submitting Hash...' : 'Submit Crypto Order →'}
                  </button>
                </div>
              ) : (
                <>
                  <p className={styles.paymentNote}>
                    You&apos;re paying <strong>${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> USD via Razorpay.
                  </p>
                  <RazorpayButton
                    razorpayOrderId={orderData.razorpayOrderId}
                    amount={orderData.amount}
                    currency={orderData.currency}
                    firestoreOrderId={orderData.orderId}
                    userEmail={firebaseUser?.email ?? undefined}
                    userName={user?.displayName ?? undefined}
                    onSuccess={() => {
                      clearCart();
                      router.push('/account');
                    }}
                    onError={(msg) => toast(msg, 'error')}
                  />
                </>
              )}
              <button
                className="btn btn-ghost"
                onClick={() => setStep('address')}
                style={{ marginTop: '1rem' }}
              >
                ← Back to shipping
              </button>
            </div>
          )}
        </div>

        {/* Right — Summary */}
        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Order Summary</h2>
          <div className={styles.summaryItems}>
            {items.map((item) => (
              <div key={`${item.product.id}-${item.variant.id}`} className={styles.summaryItem}>
                <span className={styles.summaryItemName}>{item.product.title} × {item.quantity}</span>
                <span className={styles.summaryItemPrice + ' text-price'}>${(item.variant.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className={styles.summaryTotals}>
            <div className={styles.totalRow}><span>Subtotal</span><span>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
            <div className={styles.totalRow}><span>Tax (8%)</span><span>${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
            {couponDiscount > 0 && (
              <div className={styles.totalRow} style={{ color: 'var(--coral-200)' }}>
                <span>Discount</span>
                <span>-${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className={styles.divider} />
            <div className={`${styles.totalRow} ${styles.grand}`}><span>Total</span><span>${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
          </div>

          {/* Coupon Input Block */}
          {step === 'address' && (
            <div className={styles.couponSection}>
              <div className={styles.divider} style={{ margin: '0.5rem 0 1rem' }} />
              {appliedCoupon ? (
                <div className={styles.couponBadge}>
                  <span className={styles.couponBadgeText}>Coupon Applied: <strong>{appliedCoupon}</strong></span>
                  <button onClick={handleRemoveCoupon} className={styles.removeCouponBtn}>Remove</button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className={styles.couponForm}>
                  <input
                    type="text"
                    placeholder="ENTER REWARD CODE"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="input input-sm"
                    style={{ textTransform: 'uppercase', flex: 1, minWidth: 0 }}
                  />
                  <button
                    type="submit"
                    disabled={validatingCoupon}
                    className="btn btn-secondary btn-sm"
                  >
                    {validatingCoupon ? '...' : 'Apply'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
