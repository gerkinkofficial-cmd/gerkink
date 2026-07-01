import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const userSnap = await adminDb.collection('users')
      .where('referralCode', '==', code.toUpperCase())
      .limit(1)
      .get();

    if (userSnap.empty) {
      return NextResponse.json({ error: 'Referral code not found' }, { status: 404 });
    }

    const userDoc = userSnap.docs[0];
    await userDoc.ref.update({
      linkClicks: FieldValue.increment(1),
    });

    return NextResponse.json({ status: 'ok' });
  } catch (err: any) {
    console.error('Error tracking referral click:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
