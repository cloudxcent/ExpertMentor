import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export type CallStatus = 'calling' | 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended' | 'cancelled';
export type CallType = 'audio' | 'video';

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerImage?: string;
  calleeId: string;
  calleeName: string;
  calleeImage?: string;
  callType: CallType;
  status: CallStatus;
  channelName: string;
  startTime?: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  callRate?: number;
  totalCost?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

class CallSignaling {
  /**
   * Create a new call session
   */
  async createCallSession(
    callerId: string,
    callerName: string,
    calleeId: string,
    calleeName: string,
    callType: CallType = 'audio',
    callerImage?: string,
    calleeImage?: string,
    callRate?: number
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      // Generate unique channel name
      const channelName = `${callerId}_${calleeId}_${Date.now()}`;
      const sessionId = `${callerId}_${calleeId}_${Date.now()}`;

      const callSession: CallSession = {
        id: sessionId,
        callerId,
        callerName,
        callerImage: callerImage || '',
        calleeId,
        calleeName,
        calleeImage: calleeImage || '',
        callType,
        status: 'calling',
        channelName,
        callRate: callRate || 0,
        totalCost: 0,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      console.log(`[CallSignaling] Creating call session: ${sessionId}`);
      
      await setDoc(doc(db, 'call_sessions', sessionId), callSession as any);

      console.log('[CallSignaling] ✓ Call session created');
      return { success: true, sessionId };
    } catch (error: any) {
      console.error('[CallSignaling] ✗ Failed to create call session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get call session details
   */
  async getCallSession(sessionId: string): Promise<{ success: boolean; data?: CallSession; error?: string }> {
    try {
      const docRef = doc(db, 'call_sessions', sessionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log('[CallSignaling] ✓ Call session retrieved');
        return { success: true, data: docSnap.data() as CallSession };
      } else {
        return { success: false, error: 'Call session not found' };
      }
    } catch (error: any) {
      console.error('[CallSignaling] ✗ Failed to get call session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update call session status
   */
  async updateCallStatus(
    sessionId: string,
    status: CallStatus,
    additionalData?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const docRef = doc(db, 'call_sessions', sessionId);
      
      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (status === 'accepted') {
        updateData.startTime = serverTimestamp();
      } else if (status === 'ended' || status === 'rejected' || status === 'missed' || status === 'cancelled') {
        updateData.endTime = serverTimestamp();
      }

      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      console.log(`[CallSignaling] Updating call status to: ${status}`);
      
      await updateDoc(docRef, updateData);

      console.log('[CallSignaling] ✓ Call status updated');
      return { success: true };
    } catch (error: any) {
      console.error('[CallSignaling] ✗ Failed to update call status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Accept incoming call
   */
  async acceptCall(sessionId: string): Promise<{ success: boolean; error?: string }> {
    return this.updateCallStatus(sessionId, 'accepted');
  }

  /**
   * Reject incoming call
   */
  async rejectCall(sessionId: string): Promise<{ success: boolean; error?: string }> {
    return this.updateCallStatus(sessionId, 'rejected');
  }

  /**
   * End the call
   */
  async endCall(
    sessionId: string,
    duration?: number,
    totalCost?: number
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateCallStatus(sessionId, 'ended', {
      duration: duration || 0,
      totalCost: totalCost || 0,
    });
  }

  /**
   * Mark call as missed
   */
  async markCallAsMissed(sessionId: string): Promise<{ success: boolean; error?: string }> {
    return this.updateCallStatus(sessionId, 'missed');
  }

  /**
   * Cancel outgoing call
   */
  async cancelCall(sessionId: string): Promise<{ success: boolean; error?: string }> {
    return this.updateCallStatus(sessionId, 'cancelled');
  }

  /**
   * Listen for incoming calls
   */
  listenForIncomingCalls(
    userId: string,
    onIncomingCall: (call: CallSession) => void,
    onCallStatusChange?: (call: CallSession) => void
  ): (() => void) | null {
    try {
      console.log(`[CallSignaling] Listening for incoming calls for user: ${userId}`);

      // Listen for all incoming calls to this user (without status filter)
      const q = query(
        collection(db, 'call_sessions'),
        where('calleeId', '==', userId)
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        querySnapshot.docChanges().forEach((change) => {
          const call = change.doc.data() as CallSession;
          call.id = change.doc.id;

          console.log(`[CallSignaling] Call event - Type: ${change.type}, Status: ${call.status}, CallID: ${change.doc.id}`);

          // Trigger on new incoming call
          if ((change.type === 'added' || change.type === 'modified') && call.status === 'calling') {
            console.log(`[CallSignaling] ✓ Incoming call from: ${call.callerId}`);
            onIncomingCall(call);
          } 
          // Trigger on status change
          else if (change.type === 'modified' && onCallStatusChange) {
            console.log(`[CallSignaling] ✓ Call status changed to: ${call.status}`);
            onCallStatusChange(call);
          }
        });
      }, (error) => {
        console.error('[CallSignaling] Error listening for calls:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('[CallSignaling] Failed to listen for incoming calls:', error);
      return null;
    }
  }

  /**
   * Listen for outgoing call status changes
   */
  listenForCallStatus(
    sessionId: string,
    onStatusChange: (call: CallSession) => void,
    onError?: (error: any) => void
  ): (() => void) | null {
    try {
      console.log(`[CallSignaling] Listening for call status: ${sessionId}`);

      const docRef = doc(db, 'call_sessions', sessionId);

      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const call = docSnap.data() as CallSession;
            console.log(`[CallSignaling] Call status: ${call.status}`);
            onStatusChange(call);
          }
        },
        (error) => {
          console.error('[CallSignaling] Error listening to call status:', error);
          onError?.(error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('[CallSignaling] Failed to listen for call status:', error);
      onError?.(error);
      return null;
    }
  }

  /**
   * Delete call session (cleanup)
   */
  async deleteCallSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[CallSignaling] Deleting call session: ${sessionId}`);
      
      await deleteDoc(doc(db, 'call_sessions', sessionId));

      console.log('[CallSignaling] ✓ Call session deleted');
      return { success: true };
    } catch (error: any) {
      console.error('[CallSignaling] ✗ Failed to delete call session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update call duration and cost
   */
  async updateCallDurationAndCost(
    sessionId: string,
    duration: number,
    callRate: number
  ): Promise<{ success: boolean; cost?: number; error?: string }> {
    try {
      const minutes = Math.ceil(duration / 60);
      const totalCost = minutes * callRate;

      console.log(`[CallSignaling] Updating call cost - Duration: ${duration}s, Rate: ${callRate}, Cost: ₹${totalCost}`);

      await updateDoc(doc(db, 'call_sessions', sessionId), {
        duration,
        totalCost,
        updatedAt: serverTimestamp(),
      });

      console.log('[CallSignaling] ✓ Call duration and cost updated');
      return { success: true, cost: totalCost };
    } catch (error: any) {
      console.error('[CallSignaling] ✗ Failed to update call duration:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const callSignaling = new CallSignaling();
