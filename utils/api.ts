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

  async getExpertReviews(expertId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('expertId', '==', expertId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const reviews: any[] = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();

        let clientName = 'Anonymous';
        let clientAvatar = null;

        if (data.clientId) {
          const clientProfile = await api.getProfile(data.clientId);
          if (clientProfile.success && clientProfile.data) {
            clientName = clientProfile.data.name;
            clientAvatar = clientProfile.data.avatarUrl;
          }
        }

        reviews.push({
          id: docSnap.id,
          rating: data.rating,
          comment: data.comment,
          clientName,
          clientAvatar,
          createdAt: data.createdAt,
        });
      }

      return reviews;
    } catch (error) {
      console.error('Error getting reviews:', error);
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
};
