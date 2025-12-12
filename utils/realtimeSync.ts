import { auth, db } from '../config/firebase';
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { userPreferences, walletApi } from './api';

interface RealTimeSyncConfig {
  syncNotifications: boolean;
  syncWallet: boolean;
  syncPreferences: boolean;
  syncChatSessions: boolean;
  syncMessages: boolean;
  debounceMs: number;
}

const defaultConfig: RealTimeSyncConfig = {
  syncNotifications: true,
  syncWallet: true,
  syncPreferences: true,
  syncChatSessions: true,
  syncMessages: true,
  debounceMs: 500,
};

class RealtimeSyncService {
  private unsubscribers: Unsubscribe[] = [];
  private syncCallbacks: Map<string, (data: any) => void> = new Map();
  private config: RealTimeSyncConfig = defaultConfig;
  private isOnline = true;

  constructor() {
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[RealtimeSync] App is online');
        this.isOnline = true;
      });
      window.addEventListener('offline', () => {
        console.log('[RealtimeSync] App is offline');
        this.isOnline = false;
      });
    }
  }

  initializeSync(config: Partial<RealTimeSyncConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    console.log('[RealtimeSync] Initializing real-time sync with config:', this.config);
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('[RealtimeSync] No authenticated user found');
      return;
    }

    this.syncNotifications(currentUser.uid);
    this.syncWallet(currentUser.uid);
    this.syncPreferences(currentUser.uid);
    this.syncChatSessions(currentUser.uid);
  }

  private syncNotifications(userId: string) {
    if (!this.config.syncNotifications) return;

    try {
      const notifRef = collection(db, 'notifications');
      const q = query(notifRef, where('userId', '==', userId));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          
          console.log('[RealtimeSync] Notifications updated:', notifications.length);
          this.syncCallbacks.get('notifications')?.(notifications);
        },
        (error) => {
          console.error('[RealtimeSync] Notifications sync error:', error);
        }
      );

      this.unsubscribers.push(unsubscribe);
    } catch (error) {
      console.error('[RealtimeSync] Error setting up notifications sync:', error);
    }
  }

  private syncWallet(userId: string) {
    if (!this.config.syncWallet) return;

    try {
      const unsubscribe = walletApi.subscribeToBalance(userId, (data) => {
        console.log('[RealtimeSync] Wallet updated:', data.balance);
        this.syncCallbacks.get('wallet')?.(data);
      });

      this.unsubscribers.push(unsubscribe);
    } catch (error) {
      console.error('[RealtimeSync] Error setting up wallet sync:', error);
    }
  }

  private syncPreferences(userId: string) {
    if (!this.config.syncPreferences) return;

    try {
      const unsubscribe = userPreferences.subscribeToPreferences(userId, (data) => {
        console.log('[RealtimeSync] Preferences updated');
        this.syncCallbacks.get('preferences')?.(data);
      });

      this.unsubscribers.push(unsubscribe);
    } catch (error) {
      console.error('[RealtimeSync] Error setting up preferences sync:', error);
    }
  }

  private syncChatSessions(userId: string) {
    if (!this.config.syncChatSessions) return;

    try {
      const sessionsRef = collection(db, 'chat_sessions');
      const q = query(
        sessionsRef,
        where('status', '==', 'active')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const sessions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          
          console.log('[RealtimeSync] Chat sessions updated:', sessions.length);
          this.syncCallbacks.get('chatSessions')?.(sessions);
        },
        (error) => {
          console.error('[RealtimeSync] Chat sessions sync error:', error);
        }
      );

      this.unsubscribers.push(unsubscribe);
    } catch (error) {
      console.error('[RealtimeSync] Error setting up chat sessions sync:', error);
    }
  }

  registerCallback(key: string, callback: (data: any) => void) {
    this.syncCallbacks.set(key, callback);
  }

  unregisterCallback(key: string) {
    this.syncCallbacks.delete(key);
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  cleanup() {
    console.log('[RealtimeSync] Cleaning up all listeners');
    this.unsubscribers.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('[RealtimeSync] Error unsubscribing:', error);
      }
    });
    this.unsubscribers = [];
    this.syncCallbacks.clear();
  }
}

export const realtimeSyncService = new RealtimeSyncService();
