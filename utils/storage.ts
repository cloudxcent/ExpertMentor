import { Platform } from 'react-native';

export const StorageKeys = {
  USER_PROFILE: 'userProfile',
  IS_LOGGED_IN: 'isLoggedIn',
  WALLET_BALANCE: 'walletBalance',
  SESSIONS_HISTORY: 'sessionsHistory',
  NOTIFICATIONS_ENABLED: 'notificationsEnabled',
} as const;

// Lazy load AsyncStorage only on native platforms
let AsyncStorage: any = null;
const getAsyncStorage = async () => {
  if (Platform.OS !== 'web' && !AsyncStorage) {
    AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  }
  return AsyncStorage;
};

// Web-compatible storage adapter for Supabase
export const supabaseStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    }
    const storage = await getAsyncStorage();
    return storage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, value);
      return;
    }
    const storage = await getAsyncStorage();
    return storage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
      return;
    }
    const storage = await getAsyncStorage();
    return storage.removeItem(key);
  },
};

export const storage = {
  async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, jsonValue);
        }
      } else {
        const asyncStorage = await getAsyncStorage();
        await asyncStorage.setItem(key, jsonValue);
      }
    } catch (error) {
      console.error('Error storing data:', error);
      throw error;
    }
  },

  async getItem(key: string): Promise<any> {
    try {
      let jsonValue: string | null = null;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          jsonValue = localStorage.getItem(key);
        }
      } else {
        const asyncStorage = await getAsyncStorage();
        jsonValue = await asyncStorage.getItem(key);
      }
      return jsonValue ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(key);
        }
      } else {
        const asyncStorage = await getAsyncStorage();
        await asyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error removing data:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      console.log('[Storage] Clearing storage...');
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          const beforeLength = localStorage.length;
          localStorage.clear();
          console.log('[Storage] localStorage cleared (was', beforeLength, 'items)');
        }
      } else {
        const asyncStorage = await getAsyncStorage();
        await asyncStorage.clear();
        console.log('[Storage] AsyncStorage cleared');
      }
    } catch (error) {
      console.error('[Storage] Error clearing storage:', error);
      throw error;
    }
  },
};