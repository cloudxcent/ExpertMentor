import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function IndexScreen() {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    console.log('[Index] ===== INDEX SCREEN MOUNTED =====');

    // Listen to Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) {
        console.log('[Index] Component unmounted, skipping redirect');
        return;
      }

      try {
        console.log('[Index] Checking authentication status...');
        console.log('[Index] Firebase user:', user ? user.email : null);

        if (!user) {
          console.log('[Index] ✗ No Firebase user, redirecting to login');
          setRedirectTo('/(auth)/login');
          return;
        }

        // Check if profile exists in Firestore
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        console.log('[Index] Profile exists in Firestore:', profileSnap.exists());

        if (profileSnap.exists()) {
          console.log('[Index] ✓ User authenticated + profile, redirecting to tabs');
          setRedirectTo('/(tabs)');
        } else {
          console.log('[Index] ✗ User authenticated but no profile, redirecting to user-type-selection');
          setRedirectTo('/(auth)/user-type-selection');
        }
      } catch (error) {
        console.error('[Index] Exception checking auth:', error);
        if (mounted) {
          console.log('[Index] Redirecting to login due to error');
          setRedirectTo('/(auth)/login');
        }
      }
    });

    return () => {
      console.log('[Index] ===== INDEX SCREEN UNMOUNTING =====');
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (!redirectTo) {
    console.log('[Index] Still loading, showing spinner');
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  console.log('[Index] ===== REDIRECTING TO:', redirectTo, '=====');
  return <Redirect href={redirectTo as any} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
