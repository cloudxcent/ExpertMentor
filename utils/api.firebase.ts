import { db } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  runTransaction,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { distributePayment } from './pricing';

interface ProfileData {
  name: string;
  bio: string;
  experience?: string;
  expertise?: string;
  industry?: string;
  chatRate?: string;
  callRate?: string;
  userType: 'expert' | 'client';
}

export const api = {
  async createProfile(user: User, profileData: ProfileData): Promise<{ success: boolean; error?: string }> {
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        email: user.email || '',
        name: profileData.name,
        bio: profileData.bio,
        userType: profileData.userType,
        experience: profileData.experience || null,
        expertise: profileData.expertise || null,
        industry: profileData.industry || null,
        chatRate: profileData.chatRate ? parseFloat(profileData.chatRate) : 0,
        callRate: profileData.callRate ? parseFloat(profileData.callRate) : 0,
        isOnline: false,
        averageRating: 0,
        totalSessions: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error creating profile:', error);
      return { success: false, error: error.message };
    }
  },

  async getProfile(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { success: false, error: 'Profile not found' };
      }
    } catch (error: any) {
      console.error('Error getting profile:', error);
      return { success: false, error: error.message };
    }
  },

  async updateProfile(userId: string, profileData: Partial<ProfileData>): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };

      if (profileData.name) updateData.name = profileData.name;
      if (profileData.bio !== undefined) updateData.bio = profileData.bio;
      if (profileData.experience) updateData.experience = profileData.experience;
      if (profileData.expertise) updateData.expertise = profileData.expertise;
      if (profileData.industry) updateData.industry = profileData.industry;
      if (profileData.chatRate) updateData.chatRate = parseFloat(profileData.chatRate);
      if (profileData.callRate) updateData.callRate = parseFloat(profileData.callRate);

      await updateDoc(doc(db, 'profiles', userId), updateData);

      return { success: true };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  },

  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<{ success: boolean }> {
    try {
      await updateDoc(doc(db, 'profiles', userId), {
        isOnline,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating online status:', error);
      return { success: false };
    }
  },

  async searchExperts(searchQuery: string, filters?: { industry?: string; minRating?: number }): Promise<any[]> {
    try {
      const profilesRef = collection(db, 'profiles');
      let q = query(profilesRef, where('userType', '==', 'expert'));

      if (filters?.industry) {
        q = query(q, where('industry', '==', filters.industry));
      }

      if (filters?.minRating) {
        q = query(q, where('averageRating', '>=', filters.minRating));
      }

      q = query(q, orderBy('averageRating', 'desc'));

      const querySnapshot = await getDocs(q);
      const experts: any[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          const nameMatch = data.name?.toLowerCase().includes(searchLower);
          const expertiseMatch = data.expertise?.toLowerCase().includes(searchLower);
          const industryMatch = data.industry?.toLowerCase().includes(searchLower);

          if (nameMatch || expertiseMatch || industryMatch) {
            experts.push({ id: doc.id, ...data });
          }
        } else {
          experts.push({ id: doc.id, ...data });
        }
      });

      return experts;
    } catch (error) {
      console.error('Error searching experts:', error);
      return [];
    }
  },

  async getAllExperts(): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'profiles'),
        where('userType', '==', 'expert'),
        orderBy('averageRating', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const experts: any[] = [];

      querySnapshot.forEach((doc) => {
        experts.push({ id: doc.id, ...doc.data() });
      });

      return experts;
    } catch (error) {
      console.error('Error getting experts:', error);
      return [];
    }
  },

  async createSession(expertId: string, clientId: string, sessionType: 'chat' | 'call', ratePerMinute: number): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      const docRef = await addDoc(collection(db, 'sessions'), {
        expertId,
        clientId,
        sessionType,
        status: 'pending',
        ratePerMinute,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      return { success: true, sessionId: docRef.id };
    } catch (error: any) {
      console.error('Error creating session:', error);
      return { success: false, error: error.message };
    }
  },

  async startSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'active',
        startTime: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error starting session:', error);
      return { success: false, error: error.message };
    }
  },

  async endSession(sessionId: string): Promise<{ success: boolean; cost?: number; error?: string }> {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        throw new Error('Session not found');
      }

      const session = sessionSnap.data();
      const endTime = Timestamp.now();
      const startTime = session.startTime;
      const durationMinutes = Math.ceil((endTime.toMillis() - startTime.toMillis()) / (1000 * 60));
      const totalCost = durationMinutes * session.ratePerMinute;

      await updateDoc(sessionRef, {
        status: 'completed',
        endTime,
        durationMinutes,
        totalCost,
        updatedAt: Timestamp.now(),
      });

      const expertRef = doc(db, 'profiles', session.expertId);
      const expertSnap = await getDoc(expertRef);

      if (expertSnap.exists()) {
        const expertData = expertSnap.data();
        await updateDoc(expertRef, {
          totalSessions: (expertData.totalSessions || 0) + 1,
        });
      }

      return { success: true, cost: totalCost };
    } catch (error: any) {
      console.error('Error ending session:', error);
      return { success: false, error: error.message };
    }
  },

  async getUserSessions(userId: string): Promise<any[]> {
    try {
      const q1 = query(
        collection(db, 'sessions'),
        where('expertId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const q2 = query(
        collection(db, 'sessions'),
        where('clientId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      const sessions: any[] = [];

      snapshot1.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() });
      });

      snapshot2.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() });
      });

      sessions.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

      return sessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  },

  async sendMessage(sessionId: string, senderId: string, receiverId: string, content: string): Promise<{ success: boolean; error?: string }> {
    try {
      await addDoc(collection(db, 'messages'), {
        sessionId,
        senderId,
        receiverId,
        content,
        createdAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  },

  async getSessionMessages(sessionId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'messages'),
        where('sessionId', '==', sessionId),
        orderBy('createdAt', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const messages: any[] = [];

      querySnapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });

      return messages;
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  },

  async submitReview(sessionId: string, expertId: string, clientId: string, rating: number, comment: string): Promise<{ success: boolean; error?: string }> {
    try {
      await addDoc(collection(db, 'reviews'), {
        sessionId,
        expertId,
        clientId,
        rating,
        comment,
        createdAt: Timestamp.now(),
      });

      const q = query(collection(db, 'reviews'), where('expertId', '==', expertId));
      const querySnapshot = await getDocs(q);

      const reviews: any[] = [];
      querySnapshot.forEach((doc) => {
        reviews.push(doc.data());
      });

      if (reviews.length > 0) {
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await updateDoc(doc(db, 'profiles', expertId), {
          averageRating: avgRating,
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error submitting review:', error);
      return { success: false, error: error.message };
    }
  },

  async getExpertReviews(expertId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('expertId', '==', expertId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const reviews: any[] = [];

      querySnapshot.forEach((doc) => {
        reviews.push({ id: doc.id, ...doc.data() });
      });

      return reviews;
    } catch (error) {
      console.error('Error getting reviews:', error);
      return [];
    }
  },

  // ===== WALLET AND TRANSACTION METHODS =====

  /**
   * Get user's wallet balance
   */
  async getWalletBalance(userId: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const balance = docSnap.data().walletBalance || 0;
        return { success: true, balance };
      } else {
        return { success: false, error: 'User profile not found' };
      }
    } catch (error: any) {
      console.error('Error getting wallet balance:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get user's total earnings (for experts)
   */
  async getTotalEarnings(userId: string): Promise<{ success: boolean; earnings?: number; error?: string }> {
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const earnings = docSnap.data().totalEarnings || 0;
        return { success: true, earnings };
      } else {
        return { success: false, error: 'User profile not found' };
      }
    } catch (error: any) {
      console.error('Error getting total earnings:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Add funds to user's wallet
   */
  async addWalletFunds(userId: string, amount: number, paymentMethod: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Create transaction record
      const transactionRef = await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'credit',
        amount,
        description: `Wallet top-up via ${paymentMethod}`,
        status: 'completed',
        paymentMethod,
        createdAt: Timestamp.now(),
      });

      // Update user profile wallet balance
      const userRef = doc(db, 'profiles', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const currentBalance = userSnap.data().walletBalance || 0;
        await updateDoc(userRef, {
          walletBalance: currentBalance + amount,
          updatedAt: Timestamp.now(),
        });
      }

      return { success: true, transactionId: transactionRef.id };
    } catch (error: any) {
      console.error('Error adding wallet funds:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Process payment when session ends
   * Deducts from client, credits to expert (80%), and platform (20%)
   */
  async processSessionPayment(
    sessionId: string,
    clientId: string,
    expertId: string,
    totalCost: number,
    sessionType: 'chat' | 'call'
  ): Promise<{ success: boolean; expertEarnings?: number; error?: string }> {
    try {
      const result = await runTransaction(db, async (transaction) => {
        // Get client and expert profiles
        const clientRef = doc(db, 'profiles', clientId);
        const expertRef = doc(db, 'profiles', expertId);

        const clientSnap = await transaction.get(clientRef);
        const expertSnap = await transaction.get(expertRef);

        if (!clientSnap.exists() || !expertSnap.exists()) {
          throw new Error('Client or expert profile not found');
        }

        // Calculate payment distribution
        const distribution = distributePayment(totalCost);

        // Check if client has sufficient balance
        const clientBalance = clientSnap.data().walletBalance || 0;
        if (clientBalance < totalCost) {
          throw new Error('Insufficient balance to process payment');
        }

        // Update client balance (debit)
        transaction.update(clientRef, {
          walletBalance: clientBalance - totalCost,
          updatedAt: Timestamp.now(),
        });

        // Update expert balance and earnings (credit 80%)
        const expertBalance = expertSnap.data().walletBalance || 0;
        const expertEarnings = expertSnap.data().totalEarnings || 0;
        transaction.update(expertRef, {
          walletBalance: expertBalance + distribution.expertEarnings,
          totalEarnings: expertEarnings + distribution.expertEarnings,
          updatedAt: Timestamp.now(),
        });

        // Create client transaction record
        const clientTransactionRef = collection(db, 'transactions');
        transaction.set(
          doc(clientTransactionRef),
          {
            userId: clientId,
            type: 'debit',
            amount: totalCost,
            description: `${sessionType === 'chat' ? 'Chat' : 'Call'} session payment to ${expertSnap.data().name}`,
            sessionId,
            status: 'completed',
            createdAt: Timestamp.now(),
          },
          { merge: false }
        );

        // Create expert transaction record
        const expertTransactionRef = collection(db, 'transactions');
        transaction.set(
          doc(expertTransactionRef),
          {
            userId: expertId,
            type: 'credit',
            amount: distribution.expertEarnings,
            description: `Earnings from ${sessionType === 'chat' ? 'chat' : 'call'} session with ${clientSnap.data().name}`,
            sessionId,
            status: 'completed',
            createdAt: Timestamp.now(),
          },
          { merge: false }
        );

        // Create platform revenue record
        const platformRef = doc(db, 'platform_revenue', 'revenue_tracker');
        const platformSnap = await transaction.get(platformRef);

        if (platformSnap.exists()) {
          const currentRevenue = platformSnap.data().totalRevenue || 0;
          transaction.update(platformRef, {
            totalRevenue: currentRevenue + distribution.platformRevenue,
            lastUpdated: Timestamp.now(),
          });
        } else {
          transaction.set(platformRef, {
            totalRevenue: distribution.platformRevenue,
            lastUpdated: Timestamp.now(),
          });
        }

        return distribution.expertEarnings;
      });

      return { success: true, expertEarnings: result };
    } catch (error: any) {
      console.error('Error processing session payment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId: string, limit: number = 50): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const transactions: any[] = [];

      querySnapshot.forEach((doc) => {
        transactions.push({ id: doc.id, ...doc.data() });
      });

      return { success: true, transactions: transactions.slice(0, limit) };
    } catch (error: any) {
      console.error('Error getting transaction history:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update expert's pricing rates
   */
  async updateExpertPricing(
    expertId: string,
    chatRatePerMinute: number,
    audioCallRatePerMinute: number,
    videoCallRatePerMinute: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db, 'profiles', expertId), {
        chatRatePerMinute: parseFloat(chatRatePerMinute.toString()),
        audioCallRatePerMinute: parseFloat(audioCallRatePerMinute.toString()),
        videoCallRatePerMinute: parseFloat(videoCallRatePerMinute.toString()),
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating expert pricing:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get expert's pricing rates
   */
  async getExpertPricing(expertId: string): Promise<{ success: boolean; pricing?: any; error?: string }> {
    try {
      const docRef = doc(db, 'profiles', expertId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const pricing = {
          chatRatePerMinute: data.chatRatePerMinute || 0,
          audioCallRatePerMinute: data.audioCallRatePerMinute || 0,
          videoCallRatePerMinute: data.videoCallRatePerMinute || 0,
        };
        return { success: true, pricing };
      } else {
        return { success: false, error: 'Expert profile not found' };
      }
    } catch (error: any) {
      console.error('Error getting expert pricing:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Check if user has sufficient balance for a session
   */
  async checkBalance(userId: string, requiredAmount: number): Promise<{ success: boolean; hasSufficientBalance?: boolean; currentBalance?: number; error?: string }> {
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const currentBalance = docSnap.data().walletBalance || 0;
        return {
          success: true,
          hasSufficientBalance: currentBalance >= requiredAmount,
          currentBalance,
        };
      } else {
        return { success: false, error: 'User profile not found' };
      }
    } catch (error: any) {
      console.error('Error checking balance:', error);
      return { success: false, error: error.message };
    }
  },
};
