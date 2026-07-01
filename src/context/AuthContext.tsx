'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { getFirebaseAuth, getFirestoreDb, getFirestoreModule } from '@/lib/firebase/config';
import { setSessionCookie, handleGoogleRedirectResult } from '@/lib/firebase/auth';
import type { User } from '@/types';

// Type-only import — erased at compile time, doesn't trigger SDK evaluation
import type { User as FirebaseUser } from 'firebase/auth';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  user: null,
  loading: true,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Dynamic require() so the Firebase SDK is only evaluated on the client
    const { onIdTokenChanged } = require('firebase/auth') as typeof import('firebase/auth');
    let active = true;
    let unsubAuth: (() => void) | undefined;

    async function initAuth() {
      // Process any pending Google redirect result (creates user profile if new)
      await handleGoogleRedirectResult();

      if (!active) return;

      unsubAuth = onIdTokenChanged(getFirebaseAuth(), async (fbUser) => {
        if (!active) return;
        setFirebaseUser(fbUser);

        if (!fbUser) {
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          // Fire-and-forget: delete session on server without blocking client state.
          // Keep alive ensures redirects don't abort the delete request.
          fetch('/api/auth/session', { method: 'DELETE', keepalive: true }).catch((err) => {
            console.error('Error clearing session cookie on logout:', err);
          });
          return;
        }

        // Sync session cookie
        try {
          const idToken = await fbUser.getIdToken();
          await setSessionCookie(idToken);

          if (!active) return;

          // Check admin claim
          const tokenResult = await fbUser.getIdTokenResult();
          setIsAdmin(tokenResult.claims['admin'] === true);
        } catch (err) {
          console.error('Error in onIdTokenChanged cookie sync:', err);
        }

        setLoading(false);
      });
    }

    initAuth();

    return () => {
      active = false;
      if (unsubAuth) unsubAuth();
    };
  }, []);

  // Subscribe to Firestore user profile when logged in
  useEffect(() => {
    if (!firebaseUser) { setUser(null); return; }

    const { doc, onSnapshot } = getFirestoreModule();

    const unsub = onSnapshot(
      doc(getFirestoreDb(), 'users', firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          setUser({ id: snap.id, ...snap.data() } as unknown as User);
        }
      },
      (err) => {
        console.warn('User profile snapshot error:', err);
      }
    );

    return () => unsub();
  }, [firebaseUser]);

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

