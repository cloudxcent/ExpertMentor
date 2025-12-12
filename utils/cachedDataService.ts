/**
 * CachedDataService - Real-time Firestore data with offline persistence
 * 
 * Strategy:
 * 1. Use Firestore real-time listeners (onSnapshot)
 * 2. Data served from Firestore's local cache (IndexedDB/native)
 * 3. Automatic offline persistence and sync
 * 
 * No localStorage needed - Firestore handles all caching internally
 */

import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Expert {
  id: string;
  name: string;
  expertise: string;
  experience: number;
  rating: number;
  isOnline: boolean;
  chatRate: number;
  callRate: number;
  image: string;
  reviews: number;
  industry?: string;
}

/**
 * Subscribe to real-time experts list
 * 
 * Data served from Firestore's local cache (IndexedDB/native storage)
 * Callback fired immediately with cached data, then on any updates
 * 
 * @param onDataChange - Callback when experts list updates
 * @param currentUserId - Current user ID to filter out
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToExpertsList = (
  onDataChange: (experts: Expert[]) => void,
  currentUserId?: string
): (() => void) => {
  try {
    console.log('[ExpertsService] Setting up real-time listener for experts...');
    
    const profilesRef = collection(db, 'profiles');
    const q = query(profilesRef, where('userType', '==', 'expert'));

    // Real-time listener - serves data from Firestore's local cache immediately
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const experts: Expert[] = [];

      querySnapshot.forEach((doc) => {
        const profile = doc.data();

        // Skip current user
        if (profile.id === currentUserId) {
          return;
        }

        experts.push({
          id: profile.id,
          name: profile.name || 'Unknown Expert',
          expertise: profile.expertise || 'General Expert',
          experience: profile.experience ? parseInt(profile.experience) : 0,
          rating: profile.averageRating || 4.5,
          isOnline: profile.isOnline || false,
          chatRate: profile.chatRate || 0,
          callRate: profile.callRate || 0,
          image:
            profile.avatarUrl || 'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=400',
          reviews: profile.totalSessions || 0,
          industry: profile.industry || 'General',
        });
      });

      console.log('[ExpertsService] ✓ Real-time update: loaded', experts.length, 'experts');
      onDataChange(experts);
    }, (error) => {
      console.error('[ExpertsService] Error in real-time listener:', error);
    });

    console.log('[ExpertsService] ✓ Real-time listener started (data served from Firestore cache)');
    return unsubscribe;
  } catch (error) {
    console.error('[ExpertsService] Error setting up listener:', error);
    // Return no-op unsubscribe function on error
    return () => {};
  }
};

/**
 * Legacy function for backwards compatibility
 * Use subscribeToExpertsList instead for real-time updates
 * 
 * This function still exists to prevent breaking old code,
 * but it's recommended to migrate to subscribeToExpertsList
 */
export const getExpertsList = async (currentUserId?: string): Promise<Expert[]> => {
  return new Promise((resolve) => {
    let unsubscribed = false;
    
    // Subscribe and return first snapshot
    const unsubscribe = subscribeToExpertsList((experts) => {
      if (!unsubscribed) {
        resolve(experts);
        unsubscribe();
        unsubscribed = true;
      }
    }, currentUserId);
  });
};

/**
 * DEPRECATED: Use subscribeToExpertsList instead
 * Background fetch is no longer needed - Firestore handles it automatically
 */
export const fetchExpertsInBackground = async (currentUserId?: string): Promise<void> => {
  console.warn('[ExpertsService] fetchExpertsInBackground is deprecated. Use subscribeToExpertsList instead.');
};

/**
 * DEPRECATED: Manual refresh no longer needed
 * Real-time listener keeps data fresh automatically
 */
export const refreshExpertsList = async (currentUserId?: string): Promise<void> => {
  console.warn('[ExpertsService] refreshExpertsList is deprecated. Real-time listener updates automatically.');
};

/**
 * DEPRECATED: Manual cache clearing no longer needed
 * Firestore handles caching and cleanup automatically
 */
export const clearExpertsCache = async (): Promise<void> => {
  console.warn('[ExpertsService] clearExpertsCache is deprecated. Use Firestore cleanup instead.');
};

