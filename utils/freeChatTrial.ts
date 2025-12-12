/**
 * Free Chat Trial Service
 * Manages 60-second free trial for initial expert chat
 * Tracks timer, enables/disables chat based on balance
 * 
 * Features:
 * - 60 second free trial countdown
 * - Auto-disable chat when trial ends
 * - Auto-enable chat when balance is added
 * - Real-time timer updates
 * - Trial status tracking per chat session
 */

import { db, auth } from '../config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  onSnapshot,
  collection,
  query,
  where,
} from 'firebase/firestore';

export interface ChatTrialStatus {
  sessionId: string;
  userId: string;
  expertId: string;
  trialStartTime: Timestamp | null;
  trialEndTime: Timestamp | null;
  isTrialActive: boolean;
  secondsRemaining: number;
  chatEnabled: boolean;
  balanceRequired: boolean;
  message: string;
}

class FreeChatTrialService {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private statusCallbacks: Map<string, (status: ChatTrialStatus) => void> = new Map();
  private listeners: Map<string, () => void> = new Map();
  private sessionTrialData: Map<string, ChatTrialStatus> = new Map();

  /**
   * Initialize free trial for new chat session
   */
  async initializeTrial(
    sessionId: string,
    userId: string,
    expertId: string
  ): Promise<ChatTrialStatus> {
    try {
      const trialRef = doc(db, 'chat_trials', sessionId);
      const now = Timestamp.now();
      const trialEndTime = new Timestamp(now.seconds + 60, now.nanoseconds);

      const trialData = {
        sessionId,
        userId,
        expertId,
        trialStartTime: now,
        trialEndTime: trialEndTime,
        isTrialActive: true,
        chatEnabled: true,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(trialRef, trialData);

      // Start countdown timer
      this.startTrialTimer(sessionId, userId, expertId);

      return {
        sessionId,
        userId,
        expertId,
        trialStartTime: now,
        trialEndTime: trialEndTime,
        isTrialActive: true,
        secondsRemaining: 60,
        chatEnabled: true,
        balanceRequired: false,
        message: 'Free 60-second trial started! 🎉',
      };
    } catch (error) {
      console.error('Error initializing trial:', error);
      throw error;
    }
  }

  /**
   * Start countdown timer for trial
   */
  private startTrialTimer(
    sessionId: string,
    userId: string,
    expertId: string
  ): void {
    // Clear existing timer if any
    if (this.timers.has(sessionId)) {
      clearInterval(this.timers.get(sessionId)!);
    }

    let secondsRemaining = 60;

    const timer = setInterval(async () => {
      secondsRemaining--;

      // Update status
      const status: ChatTrialStatus = {
        sessionId,
        userId,
        expertId,
        trialStartTime: null,
        trialEndTime: null,
        isTrialActive: secondsRemaining > 0,
        secondsRemaining,
        chatEnabled: secondsRemaining > 0,
        balanceRequired: secondsRemaining <= 0,
        message:
          secondsRemaining > 0
            ? `⏳ Free trial ending in ${secondsRemaining}s`
            : '❌ Free trial ended. Please add balance to continue.',
      };

      // Emit status update
      this.emitStatus(sessionId, status);

      // When trial ends
      if (secondsRemaining <= 0) {
        clearInterval(timer);
        this.timers.delete(sessionId);

        // Disable chat
        await this.disableChatForSession(sessionId);
      }

      // Warning at 10 seconds
      if (secondsRemaining === 10) {
        this.emitStatus(sessionId, {
          ...status,
          message: '⚠️ Only 10 seconds left! Add balance to continue after trial.',
        });
      }

      // Critical warning at 5 seconds
      if (secondsRemaining === 5) {
        this.emitStatus(sessionId, {
          ...status,
          message: '🚨 Trial ending in 5 seconds!',
        });
      }
    }, 1000);

    this.timers.set(sessionId, timer);
  }

  /**
   * Disable chat for session when trial ends
   */
  private async disableChatForSession(sessionId: string): Promise<void> {
    try {
      const trialRef = doc(db, 'chat_trials', sessionId);
      await updateDoc(trialRef, {
        isTrialActive: false,
        chatEnabled: false,
        updatedAt: Timestamp.now(),
      });

      // Also update chat_sessions
      const sessionRef = doc(db, 'chat_sessions', sessionId);
      await updateDoc(sessionRef, {
        trialExpired: true,
        chatDisabled: true,
        disabledAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error disabling chat:', error);
    }
  }

  /**
   * Enable chat when user adds balance
   */
  async enableChatAfterBalance(sessionId: string): Promise<ChatTrialStatus> {
    try {
      // Clear timer if still running
      if (this.timers.has(sessionId)) {
        clearInterval(this.timers.get(sessionId)!);
        this.timers.delete(sessionId);
      }

      // Update trial status
      const trialRef = doc(db, 'chat_trials', sessionId);
      await updateDoc(trialRef, {
        trialEnded: true,
        paidChatStarted: true,
        paidChatStartedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Re-enable chat session
      const sessionRef = doc(db, 'chat_sessions', sessionId);
      await updateDoc(sessionRef, {
        trialExpired: false,
        chatDisabled: false,
        paidChatStarted: true,
        enabledAt: Timestamp.now(),
      });

      const status: ChatTrialStatus = {
        sessionId,
        userId: '',
        expertId: '',
        trialStartTime: null,
        trialEndTime: null,
        isTrialActive: false,
        secondsRemaining: 0,
        chatEnabled: true,
        balanceRequired: false,
        message: '✅ Chat enabled! You can continue messaging now.',
      };

      this.emitStatus(sessionId, status);
      return status;
    } catch (error) {
      console.error('Error enabling chat:', error);
      throw error;
    }
  }

  /**
   * Get current trial status
   */
  async getTrialStatus(sessionId: string): Promise<ChatTrialStatus | null> {
    try {
      const trialRef = doc(db, 'chat_trials', sessionId);
      const trialSnap = await getDoc(trialRef);

      if (!trialSnap.exists()) {
        return null;
      }

      const data = trialSnap.data();
      const now = Timestamp.now();
      const trialEnd = data.trialEndTime as Timestamp;

      const secondsRemaining = Math.max(
        0,
        trialEnd.seconds - now.seconds
      );

      return {
        sessionId,
        userId: data.userId,
        expertId: data.expertId,
        trialStartTime: data.trialStartTime,
        trialEndTime: data.trialEndTime,
        isTrialActive: secondsRemaining > 0 && data.isTrialActive,
        secondsRemaining,
        chatEnabled: secondsRemaining > 0,
        balanceRequired: secondsRemaining <= 0,
        message:
          secondsRemaining > 0
            ? `⏳ ${secondsRemaining}s remaining`
            : '❌ Trial expired',
      };
    } catch (error) {
      console.error('Error getting trial status:', error);
      return null;
    }
  }

  /**
   * Subscribe to trial status changes
   */
  subscribeToTrialStatus(
    sessionId: string,
    callback: (status: ChatTrialStatus) => void
  ): () => void {
    // Store callback
    this.statusCallbacks.set(sessionId, callback);

    // Also set up Firestore listener
    const trialRef = doc(db, 'chat_trials', sessionId);

    const unsubscribe = onSnapshot(trialRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const now = Timestamp.now();
        const trialEnd = data.trialEndTime as Timestamp;

        const secondsRemaining = Math.max(
          0,
          trialEnd.seconds - now.seconds
        );

        const status: ChatTrialStatus = {
          sessionId,
          userId: data.userId,
          expertId: data.expertId,
          trialStartTime: data.trialStartTime,
          trialEndTime: data.trialEndTime,
          isTrialActive: secondsRemaining > 0 && data.isTrialActive,
          secondsRemaining,
          chatEnabled: !data.chatDisabled && secondsRemaining > 0,
          balanceRequired: secondsRemaining <= 0,
          message: this.generateMessage(secondsRemaining, data.chatDisabled),
        };

        callback(status);
      }
    });

    this.listeners.set(sessionId, unsubscribe);

    return () => {
      unsubscribe();
      this.statusCallbacks.delete(sessionId);
      this.listeners.delete(sessionId);
    };
  }

  /**
   * Check if user can send message in this session
   */
  async canSendMessage(
    sessionId: string,
    userId: string,
    userBalance: number
  ): Promise<{ allowed: boolean; reason: string }> {
    try {
      const status = await this.getTrialStatus(sessionId);

      if (!status) {
        // No trial found, check balance
        if (userBalance > 0) {
          return { allowed: true, reason: 'Balance available' };
        }
        return {
          allowed: false,
          reason: 'No balance. Add funds to continue.',
        };
      }

      // Trial is active
      if (status.isTrialActive) {
        return {
          allowed: true,
          reason: `Free trial: ${status.secondsRemaining}s remaining`,
        };
      }

      // Trial expired, check balance
      if (userBalance > 0) {
        return { allowed: true, reason: 'Balance available' };
      }

      return {
        allowed: false,
        reason: 'Free trial ended. Add balance to continue.',
      };
    } catch (error) {
      console.error('Error checking message permission:', error);
      return {
        allowed: false,
        reason: 'Error checking chat status',
      };
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(sessionId?: string): void {
    if (sessionId) {
      // Cleanup specific session
      if (this.timers.has(sessionId)) {
        clearInterval(this.timers.get(sessionId)!);
        this.timers.delete(sessionId);
      }

      if (this.listeners.has(sessionId)) {
        this.listeners.get(sessionId)!();
        this.listeners.delete(sessionId);
      }

      this.statusCallbacks.delete(sessionId);
      this.sessionTrialData.delete(sessionId);
    } else {
      // Cleanup all
      this.timers.forEach((timer) => clearInterval(timer));
      this.timers.clear();

      this.listeners.forEach((unsub) => unsub());
      this.listeners.clear();

      this.statusCallbacks.clear();
      this.sessionTrialData.clear();
    }
  }

  /**
   * Private helper to emit status updates
   */
  private emitStatus(sessionId: string, status: ChatTrialStatus): void {
    const callback = this.statusCallbacks.get(sessionId);
    if (callback) {
      callback(status);
    }
  }

  /**
   * Generate user-friendly message based on status
   */
  private generateMessage(secondsRemaining: number, chatDisabled: boolean): string {
    if (chatDisabled) {
      return '❌ Chat disabled. Add balance to continue.';
    }

    if (secondsRemaining <= 0) {
      return '❌ Free trial ended. Add balance to continue.';
    }

    if (secondsRemaining <= 5) {
      return `🚨 URGENT: ${secondsRemaining}s remaining!`;
    }

    if (secondsRemaining <= 10) {
      return `⚠️ Warning: ${secondsRemaining}s left!`;
    }

    return `⏳ Free trial: ${secondsRemaining}s remaining`;
  }
}

// Export singleton instance
export const freeChatTrialService = new FreeChatTrialService();

// Export for use in components
export default freeChatTrialService;
