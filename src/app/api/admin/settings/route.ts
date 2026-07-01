import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { updateSettingsSchema } from '@/lib/utils/validation';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  // Admin only
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    if (!decoded.admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = updateSettingsSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  await adminDb.collection('settings').doc('global').set(
    { ...result.data, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  return NextResponse.json({ status: 'ok' });
}
