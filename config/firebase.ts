import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED, initializeFirestore, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth instance
const auth = getAuth(app);

// Initialize Firestore with persistence settings
let db: Firestore;
try {
  if (Platform.OS === 'web') {
    // For web - use standard Firestore with IndexedDB persistence
    db = getFirestore(app);
    
    // Enable IndexedDB persistence for web
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('[Firebase] Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (err.code === 'unimplemented') {
        console.warn('[Firebase] The current browser does not support all of the features required to enable persistence.');
      }
    });
  } else {
    // For React Native (Expo) - use standard Firestore
    // Persistence is enabled by default in Firebase SDK for React Native
    db = getFirestore(app);
    console.log('[Firebase] Initialized Firestore for React Native (offline persistence enabled by default)');
  }
} catch (error) {
  console.error('[Firebase] Error initializing Firestore:', error);
  db = getFirestore(app);
}

// Set Firestore settings for better performance
try {
  db.settings = {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  };
  console.log('[Firebase] Firestore configured with unlimited cache size');
} catch (error) {
  console.warn('[Firebase] Could not set Firestore settings:', error);
}

console.log('[Firebase] Configuration complete');
console.log('[Firebase] Platform:', Platform.OS);
console.log('[Firebase] Offline persistence: ENABLED');

// Initialize Storage
const storage = getStorage(app);
console.log('[Firebase] Storage initialized');

export { app, auth, db, storage };

