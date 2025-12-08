import { callSignaling, CallSession } from './callSignaling';
import { auth } from '../config/firebase';
import { router } from 'expo-router';

class CallListenerService {
  private unsubscribeRef: (() => void) | null = null;
  private isActive = false;

  /**
   * Start listening for incoming calls for the current user
   */
  startListening() {
    if (this.isActive) {
      console.log('[CallListener] Already listening for calls');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('[CallListener] No authenticated user found');
      return;
    }

    console.log('[CallListener] Starting to listen for incoming calls for user:', currentUser.uid);

    // Listen for incoming calls
    const unsubscribe = callSignaling.listenForIncomingCalls(
      currentUser.uid,
      (incomingCall: CallSession) => {
        console.log('[CallListener] Incoming call received:', incomingCall);
        this.handleIncomingCall(incomingCall);
      },
      (updatedCall: CallSession) => {
        console.log('[CallListener] Call status updated:', updatedCall);
        // Handle status updates if needed
      }
    );

    if (unsubscribe) {
      this.unsubscribeRef = unsubscribe;
      this.isActive = true;
      console.log('[CallListener] ✓ Listening for incoming calls');
    } else {
      console.error('[CallListener] Failed to start listening for calls');
    }
  }

  /**
   * Stop listening for incoming calls
   */
  stopListening() {
    if (this.unsubscribeRef) {
      this.unsubscribeRef();
      this.unsubscribeRef = null;
      this.isActive = false;
      console.log('[CallListener] Stopped listening for incoming calls');
    }
  }

  /**
   * Handle incoming call - navigate to incoming call screen
   */
  private handleIncomingCall(call: CallSession) {
    try {
      console.log('[CallListener] Incoming call received from:', call.callerName, call.callerId);
      console.log('[CallListener] Call details:', {
        callerName: call.callerName,
        callerImage: call.callerImage,
        callType: call.callType,
        sessionId: call.id
      });
      
      // Navigate to the incoming call screen
      router.push({
        pathname: '/incoming-call',
        params: {
          callId: call.id,
          callerId: call.callerId,
          callerName: call.callerName,
          callerImage: call.callerImage || '',
          callType: call.callType,
        }
      });
    } catch (error) {
      console.error('[CallListener] Error handling incoming call:', error);
    }
  }

  /**
   * Check if currently listening
   */
  isListening() {
    return this.isActive;
  }
}

// Export singleton instance
export const callListenerService = new CallListenerService();
