import { supabase } from '../config/supabase';
import { storage, StorageKeys } from './storage';

export const closeActiveChatSessions = async (userId: string): Promise<void> => {
  console.log('[Logout] Closing active chat sessions for user:', userId);

  try {
    const { data: activeSessions, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('id')
      .or(`client_id.eq.${userId},expert_id.eq.${userId}`)
      .eq('status', 'active');

    if (fetchError) {
      console.error('[Logout] Error fetching active sessions:', fetchError);
      return;
    }

    if (activeSessions && activeSessions.length > 0) {
      console.log(`[Logout] Found ${activeSessions.length} active sessions to close`);

      const sessionIds = activeSessions.map(s => s.id);

      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .in('id', sessionIds);

      if (updateError) {
        console.error('[Logout] Error closing sessions:', updateError);
      } else {
        console.log('[Logout] Successfully closed all active sessions');
      }
    } else {
      console.log('[Logout] No active sessions to close');
    }
  } catch (error) {
    console.error('[Logout] Error in closeActiveChatSessions:', error);
  }
};

export const clearAllSupabaseStorage = (): void => {
  console.log('[Logout] Clearing all Supabase-specific storage');

  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('sb-') ||
          key.includes('supabase') ||
          key.includes('auth-token')
        )) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error(`[Logout] Error removing key ${key}:`, e);
        }
      });

      console.log(`[Logout] Removed ${keysToRemove.length} Supabase storage keys`);
    } catch (error) {
      console.error('[Logout] Error clearing Supabase storage:', error);
    }
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

    console.log('[Logout] Step 2: Signing out from Supabase...');
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) {
        console.error('[Logout] Supabase signOut error:', signOutError);
      } else {
        console.log('[Logout] Supabase signOut successful');
      }
    } catch (e) {
      console.error('[Logout] Exception during signOut:', e);
    }

    // Add a small delay to ensure session is cleared
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('[Logout] Step 3: Clearing app storage...');
    try {
      await storage.clear();
      console.log('[Logout] App storage cleared');
    } catch (e) {
      console.error('[Logout] Error clearing app storage:', e);
    }

    console.log('[Logout] Step 4: Clearing Supabase storage...');
    try {
      clearAllSupabaseStorage();
    } catch (e) {
      console.error('[Logout] Error clearing Supabase storage:', e);
    }

    console.log('[Logout] Step 5: Verifying session cleared...');
    try {
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (sessionCheck.session) {
        console.warn('[Logout] WARNING: Session still exists after logout, attempting force clear');
        // Try to force clear
        try {
          await supabase.auth.signOut({ scope: 'global' });
          console.log('[Logout] Force signOut with global scope executed');
        } catch (e) {
          console.error('[Logout] Force signOut failed:', e);
        }
      } else {
        console.log('[Logout] ✓ Session successfully cleared');
      }
    } catch (e) {
      console.error('[Logout] Error verifying session:', e);
    }

    console.log('[Logout] ✓ Complete logout process finished');
  } catch (error) {
    console.error('[Logout] Error during complete logout:', error);
    throw error;
  }
};

export const forceLogout = async (): Promise<void> => {
  console.log('[Logout] FORCE LOGOUT initiated');

  try {
    await storage.clear();
  } catch (e) {
    console.error('[Logout] Error clearing storage:', e);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('[Logout] Error clearing localStorage:', e);
    }
  }

  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (e) {
    console.error('[Logout] Error calling signOut:', e);
  }

  console.log('[Logout] Force logout completed');
};
