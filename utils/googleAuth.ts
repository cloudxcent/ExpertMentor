import { auth, db } from '@/config/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

/**
 * Sign in with Google using Firebase popup
 */
export const signInWithGoogle = async (): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> => {
  try {
    console.log('[GoogleAuth] Starting Google Sign-In...');
    const result = await signInWithPopup(auth, googleProvider);
    console.log('[GoogleAuth] Firebase popup sign-in successful:', result.user.email);

    const user = result.user;
    const userData = {
      uid: user.uid,
      email: user.email || '',
      name: user.displayName || '',
      photoUrl: user.photoURL || '',
    };

    return {
      success: true,
      user: userData,
    };
  } catch (error: any) {
    console.error('[GoogleAuth] Error during Google Sign-In:', error);

    if (
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request'
    ) {
      return {
        success: false,
        error: 'Authentication cancelled',
      };
    }

    return {
      success: false,
      error: error.message || 'Google Sign-In failed',
    };
  }
};

/**
 * Handle successful Google authentication
 */
export const handleGoogleAuthSuccess = async (
  user: any,
  userType: 'expert' | 'client'
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('[GoogleAuth] Handling auth success for:', user.email);

    const userRef = doc(db, 'profiles', user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      const now = Timestamp.now();
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.name,
        photoURL: user.photoUrl,
        userType,
        createdAt: now,
        updatedAt: now,
        emailVerified: true,
        profileComplete: false,
      });
      console.log('[GoogleAuth] New user profile created:', user.uid);
    } else {
      await setDoc(
        userRef,
        {
          displayName: user.name,
          photoURL: user.photoUrl,
          emailVerified: true,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      console.log('[GoogleAuth] User profile updated:', user.uid);
    }

    await AsyncStorage.setItem('userData', JSON.stringify(user));
    await AsyncStorage.setItem('userType', userType);

    return { success: true };
  } catch (error: any) {
    console.error('[GoogleAuth] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create user profile',
    };
  }
};

/**
 * Logout from Google and Firebase
 */
export const logoutGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('[GoogleAuth] Logging out...');
    await auth.signOut();
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('userType');
    console.log('[GoogleAuth] Logout successful');
    return { success: true };
  } catch (error: any) {
    console.error('[GoogleAuth] Logout error:', error);
    return {
      success: false,
      error: error.message || 'Logout failed',
    };
  }
};

/**
 * Get current auth user from Firebase
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};
