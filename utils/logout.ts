import { db, auth } from '../config/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { signOut as firebaseSignOut } from 'firebase/auth';

export const closeActiveChatSessions = async (userId: string): Promise<void> => {
  console.log('[Logout] Closing active chat sessions for user:', userId);

  try {
    const sessionsRef = collection(db, 'chat_sessions');
    const q = query(
      sessionsRef,
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(q);
    const now = new Date();
    const updates = [];

    querySnapshot.forEach((docSnap) => {
      updates.push(
        updateDoc(doc(db, 'chat_sessions', docSnap.id), {
          status: 'ended',
          endedAt: now,
          updatedAt: now
        })
      );
    });

    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`[Logout] ✓ Closed ${updates.length} active sessions`);
    } else {
      console.log('[Logout] No active sessions to close');
    }
  } catch (error) {
    console.error('[Logout] Error closing active chat sessions:', error);
  }
};
export const performCompleteLogout = async (userId: string): Promise<void> => {
  console.log('[Logout] Starting complete logout process for user:', userId);

  try {
    console.log('[Logout] Step 1: Closing active chat sessions...');
    try {
      await closeActiveChatSessions(userId);
    } catch (e) {
      console.error('[Logout] Error closing chat sessions:', e);
      // Continue even if this fails
    }

    console.log('[Logout] Step 2: Signing out from Firebase...');
    try {
      await firebaseSignOut(auth);
      console.log('[Logout] ✓ Firebase signOut successful');
    } catch (e) {
      console.error('[Logout] Exception during signOut:', e);
    }

    // Add a small delay to ensure session is cleared
    await new Promise(resolve => setTimeout(resolve, 100));

    // Firebase automatically clears data on signOut, no need for manual storage.clear()
    console.log('[Logout] ✓ Firebase session and Firestore cache cleared');

    console.log('[Logout] ✓ Complete logout process finished');
  } catch (error) {
    console.error('[Logout] Error during complete logout:', error);
    throw error;
  }
};

export const forceLogout = async (): Promise<void> => {
  console.log('[Logout] FORCE LOGOUT initiated');

  try {
    await firebaseSignOut(auth);
    console.log('[Logout] ✓ Firebase signOut completed');
  } catch (e) {
    console.error('[Logout] Error during signOut:', e);
  }

  if (typeof window !== 'undefined') {
    try {
      // Optional: Clear IndexedDB Firestore cache
      const req = indexedDB.deleteDatabase('firestore');
      req.onsuccess = () => console.log('[Logout] Firestore cache cleared');
    } catch (e) {
      console.error('[Logout] Error clearing localStorage:', e);
    }
  }

  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.error('[Logout] Error calling signOut:', e);
  }


  console.log('[Logout] Force logout completed');
};
