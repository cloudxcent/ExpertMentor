import { useEffect, useState, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './AuthWrapper';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * This component listens to auth state changes and handles navigation
 * It runs at the app level and redirects whenever auth state changes
 */
export default function NavigationHandler() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [profileExists, setProfileExists] = useState(false);
  const profileCheckIntervalRef = useRef<any>(null);

  // Set up periodic profile check when user is logged in
  useEffect(() => {
    if (!user) {
      // User logged out, clear interval
      if (profileCheckIntervalRef.current) {
        clearInterval(profileCheckIntervalRef.current);
        profileCheckIntervalRef.current = null;
      }
      setProfileExists(false);
      return;
    }

    // User is logged in, set up periodic check
    const checkProfile = async () => {
      try {
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        const exists = profileSnap.exists();
        if (exists !== profileExists) {
          console.log('[NavigationHandler] Profile status changed: exists =', exists);
          setProfileExists(exists);
        }
      } catch (error) {
        console.error('[NavigationHandler] Error checking profile:', error);
      }
    };

    // Check immediately
    checkProfile();

    // Then check every 500ms while in auth group (to catch profile completion)
    const inAuthGroup = segments[0] === '(auth)';
    if (inAuthGroup) {
      profileCheckIntervalRef.current = setInterval(checkProfile, 500);
    }

    return () => {
      if (profileCheckIntervalRef.current) {
        clearInterval(profileCheckIntervalRef.current);
        profileCheckIntervalRef.current = null;
      }
    };
  }, [user, segments, profileExists]);

  useEffect(() => {
    console.log('[NavigationHandler] useEffect triggered - user:', user?.email || 'null', 'loading:', isLoading, 'profileExists:', profileExists);

    if (isLoading) {
      console.log('[NavigationHandler] Still loading, skipping navigation');
      return;
    }

    const checkAuthAndNavigate = async () => {
      const inAuthGroup = segments[0] === '(auth)';
      console.log('[NavigationHandler] ✓ Loading complete - Current segment:', segments[0], 'inAuthGroup:', inAuthGroup);
      console.log('[NavigationHandler] ✓ Current user:', user?.email || 'null', 'profileExists:', profileExists);

      if (!user) {
        // User is logged out
        console.log('[NavigationHandler] ✓ User logged out, should redirect to login');
        if (!inAuthGroup) {
          console.log('[NavigationHandler] Calling router.replace("/(auth)/login")');
          try {
            router.replace('/(auth)/login');
            console.log('[NavigationHandler] ✓ Navigation to login initiated');
          } catch (err) {
            console.error('[NavigationHandler] Navigation failed:', err);
          }
        }
        return;
      }

      // User is logged in
      console.log('[NavigationHandler] ✓ User logged in');
      
      if (inAuthGroup) {
        // In auth group, need to check profile
        if (profileExists) {
          console.log('[NavigationHandler] User in auth but has profile, navigating to /(tabs)');
          try {
            router.replace('/(tabs)');
            console.log('[NavigationHandler] ✓ Navigation to tabs initiated');
          } catch (err) {
            console.error('[NavigationHandler] Navigation to tabs failed:', err);
          }
        } else {
          console.log('[NavigationHandler] User in auth with no profile, should stay in user-type-selection');
        }
      } else if (!inAuthGroup && !profileExists) {
        // In main app but no profile - shouldn't happen but redirect to user-type-selection
        console.log('[NavigationHandler] User in tabs but no profile, redirecting to user-type-selection');
        router.replace('/(auth)/user-type-selection');
      }
    };

    checkAuthAndNavigate();
  }, [user, isLoading, profileExists, segments, router]);

  return null;
}
