import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.set('session', '', { maxAge: 0, path: '/' });
  cookieStore.set('is_admin', '', { maxAge: 0, path: '/' });
  return NextResponse.json({ status: 'ok' });
}
