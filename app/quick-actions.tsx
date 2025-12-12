import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronLeft, MessageCircle, Phone, Plus, Wallet, Settings, Bell, Clock, Award, DollarSign, Users, Gift, TrendingUp, Zap } from 'lucide-react-native';
import { auth } from '../config/firebase';

interface UserProfile {
  userType: 'expert' | 'client';
  name: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  backgroundColor: string;
  onPress: () => void;
}

export default function QuickActionsScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        setUserProfile({
          userType: 'client',
          name: currentUser.displayName || 'User',
        });
      }
    } catch (error) {
      console.log('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Actions for Client Users
  const clientQuickActions: QuickAction[] = [
    {
      id: 'find-expert',
      title: 'Find Expert',
      description: 'Browse and find experts',
      icon: <Users size={28} color="#FFFFFF" />,
      color: '#2563EB',
      backgroundColor: '#2563EB',
      onPress: () => router.push('/(tabs)/index' as any),
    },
    {
      id: 'start-chat',
      title: 'Start Chat',
      description: 'Chat with an expert',
      icon: <MessageCircle size={28} color="#FFFFFF" />,
      color: '#059669',
      backgroundColor: '#059669',
      onPress: () => router.push('/(tabs)/chat'),
    },
    {
      id: 'schedule-call',
      title: 'Schedule Call',
      description: 'Book a call session',
      icon: <Phone size={28} color="#FFFFFF" />,
      color: '#7C3AED',
      backgroundColor: '#7C3AED',
      onPress: () => router.push('/(tabs)/call'),
    },
    {
      id: 'add-money',
      title: 'Add Money',
      description: 'Top up wallet balance',
      icon: <Plus size={28} color="#FFFFFF" />,
      color: '#F59E0B',
      backgroundColor: '#F59E0B',
      onPress: () => router.push('/wallet'),
    },
    {
      id: 'my-sessions',
      title: 'My Sessions',
      description: 'View session history',
      icon: <Clock size={28} color="#FFFFFF" />,
      color: '#10B981',
      backgroundColor: '#10B981',
      onPress: () => router.push('/my-sessions'),
    },
    {
      id: 'my-reviews',
      title: 'My Reviews',
      description: 'See expert ratings',
      icon: <Award size={28} color="#FFFFFF" />,
      color: '#F97316',
      backgroundColor: '#F97316',
      onPress: () => router.push('/reviews'),
    },
    {
      id: 'offers',
      title: 'Offers',
      description: 'Check available offers',
      icon: <Gift size={28} color="#FFFFFF" />,
      color: '#EC4899',
      backgroundColor: '#EC4899',
      onPress: () => router.push('/offers'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Manage notifications',
      icon: <Bell size={28} color="#FFFFFF" />,
      color: '#6366F1',
      backgroundColor: '#6366F1',
      onPress: () => router.push('/notifications'),
    },
  ];

  // Quick Actions for Expert Users
  const expertQuickActions: QuickAction[] = [
    {
      id: 'view-profile',
      title: 'My Profile',
      description: 'View and update profile',
      icon: <TrendingUp size={28} color="#FFFFFF" />,
      color: '#2563EB',
      backgroundColor: '#2563EB',
      onPress: () => router.push('/profile-edit'),
    },
    {
      id: 'incoming-requests',
      title: 'Incoming Requests',
      description: 'Accept session requests',
      icon: <Phone size={28} color="#FFFFFF" />,
      color: '#059669',
      backgroundColor: '#059669',
      onPress: () => router.push('/(tabs)/call'),
    },
    {
      id: 'active-chats',
      title: 'Active Chats',
      description: 'Respond to clients',
      icon: <MessageCircle size={28} color="#FFFFFF" />,
      color: '#7C3AED',
      backgroundColor: '#7C3AED',
      onPress: () => router.push('/(tabs)/chat'),
    },
    {
      id: 'earnings',
      title: 'Earnings',
      description: 'View total earnings',
      icon: <DollarSign size={28} color="#FFFFFF" />,
      color: '#F59E0B',
      backgroundColor: '#F59E0B',
      onPress: () => router.push('/wallet'),
    },
    {
      id: 'my-sessions',
      title: 'Sessions',
      description: 'View completed sessions',
      icon: <Clock size={28} color="#FFFFFF" />,
      color: '#10B981',
      backgroundColor: '#10B981',
      onPress: () => router.push('/my-sessions'),
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure preferences',
      icon: <Settings size={28} color="#FFFFFF" />,
      color: '#F97316',
      backgroundColor: '#F97316',
      onPress: () => router.push('/settings'),
    },
    {
      id: 'reviews',
      title: 'Reviews',
      description: 'View client ratings',
      icon: <Award size={28} color="#FFFFFF" />,
      color: '#EC4899',
      backgroundColor: '#EC4899',
      onPress: () => router.push('/reviews'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Enable alerts',
      icon: <Bell size={28} color="#FFFFFF" />,
      color: '#6366F1',
      backgroundColor: '#6366F1',
      onPress: () => router.push('/notifications'),
    },
  ];

  const quickActions = userProfile?.userType === 'expert' ? expertQuickActions : clientQuickActions;

  if (isLoading || !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading quick actions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2563EB', '#1D4ED8']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quick Actions</Text>
          <View style={styles.headerPlaceholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Quick access to your most-used features and actions
          </Text>
        </View>

        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[action.backgroundColor, action.color]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardGradient}
              >
                <View style={styles.actionIconContainer}>
                  {action.icon}
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              {userProfile.userType === 'expert' 
                ? 'Keep your profile updated to attract more clients'
                : 'Browse different experts to find the best match for your needs'
              }
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              {userProfile.userType === 'expert'
                ? 'Respond to requests quickly to maintain a high rating'
                : 'Leave reviews after sessions to help other users'
              }
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              {userProfile.userType === 'expert'
                ? 'Enable notifications to never miss important updates'
                : 'Check offers regularly for special discounts and deals'
              }
            </Text>
          </View>
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
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  descriptionContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  actionCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionCardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionIconContainer: {
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  tipsContainer: {
    marginHorizontal: 24,
    marginVertical: 24,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  tipBullet: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: 'bold',
    marginTop: 2,
  },
  tipText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
});
