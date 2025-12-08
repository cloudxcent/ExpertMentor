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
  onSnapshot,
  limit,
} from 'firebase/firestore';

interface ProfileData {
  name: string;
  bio: string;
  email?: string;
  mobileNumber?: string;
  experience?: string;
  expertise?: string;
  industry?: string;
  chatRate?: number;
  callRate?: number;
  userType: 'expert' | 'client';
  avatarUrl?: string;
}

export const api = {
  async createProfile(userId: string, profileData: ProfileData): Promise<{ success: boolean; error?: string }> {
    try {
      await setDoc(doc(db, 'profiles', userId), {
        email: profileData.email || '',
        mobileNumber: profileData.mobileNumber || '',
        name: profileData.name,
        bio: profileData.bio,
        userType: profileData.userType,
        experience: profileData.experience || null,
        expertise: profileData.expertise || null,
        industry: profileData.industry || null,
        chatRate: profileData.chatRate || 0,
        callRate: profileData.callRate || 0,
        avatarUrl: profileData.avatarUrl || null,
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
        const data = docSnap.data();
        return {
          success: true,
          data: {
            id: docSnap.id,
            email: data.email,
            mobileNumber: data.mobileNumber,
            name: data.name,
            bio: data.bio,
            userType: data.userType,
            experience: data.experience,
            expertise: data.expertise,
            industry: data.industry,
            chatRate: data.chatRate,
            callRate: data.callRate,
            isOnline: data.isOnline,
            totalSessions: data.totalSessions,
            averageRating: data.averageRating,
            avatarUrl: data.avatarUrl,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          },
        };
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
      if (profileData.mobileNumber !== undefined) updateData.mobileNumber = profileData.mobileNumber;
      if (profileData.experience) updateData.experience = profileData.experience;
      if (profileData.expertise) updateData.expertise = profileData.expertise;
      if (profileData.industry) updateData.industry = profileData.industry;
      if (profileData.chatRate !== undefined) updateData.chatRate = profileData.chatRate;
      if (profileData.callRate !== undefined) updateData.callRate = profileData.callRate;
      if (profileData.avatarUrl !== undefined) updateData.avatarUrl = profileData.avatarUrl;

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

  async createNotification(userId: string, type: string, title: string, message: string, data?: any): Promise<{ success: boolean; error?: string }> {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        type,
        title,
        message,
        data: data || {},
        isRead: false,
        createdAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  },

  async getNotifications(userId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const notifications: any[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data,
          isRead: data.isRead,
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        });
      });

      return notifications;
    } catch (error: any) {
      console.warn('Error getting notifications:', error?.message || error);
      // Return empty array on permission error instead of crashing
      return [];
    }
  },

  subscribeToNotifications(userId: string, callback: (notifications: any[]) => void): () => void {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notifications: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data,
          isRead: data.isRead,
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        });
      });
      callback(notifications);
    }, (error) => {
      // Handle permission errors gracefully without crashing
      console.warn('Notification subscription error:', error?.message);
      // Return empty array to prevent app from breaking
      callback([]);
    });

    return unsubscribe;
  },

  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      return { success: false };
    }
  },

  async markAllNotificationsAsRead(userId: string): Promise<{ success: boolean }> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const updatePromises = querySnapshot.docs.map((docSnap) =>
        updateDoc(doc(db, 'notifications', docSnap.id), { isRead: true })
      );

      await Promise.all(updatePromises);

      return { success: true };
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      return { success: false };
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

      await api.createNotification(
        expertId,
        'session_request',
        'New Session Request',
        `You have a new ${sessionType} session request`,
        { sessionId: docRef.id, clientId }
      );

      return { success: true, sessionId: docRef.id };
    } catch (error: any) {
      console.error('Error creating session:', error);
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
        isRead: false,
        createdAt: Timestamp.now(),
      });

      await api.createNotification(
        receiverId,
        'message',
        'New Message',
        content.length > 50 ? content.substring(0, 50) + '...' : content,
        { sessionId, senderId }
      );

      return { success: true };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  },

  subscribeToMessages(sessionId: string, callback: (messages: any[]) => void): () => void {
    const q = query(
      collection(db, 'messages'),
      where('sessionId', '==', sessionId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messages: any[] = [];
      querySnapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      callback(messages);
    });

    return unsubscribe;
  },

  async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      const sessionsRef = collection(db, 'chat_sessions');
      const userChatsQuery = query(
        sessionsRef,
        where('isActive', '==', true)
      );

      const sessionsSnapshot = await getDocs(userChatsQuery);
      let totalUnreadCount = 0;

      for (const sessionDoc of sessionsSnapshot.docs) {
        const sessionData = sessionDoc.data();
        const { user1Id, user2Id } = sessionData;

        // Check if current user is part of this session
        if (user1Id !== userId && user2Id !== userId) continue;

        const messagesRef = collection(db, 'chat_sessions', sessionDoc.id, 'messages');
        const unreadQuery = query(
          messagesRef,
          where('recipientId', '==', userId),
          where('isRead', '==', false)
        );

        const messagesSnapshot = await getDocs(unreadQuery);
        totalUnreadCount += messagesSnapshot.size;
      }

      return totalUnreadCount;
    } catch (error: any) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  },

  subscribeToUnreadMessages(userId: string, callback: (count: number) => void): () => void {
    const sessionsRef = collection(db, 'chat_sessions');
    const userChatsQuery = query(sessionsRef);

    const unsubscribe = onSnapshot(userChatsQuery, async (sessionsSnapshot) => {
      let totalUnreadCount = 0;

      for (const sessionDoc of sessionsSnapshot.docs) {
        const sessionData = sessionDoc.data();
        const { user1Id, user2Id } = sessionData;

        // Check if current user is part of this session
        if (user1Id !== userId && user2Id !== userId) continue;

        const messagesRef = collection(db, 'chat_sessions', sessionDoc.id, 'messages');
        const unreadQuery = query(
          messagesRef,
          where('recipientId', '==', userId),
          where('isRead', '==', false)
        );

        const messagesSnapshot = await getDocs(unreadQuery);
        totalUnreadCount += messagesSnapshot.size;
      }

      callback(totalUnreadCount);
    }, (error) => {
      console.warn('Error in unread messages subscription:', error?.message);
      callback(0);
    });

    return unsubscribe;
  },

  async markChatMessagesAsRead(sessionId: string, userId: string): Promise<{ success: boolean }> {
    try {
      const messagesRef = collection(db, 'chat_sessions', sessionId, 'messages');
      const unreadQuery = query(
        messagesRef,
        where('recipientId', '==', userId),
        where('isRead', '==', false)
      );

      const messagesSnapshot = await getDocs(unreadQuery);
      const updatePromises = messagesSnapshot.docs.map((docSnap) =>
        updateDoc(doc(db, 'chat_sessions', sessionId, 'messages', docSnap.id), { isRead: true })
      );

      await Promise.all(updatePromises);
      return { success: true };
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
      return { success: false };
    }
  },

  // ========== RATING AND REVIEW APIS ==========

  async createReview(reviewData: {
    expertId: string;
    clientId: string;
    rating: number;
    comment?: string;
    sessionId?: string;
  }): Promise<{ success: boolean; reviewId?: string; error?: string }> {
    try {
      const reviewRef = await addDoc(collection(db, 'reviews'), {
        expertId: reviewData.expertId,
        clientId: reviewData.clientId,
        rating: reviewData.rating,
        comment: reviewData.comment || '',
        sessionId: reviewData.sessionId || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Update expert's average rating in their profile
      await api.updateExpertRating(reviewData.expertId);

      return { success: true, reviewId: reviewRef.id };
    } catch (error: any) {
      console.error('Error creating review:', error);
      return { success: false, error: error.message };
    }
  },

  async getExpertReviews(expertId: string): Promise<any[]> {
    try {
      // Query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, 'reviews'),
        where('expertId', '==', expertId)
      );

      const querySnapshot = await getDocs(q);
      const reviews: any[] = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();

        let clientName = 'Anonymous';
        let clientAvatar = null;

        try {
          const clientProfile = await api.getProfile(data.clientId);
          if (clientProfile.success && clientProfile.data) {
            clientName = clientProfile.data.name;
            clientAvatar = clientProfile.data.avatarUrl;
          }
        } catch (e) {
          // Continue with anonymous if profile fetch fails
        }

        reviews.push({
          id: docSnap.id,
          rating: data.rating,
          comment: data.comment,
          clientName,
          clientAvatar,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt,
        });
      }

      // Sort client-side by createdAt descending
      reviews.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));

      return reviews;
    } catch (error: any) {
      console.error('Error getting expert reviews:', error);
      return [];
    }
  },

  subscribeToExpertReviews(expertId: string, callback: (reviews: any[]) => void): () => void {
    const q = query(
      collection(db, 'reviews'),
      where('expertId', '==', expertId)
    );

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        const reviews: any[] = [];

        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();

          let clientName = 'Anonymous';
          let clientAvatar = null;

          try {
            const clientProfile = await api.getProfile(data.clientId);
            if (clientProfile.success && clientProfile.data) {
              clientName = clientProfile.data.name;
              clientAvatar = clientProfile.data.avatarUrl;
            }
          } catch (e) {
            // Continue with anonymous
          }

          reviews.push({
            id: docSnap.id,
            rating: data.rating,
            comment: data.comment,
            clientName,
            clientAvatar,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt,
          });
        }

        // Sort client-side by createdAt descending
        reviews.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));

        callback(reviews);
      },
      (error) => {
        console.warn('Error in reviews subscription:', error?.message);
        callback([]);
      }
    );

    return unsubscribe;
  },

  async getExpertRating(expertId: string): Promise<{ averageRating: number; totalReviews: number }> {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('expertId', '==', expertId)
      );

      const querySnapshot = await getDocs(q);
      const ratings: number[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.rating) {
          ratings.push(data.rating);
        }
      });

      const averageRating = ratings.length > 0
        ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
        : 0;

      return {
        averageRating,
        totalReviews: ratings.length,
      };
    } catch (error: any) {
      console.error('Error getting expert rating:', error);
      return { averageRating: 0, totalReviews: 0 };
    }
  },

  subscribeToExpertRating(expertId: string, callback: (rating: { averageRating: number; totalReviews: number }) => void): () => void {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('expertId', '==', expertId)
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          try {
            const ratings: number[] = [];

            querySnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.rating) {
                ratings.push(data.rating);
              }
            });

            const averageRating = ratings.length > 0
              ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
              : 0;

            console.log(`[RatingSubscription] Expert ${expertId}: ${ratings.length} reviews, avg: ${averageRating}`);
            
            callback({
              averageRating,
              totalReviews: ratings.length,
            });
          } catch (error) {
            console.error('Error processing rating data:', error);
            callback({ averageRating: 0, totalReviews: 0 });
          }
        },
        (error) => {
          console.warn('Error in rating subscription:', error?.message);
          // Don't callback on error, just log it
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up rating subscription:', error);
      return () => {}; // Return no-op unsubscribe
    }
  },

  async updateExpertRating(expertId: string): Promise<{ success: boolean }> {
    try {
      const ratingData = await api.getExpertRating(expertId);
      
      await updateDoc(doc(db, 'profiles', expertId), {
        averageRating: ratingData.averageRating,
        totalReviews: ratingData.totalReviews,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating expert rating:', error);
      return { success: false };
    }
  },

  async getUserReviews(userId: string): Promise<any[]> {
    try {
      // Get reviews where this user is the reviewer - no orderBy to avoid index requirement
      const q = query(
        collection(db, 'reviews'),
        where('clientId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const reviews: any[] = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();

        let expertName = 'Unknown Expert';
        let expertAvatar = null;

        try {
          const expertProfile = await api.getProfile(data.expertId);
          if (expertProfile.success && expertProfile.data) {
            expertName = expertProfile.data.name;
            expertAvatar = expertProfile.data.avatarUrl;
          }
        } catch (e) {
          // Continue
        }

        reviews.push({
          id: docSnap.id,
          rating: data.rating,
          comment: data.comment,
          expertName,
          expertAvatar,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        });
      }

      // Sort client-side by createdAt descending
      reviews.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));

      return reviews;
    } catch (error: any) {
      console.error('Error getting user reviews:', error);
      return [];
    }
  },

  async getWalletBalance(userId: string): Promise<number> {
    try {
      const userRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        return docSnap.data().walletBalance || 0;
      }
      return 0;
    } catch (error: any) {
      console.error('Error getting wallet balance:', error);
      return 0;
    }
  },

  subscribeToWalletBalance(userId: string, callback: (balance: number) => void): () => void {
    const userRef = doc(db, 'profiles', userId);

    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data().walletBalance || 0);
        }
      },
      (error) => {
        console.warn('Error in wallet subscription:', error?.message);
        callback(0);
      }
    );

    return unsubscribe;
  },

  async getUserSessionCount(userId: string): Promise<number> {
    try {
      const sessionsRef = collection(db, 'chat_sessions');
      
      // Count sessions where user is user1
      const q1 = query(
        sessionsRef,
        where('user1Id', '==', userId)
      );
      
      // Count sessions where user is user2
      const q2 = query(
        sessionsRef,
        where('user2Id', '==', userId)
      );

      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      // Return total sessions (unique conversations)
      const user1Sessions = snapshot1.size;
      const user2Sessions = snapshot2.size;
      
      console.log(`[SessionCount] User ${userId}: ${user1Sessions} as user1 + ${user2Sessions} as user2 = ${user1Sessions + user2Sessions} total`);
      
      return user1Sessions + user2Sessions;
    } catch (error: any) {
      console.error('Error getting session count:', error);
      return 0;
    }
  },

  subscribeToUserSessionCount(userId: string, callback: (count: number) => void): () => void {
    try {
      const sessionsRef = collection(db, 'chat_sessions');
      
      // Subscribe to sessions where user is user1
      const q1 = query(
        sessionsRef,
        where('user1Id', '==', userId)
      );

      const unsubscribe1 = onSnapshot(
        q1,
        async (snapshot1) => {
          try {
            // Get sessions where user is user2
            const q2 = query(
              sessionsRef,
              where('user2Id', '==', userId)
            );
            const snapshot2 = await getDocs(q2);
            
            const totalSessions = snapshot1.size + snapshot2.size;
            console.log(`[SessionCount] User ${userId}: ${snapshot1.size} as user1 + ${snapshot2.size} as user2 = ${totalSessions} total`);
            callback(totalSessions);
          } catch (error) {
            console.warn('Error calculating session count:', error);
            callback(snapshot1.size);
          }
        },
        (error) => {
          console.warn('Error in session count subscription:', error?.message);
          callback(0);
        }
      );

      return unsubscribe1;
    } catch (error) {
      console.error('Error setting up session count subscription:', error);
      return () => {}; // Return no-op unsubscribe
    }
  },

  // Account deletion request functions
  async createDeletionRequest(userId: string, verificationCode: string, expiryTime: number): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      const deletionRequest = {
        userId,
        verificationCode,
        createdAt: Timestamp.now(),
        expiresAt: new Date(expiryTime),
        status: 'pending_verification'
      };

      const docRef = await addDoc(collection(db, 'deletion_requests'), deletionRequest);
      console.log('[DeletionRequest] Created deletion request:', docRef.id);
      return { success: true, requestId: docRef.id };
    } catch (error: any) {
      console.error('[DeletionRequest] Error creating deletion request:', error);
      return { success: false, error: error.message || 'Failed to create deletion request' };
    }
  },

  async getDeletionRequest(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const q = query(
        collection(db, 'deletion_requests'),
        where('userId', '==', userId),
        where('status', '==', 'pending_verification'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return { success: true, data: null };
      }

      const requestData = snapshot.docs[0].data();
      console.log('[DeletionRequest] Retrieved deletion request:', requestData);
      return { success: true, data: { id: snapshot.docs[0].id, ...requestData } };
    } catch (error: any) {
      console.error('[DeletionRequest] Error getting deletion request:', error);
      return { success: false, error: error.message || 'Failed to get deletion request' };
    }
  },

  async completeDeletionRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db, 'deletion_requests', requestId), {
        status: 'completed',
        completedAt: Timestamp.now()
      });
      console.log('[DeletionRequest] Marked deletion request as completed:', requestId);
      return { success: true };
    } catch (error: any) {
      console.error('[DeletionRequest] Error completing deletion request:', error);
      return { success: false, error: error.message || 'Failed to complete deletion request' };
    }
  },

  async cancelDeletionRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db, 'deletion_requests', requestId), {
        status: 'cancelled',
        cancelledAt: Timestamp.now()
      });
      console.log('[DeletionRequest] Cancelled deletion request:', requestId);
      return { success: true };
    } catch (error: any) {
      console.error('[DeletionRequest] Error cancelling deletion request:', error);
      return { success: false, error: error.message || 'Failed to cancel deletion request' };
    }
  },
};
