import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const uid = await checkAuth();
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { orderId, txHash } = body;
  if (!orderId || !txHash || typeof txHash !== 'string') {
    return NextResponse.json({ error: 'Order ID and Transaction Hash are required.' }, { status: 400 });
  }

  const cleanTxHash = txHash.trim();
  if (cleanTxHash.length < 10) {
    return NextResponse.json({ error: 'Invalid transaction hash format.' }, { status: 400 });
  }

  try {
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data()!;
    if (orderData.userId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update order with transaction hash and flag for admin verification
    await orderRef.update({
      txHash: cleanTxHash,
      status: 'awaiting_crypto_verification',
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error verifying crypto payment:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
