import React, { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { storage, StorageKeys } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  signOut: async () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthWrapper] Setting up Firebase auth listener');

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthWrapper] onAuthStateChanged fired - User:', firebaseUser?.email || 'null');

      try {
        if (firebaseUser) {
          // User is logged in
          console.log('[AuthWrapper] ✓ User logged in:', firebaseUser.email);
          setUser(firebaseUser);
        } else {
          // User is logged out
          console.log('[AuthWrapper] ✓ User logged out');
          setUser(null);

          // Clear storage
          try {
            await storage.clear();
            console.log('[AuthWrapper] Storage cleared');
          } catch (err) {
            console.error('[AuthWrapper] Error clearing storage:', err);
          }
        }
      } catch (error) {
        console.error('[AuthWrapper] Error in onAuthStateChanged:', error);
      } finally {
        // Always set loading to false after first auth check
        setIsLoading(false);
      }
    });

    return () => {
      console.log('[AuthWrapper] Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('[AuthWrapper] ========== SIGNOUT CALLED ==========');
    console.log('[AuthWrapper] Current auth.currentUser:', auth.currentUser?.email);
    try {
      console.log('[AuthWrapper] Step 1: Calling firebaseSignOut(auth)...');
      await firebaseSignOut(auth);
      console.log('[AuthWrapper] Step 2: firebaseSignOut completed');
      console.log('[AuthWrapper] Step 3: auth.currentUser after signOut:', auth.currentUser);
      console.log('[AuthWrapper] ✓ signOut completed successfully');
      // onAuthStateChanged listener will detect user is null and update state
    } catch (error) {
      console.error('[AuthWrapper] ✗ signOut error:', error);
      console.error('[AuthWrapper] ✗ Error type:', typeof error);
      console.error('[AuthWrapper] ✗ Error message:', error instanceof Error ? error.message : String(error));
      // Force set user to null even on error
      console.log('[AuthWrapper] Force setting user to null due to error');
      setUser(null);
      try {
        await storage.clear();
      } catch (err) {
        console.error('[AuthWrapper] Error clearing storage on error:', err);
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
