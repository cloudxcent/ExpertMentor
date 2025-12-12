import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { realtimeSyncService } from './realtimeSync';

let isInitialized = false;

export const initializeApp = async () => {
  if (isInitialized) {
    console.log('[AppInit] App already initialized');
    return;
  }

  console.log('[AppInit] Starting app initialization...');

  return new Promise<void>((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('[AppInit] User authenticated:', user.uid);
        
        try {
          // Initialize real-time sync
          console.log('[AppInit] Starting real-time sync...');
          realtimeSyncService.initializeSync({
            syncNotifications: true,
            syncWallet: true,
            syncPreferences: true,
            syncChatSessions: true,
            syncMessages: true,
          });
          console.log('[AppInit] ✓ Real-time sync started');
          
          // Real-time sync loads data from Firestore cache (IndexedDB/native storage)
          // No local storage needed - Firestore handles all caching and offline persistence
          console.log('[AppInit] ✓ Using Firestore real-time listeners for data (no local storage)');
          console.log('[AppInit] ✓ Offline persistence enabled via Firestore');

          isInitialized = true;
          console.log('[AppInit] ✓ App initialization complete');
          console.log('[AppInit] All data flows from Firestore real-time listeners');
          resolve();
        } catch (error) {
          console.error('[AppInit] Error during initialization:', error);
          isInitialized = true;
          resolve(); // Resolve anyway to not block app
        }
      } else {
        console.log('[AppInit] No authenticated user');
        // Clean up real-time sync if user logs out
        realtimeSyncService.cleanup();
        isInitialized = false;
        resolve();
      }
    });
  });
};

export const getInitializationStatus = (): boolean => isInitialized;

export const resetInitialization = () => {
  isInitialized = false;
  realtimeSyncService.cleanup();
  console.log('[AppInit] Initialization reset');
};
