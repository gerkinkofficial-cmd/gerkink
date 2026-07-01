import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/session
 * Creates an HTTP-only session cookie from a Firebase ID token.
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as { idToken: string };

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Verify the ID token
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Check if user is admin
    const isAdmin = decoded.admin === true;

    // Create session cookie (5 day expiry)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const cookieStore = await cookies();

    cookieStore.set('session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresIn / 1000,
      path: '/',
    });

    // Set admin indicator cookie (non-httpOnly for middleware to read)
    cookieStore.set('is_admin', String(isAdmin), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresIn / 1000,
      path: '/',
    });

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('Session creation error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/**
 * DELETE /api/auth/session
 * Revokes and clears the session cookie.
 */
export async function DELETE() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;

  if (session) {
    try {
      const decoded = await adminAuth.verifySessionCookie(session);
      await adminAuth.revokeRefreshTokens(decoded.uid);
    } catch {
      // Cookie invalid — still clear it
    }
  }

  // Explicitly clear cookies with path '/'
  cookieStore.set('session', '', { maxAge: 0, path: '/' });
  cookieStore.set('is_admin', '', { maxAge: 0, path: '/' });
  return NextResponse.json({ status: 'ok' });
}
