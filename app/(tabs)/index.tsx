import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, Star, Clock, Phone, MessageCircle, TrendingUp, Search, Zap, DollarSign, Award, Users, Shield, Lock, Eye, Newspaper, Gift } from 'lucide-react-native';
import { storage, StorageKeys } from '../../utils/storage';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  userType: 'expert' | 'client';
  bio?: string;
  experience?: string;
  expertise?: string;
  chatRate?: number;
  callRate?: number;
  totalSessions?: number;
  averageRating?: number;
}

interface Expert {
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
}

export default function HomeScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [experts, setExperts] = useState<Expert[]>([]);

  useEffect(() => {
    loadUserProfile();
    loadExperts();

    // Set up real-time listener for experts (simple query without orderBy)
    const profilesRef = collection(db, 'profiles');
    const q = query(
      profilesRef,
      where('userType', '==', 'expert')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('[Home] Real-time update: experts changed');
      loadExperts();
    }, (error) => {
      console.error('[Home] Error setting up real-time listener:', error);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadUserProfile = async () => {
    try {
      const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
      if (profileData) {
        setUserProfile(profileData);
      }
    } catch (error) {
      console.log('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExperts = async () => {
    try {
      const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
      const currentUserId = profileData?.id;
      console.log('[Home] Loading experts from Firestore, excluding current user:', currentUserId);

      const profilesRef = collection(db, 'profiles');
      const q = query(
        profilesRef,
        where('userType', '==', 'expert')
      );

      const querySnapshot = await getDocs(q);
      console.log('[Home] Found', querySnapshot.size, 'experts');

      const mappedExperts: Expert[] = [];
      
      querySnapshot.forEach((doc) => {
        const profile = doc.data();
        
        // Skip current user
        if (profile.id === currentUserId) {
          console.log('[Home] Skipping current user:', profile.name);
          return;
        }

        console.log('[Home] Adding expert:', profile.name, 'with expertise:', profile.expertise);

        mappedExperts.push({
          id: profile.id,
          name: profile.name || 'Unknown Expert',
          expertise: profile.expertise || 'General Expert',
          experience: profile.experience ? parseInt(profile.experience) : 0,
          rating: profile.averageRating || 4.5,
          isOnline: profile.isOnline || false,
          chatRate: profile.chatRate || 0,
          callRate: profile.callRate || 0,
          image: profile.avatarUrl || 'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=400',
          reviews: profile.totalSessions || 0
        });
      });

      console.log('[Home] Mapped', mappedExperts.length, 'experts from real data');
      
      if (mappedExperts.length > 0) {
        console.log('[Home] ✓ Showing', mappedExperts.length, 'real experts');
        setExperts(mappedExperts);
      } else {
        console.log('[Home] No real experts found yet');
        setExperts([]);
      }
    } catch (error) {
      console.error('[Home] Error loading experts:', error);
      console.error('[Home] Error details:', error instanceof Error ? error.message : String(error));
      setExperts([]);
    }
  };

  const ExpertCard = ({ expert }: { expert: Expert }) => (
    <TouchableOpacity
      style={styles.expertCard}
      onPress={() => router.push(`/expert-detail/${expert.id}`)}
    >
      <View style={styles.expertHeader}>
        <Image source={{ uri: expert.image }} style={styles.expertAvatar} />
        <View style={styles.expertInfo}>
          <View style={styles.expertNameContainer}>
            <Text style={styles.expertName}>{expert.name}</Text>
            {expert.isOnline && <View style={styles.onlineIndicator} />}
          </View>
          <Text style={styles.expertExpertise}>{expert.expertise}</Text>
          <View style={styles.expertStats}>
            <View style={styles.statItem}>
              <Star size={14} color="#F59E0B" />
              <Text style={styles.statText}>{expert.rating}</Text>
            </View>
            <View style={styles.statItem}>
              <Clock size={14} color="#6B7280" />
              <Text style={styles.statText}>{expert.experience} yrs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.reviewText}>{expert.reviews} reviews</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.expertActions}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => router.push({
            pathname: '/chat/[expertId]',
            params: {
              expertId: expert.id,
              expertName: expert.name,
              expertImage: expert.image,
              chatRate: expert.chatRate.toString()
            }
          })}
        >
          <MessageCircle size={16} color="#2563EB" />
          <Text style={styles.chatButtonText}>₹{expert.chatRate}/min</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => router.push(`/expert-detail/${expert.id}`)}
        >
          <Phone size={16} color="#059669" />
          <Text style={styles.callButtonText}>₹{expert.callRate}/min</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading || !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (userProfile.userType === 'expert') {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#2563EB', '#1D4ED8']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hello, {userProfile.name.split(' ')[0]}</Text>
              <Text style={styles.headerSubtitle}>Manage your sessions and earnings</Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push('/notifications')}
            >
              <Bell size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <DollarSign size={24} color="#059669" />
              <Text style={styles.statNumber}>₹{((userProfile.totalSessions || 0) * 500).toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Users size={24} color="#2563EB" />
              <Text style={styles.statNumber}>{userProfile.totalSessions || 0}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statCard}>
              <Star size={24} color="#F59E0B" />
              <Text style={styles.statNumber}>{userProfile.averageRating || 0}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Services</Text>
            </View>
            <View style={styles.servicesCard}>
              <View style={styles.serviceRow}>
                <MessageCircle size={20} color="#2563EB" />
                <Text style={styles.serviceText}>Chat Rate: ₹{userProfile.chatRate || 0}/min</Text>
              </View>
              <View style={styles.serviceRow}>
                <Phone size={20} color="#059669" />
                <Text style={styles.serviceText}>Call Rate: ₹{userProfile.callRate || 0}/min</Text>
              </View>
              <View style={styles.serviceRow}>
                <Award size={20} color="#F59E0B" />
                <Text style={styles.serviceText}>Expertise: {userProfile.expertise || 'Not set'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/chat')}
            >
              <MessageCircle size={20} color="#2563EB" />
              <Text style={styles.actionButtonText}>View Chats</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/my-sessions')}
            >
              <Clock size={20} color="#059669" />
              <Text style={styles.actionButtonText}>My Sessions</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/wallet')}
            >
              <DollarSign size={20} color="#F59E0B" />
              <Text style={styles.actionButtonText}>Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/analytics')}
            >
              <TrendingUp size={20} color="#7C3AED" />
              <Text style={styles.actionButtonText}>Analytics</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.trustSection}>
            <View style={styles.trustItem}>
              <View style={styles.trustIconContainer}>
                <Shield size={24} color="#10B981" />
              </View>
              <Text style={styles.trustText}>Verified{'\n'}Expert</Text>
            </View>
            <View style={styles.trustItem}>
              <View style={styles.trustIconContainer}>
                <Lock size={24} color="#2563EB" />
              </View>
              <Text style={styles.trustText}>Secure{'\n'}Payments</Text>
            </View>
            <View style={styles.trustItem}>
              <View style={styles.trustIconContainer}>
                <Eye size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.trustText}>Private &{'\n'}Confidential</Text>
            </View>
          </View>

          <View style={styles.newsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.newsHeader}>
                <Newspaper size={20} color="#1F2937" />
                <Text style={styles.sectionTitle}>Mentorxity in News</Text>
              </View>
            </View>

            <View style={styles.newsContainer}>
              <TouchableOpacity style={styles.newsCard}>
                <Image
                  source={{ uri: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=400' }}
                  style={styles.newsImage}
                />
                <View style={styles.newsContent}>
                  <Text style={styles.newsTitle}>Mentorxity Raises $10M in Series A Funding</Text>
                  <Text style={styles.newsDate}>TechCrunch • 2 days ago</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.newsCard}>
                <Image
                  source={{ uri: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400' }}
                  style={styles.newsImage}
                />
                <View style={styles.newsContent}>
                  <Text style={styles.newsTitle}>How Mentorxity is Revolutionizing Professional Consulting</Text>
                  <Text style={styles.newsDate}>Forbes • 5 days ago</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.newsCard}>
                <Image
                  source={{ uri: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400' }}
                  style={styles.newsImage}
                />
                <View style={styles.newsContent}>
                  <Text style={styles.newsTitle}>Top 10 Apps Connecting You with Industry Experts</Text>
                  <Text style={styles.newsDate}>Business Insider • 1 week ago</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2563EB', '#1D4ED8']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {userProfile.name.split(' ')[0]}</Text>
            <Text style={styles.headerSubtitle}>Find expert guidance today</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
          >
            <Bell size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#059669" />
            <Text style={styles.statNumber}>1,200+</Text>
            <Text style={styles.statLabel}>Active Experts</Text>
          </View>
          <View style={styles.statCard}>
            <MessageCircle size={24} color="#2563EB" />
            <Text style={styles.statNumber}>50K+</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Star size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>4.8</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Experts</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.expertsContainer}>
            {experts.length > 0 ? (
              experts.map((expert) => (
                <ExpertCard key={expert.id} expert={expert} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No experts available yet</Text>
                <Text style={styles.emptySubtext}>Check back soon!</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.trustSection}>
          <View style={styles.trustItem}>
            <View style={styles.trustIconContainer}>
              <Shield size={24} color="#10B981" />
            </View>
            <Text style={styles.trustText}>Verified{'\n'}Experts</Text>
          </View>
          <View style={styles.trustItem}>
            <View style={styles.trustIconContainer}>
              <Lock size={24} color="#2563EB" />
            </View>
            <Text style={styles.trustText}>Secure{'\n'}Payments</Text>
          </View>
          <View style={styles.trustItem}>
            <View style={styles.trustIconContainer}>
              <Eye size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.trustText}>Private &{'\n'}Confidential</Text>
          </View>
        </View>

        <View style={styles.newsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.newsHeader}>
              <Newspaper size={20} color="#1F2937" />
              <Text style={styles.sectionTitle}>Mentorxity in News</Text>
            </View>
          </View>

          <View style={styles.newsContainer}>
            <TouchableOpacity style={styles.newsCard}>
              <Image
                source={{ uri: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=400' }}
                style={styles.newsImage}
              />
              <View style={styles.newsContent}>
                <Text style={styles.newsTitle}>Mentorxity Raises $10M in Series A Funding</Text>
                <Text style={styles.newsDate}>TechCrunch • 2 days ago</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.newsCard}>
              <Image
                source={{ uri: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400' }}
                style={styles.newsImage}
              />
              <View style={styles.newsContent}>
                <Text style={styles.newsTitle}>How Mentorxity is Revolutionizing Professional Consulting</Text>
                <Text style={styles.newsDate}>Forbes • 5 days ago</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.newsCard}>
              <Image
                source={{ uri: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400' }}
                style={styles.newsImage}
              />
              <View style={styles.newsContent}>
                <Text style={styles.newsTitle}>Top 10 Apps Connecting You with Industry Experts</Text>
                <Text style={styles.newsDate}>Business Insider • 1 week ago</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Search size={20} color="#2563EB" />
            <Text style={styles.actionButtonText}>Find Expert</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/chat')}
          >
            <MessageCircle size={20} color="#059669" />
            <Text style={styles.actionButtonText}>My Chats</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#BFDBFE',
    marginTop: 4,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginTop: -12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  servicesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  expertsContainer: {
    gap: 12,
  },
  expertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  expertHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  expertAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  expertInfo: {
    flex: 1,
  },
  expertNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  expertName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginRight: 6,
  },
  onlineIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  expertExpertise: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 6,
  },
  expertStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  reviewText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  expertActions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF4FF',
    borderRadius: 6,
    paddingVertical: 10,
    gap: 4,
  },
  chatButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingVertical: 10,
    gap: 4,
  },
  callButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trustItem: {
    alignItems: 'center',
    flex: 1,
  },
  trustIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  trustText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 16,
  },
  newsSection: {
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 24,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 0,
  },
  newsContainer: {
    gap: 12,
    marginTop: 8,
  },
  newsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  newsImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  newsContent: {
    flex: 1,
    justifyContent: 'center',
  },
  newsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 20,
  },
  newsDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});
