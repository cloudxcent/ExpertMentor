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
} from 'firebase/firestore';
import { User } from 'firebase/auth';

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
};
