import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Image, Alert, ActivityIndicator, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { User, Settings, Wallet, Star, MessageCircle, Phone, TrendingUp, Bell, CircleHelp as HelpCircle, LogOut, CreditCard as Edit, Award, Clock, DollarSign, Zap, CreditCard, Gift } from 'lucide-react-native';
import { db, auth } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../components/AuthWrapper';
import { api } from '../../utils/api';

interface UserProfile {
  name: string;
  bio: string;
  experience: string;
  expertise: string;
  chatRate: string;
  callRate: string;
  userType: 'mentor' | 'client';
  avatarUrl?: string;
  totalSessions?: number;
  averageRating?: number;
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalSessions: 0,
    rating: 0,
    reviews: 0,
    walletBalance: 0
  });

  useEffect(() => {
    console.log('[Profile] Component mounted, signOut available:', typeof signOut);
    loadUserProfile();
    loadRealTimeStats();

    return () => {
      // Cleanup if needed
    };
  }, []);

  const loadRealTimeStats = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get wallet balance
      const walletBalance = await api.getWalletBalance(currentUser.uid);
      
      // Get session count
      const sessionCount = await api.getUserSessionCount(currentUser.uid);
      
      // Get expert rating if user is expert
      let rating = 0;
      let reviews = 0;

      // Subscribe to real-time rating updates
      api.subscribeToExpertRating(currentUser.uid, (ratingData) => {
        setStats(prev => ({
          ...prev,
          rating: ratingData.averageRating,
          reviews: ratingData.totalReviews,
        }));
      });

      // Subscribe to real-time wallet updates
      api.subscribeToWalletBalance(currentUser.uid, (balance) => {
        setStats(prev => ({
          ...prev,
          walletBalance: balance,
        }));
      });

      // Subscribe to real-time session updates
      api.subscribeToUserSessionCount(currentUser.uid, (count) => {
        setStats(prev => ({
          ...prev,
          totalSessions: count,
        }));
      });

      setStats(prev => ({
        ...prev,
        walletBalance,
        totalSessions: sessionCount,
        rating,
        reviews,
      }));
    } catch (error) {
      console.error('[Profile] Error loading real-time stats:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        // Fetch updated profile from Firestore
        const profileRef = doc(db, 'profiles', currentUser.uid);
        const docSnap = await getDoc(profileRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const userProfile = {
            name: data.name || '',
            bio: data.bio || '',
            avatarUrl: data.avatarUrl,
            experience: String(data.experience || ''),
            expertise: data.expertise || '',
            chatRate: String(data.chatRate || '0'),
            callRate: String(data.callRate || '0'),
            userType: data.userType || 'client',
            totalSessions: data.totalSessions || 0,
            averageRating: data.averageRating || 0,
          };
          setUserProfile(userProfile);
        }
      } catch (err) {
        console.log('Error fetching profile from Firestore:', err);
      }
    } catch (error) {
      console.log('Error loading profile:', error);
    }
  };

  const handleLogout = () => {
    console.log('[Profile] Logout button clicked');
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    console.log('[Profile] ========== LOGOUT CONFIRMED ==========');
    setShowLogoutConfirm(false);
    setIsLoggingOut(true);
    
    try {
      console.log('[Profile] Calling signOut...');
      await signOut();
      console.log('[Profile] signOut completed, NavigationHandler will redirect');
    } catch (error) {
      console.error('[Profile] ✗ Logout error:', error);
      setIsLoggingOut(false);
      Alert.alert('Logout Failed', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const cancelLogout = () => {
    console.log('[Profile] Logout cancelled');
    setShowLogoutConfirm(false);
  };


  const MenuSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.menuSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.menuContainer}>
        {children}
      </View>
    </View>
  );

  const MenuItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true,
    color = '#374151'
  }: { 
    icon: React.ReactNode; 
    title: string; 
    subtitle?: string; 
    onPress: () => void;
    showArrow?: boolean;
    color?: string;
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIcon}>
        {icon}
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, { color }]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && <Text style={styles.menuArrow}>›</Text>}
    </TouchableOpacity>
  );

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#2563EB', '#1D4ED8']}
          style={styles.profileHeader}
        >
          <View style={styles.profileInfo}>
            {userProfile.avatarUrl ? (
              <Image
                source={{ uri: userProfile.avatarUrl }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <User size={40} color="#FFFFFF" />
              </View>
            )}
            <Text style={styles.profileName}>{userProfile.name}</Text>
            <Text style={styles.profileBio}>{userProfile.bio}</Text>
            
            {userProfile.userType === 'mentor' && (
              <View style={styles.mentorBadge}>
                <Award size={16} color="#FFFFFF" />
                <Text style={styles.mentorBadgeText}>Mentor</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/profile-edit')}
          >
            <Edit size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {userProfile.userType === 'mentor' ? (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <DollarSign size={20} color="#059669" />
              <Text style={styles.statValue}>₹{stats.totalEarnings.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <MessageCircle size={20} color="#2563EB" />
              <Text style={styles.statValue}>{stats.totalSessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statCard}>
              <Star size={20} color="#F59E0B" />
              <Text style={styles.statValue}>{stats.rating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Wallet size={20} color="#059669" />
              <Text style={styles.statValue}>₹{stats.walletBalance}</Text>
              <Text style={styles.statLabel}>Wallet Balance</Text>
            </View>
            <View style={styles.statCard}>
              <Clock size={20} color="#2563EB" />
              <Text style={styles.statValue}>{stats.totalSessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statCard}>
              <Star size={20} color="#F59E0B" />
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>Given Rating</Text>
            </View>
          </View>
        )}

        <MenuSection title="Account">
          <MenuItem
            icon={<Wallet size={20} color="#059669" />}
            title="My Wallet"
            subtitle={`₹${stats.walletBalance} available`}
            onPress={() => router.push('/wallet')}
          />
          <MenuItem
            icon={<Gift size={20} color="#F59E0B" />}
            title="My Offers"
            subtitle="View and redeem special offers"
            onPress={() => router.push('/offers')}
          />
          <MenuItem
            icon={<CreditCard size={20} color="#7C3AED" />}
            title="Payment Methods"
            subtitle="Manage cards, UPI, bank accounts"
            onPress={() => router.push('/payment-methods')}
          />
          {userProfile.userType === 'mentor' && (
            <>
              <MenuItem
                icon={<TrendingUp size={20} color="#2563EB" />}
                title="Mentor Dashboard"
                subtitle="Manage sessions and availability"
                onPress={() => router.push('/mentor-dashboard')}
              />
              <MenuItem
                icon={<Zap size={20} color="#F59E0B" />}
                title="Availability Settings"
                subtitle="Toggle online status and services"
                onPress={() => router.push('/availability-toggle')}
              />
            </>
          )}
          {userProfile.userType === 'client' && (
            <MenuItem
              icon={<User size={20} color="#2563EB" />}
              title="Client Dashboard"
              subtitle="Quick access to all features"
              onPress={() => router.push('/client-dashboard')}
            />
          )}
          <MenuItem
            icon={<MessageCircle size={20} color="#6B7280" />}
            title="My Sessions"
            subtitle={`${stats.totalSessions} completed`}
            onPress={() => router.push('/my-sessions')}
          />
          <MenuItem
            icon={<Star size={20} color="#F59E0B" />}
            title="Reviews & Ratings"
            subtitle={userProfile.userType === 'mentor' ? `${stats.reviews} reviews` : 'Your reviews'}
            onPress={() => router.push('/reviews')}
          />
        </MenuSection>

        <MenuSection title="Preferences">
          <MenuItem
            icon={<Bell size={20} color="#6B7280" />}
            title="Notifications"
            subtitle="Push notifications, alerts"
            onPress={() => router.push('/notifications')}
          />
          <MenuItem
            icon={<Settings size={20} color="#6B7280" />}
            title="Settings"
            subtitle="Privacy, security, preferences"
            onPress={() => router.push('/settings')}
          />
        </MenuSection>

        <MenuSection title="Support">
          <MenuItem
            icon={<Zap size={20} color="#F59E0B" />}
            title="Quick Actions"
            subtitle="Fast access to common tasks"
            onPress={() => router.push('/quick-actions')}
          />
          <MenuItem
            icon={<HelpCircle size={20} color="#6B7280" />}
            title="Help & Support"
            subtitle="FAQs, contact support"
            onPress={() => router.push('/help-support')}
          />
        </MenuSection>

        <View style={styles.logoutSection}>
          {isLoggingOut ? (
            <View style={styles.logoutLoading}>
              <ActivityIndicator size="small" color="#EF4444" />
              <Text style={styles.logoutLoadingText}>Logging out...</Text>
            </View>
          ) : (
            <MenuItem
              icon={<LogOut size={20} color="#EF4444" />}
              title="Logout"
              onPress={handleLogout}
              showArrow={false}
              color="#EF4444"
            />
          )}
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelLogout}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.logoutButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    position: 'relative',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#BFDBFE',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  mentorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  mentorBadgeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  editButton: {
    position: 'absolute',
    top: 16,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: -20,
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
  statValue: {
    fontSize: 18,
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
  menuSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  menuSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 20,
    color: '#D1D5DB',
    fontFamily: 'Inter-Regular',
  },
  logoutSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  logoutLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  logoutLoadingText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});