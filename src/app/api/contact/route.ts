import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { contactSchema } from '@/lib/utils/validation';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = contactSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  await adminDb.collection('contacts').add({
    ...result.data,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ status: 'ok' });
}
