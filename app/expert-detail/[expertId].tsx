import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Image, Alert, ActivityIndicator, Share as RNShare, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, Clock, MessageCircle, Phone, Video, Heart, Share, MapPin, Award, Users, Copy, Mail } from 'lucide-react-native';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { storage, StorageKeys } from '../../utils/storage';

interface Expert {
  id: string;
  name: string;
  expertise: string;
  experience: string;
  rating?: number;
  isOnline: boolean;
  chatRate: number;
  callRate: number;
  avatarUrl?: string;
  bio: string;
  email: string;
  userType?: string;
}

export default function ExpertDetailScreen() {
  const { expertId } = useLocalSearchParams();
  const [expert, setExpert] = useState<Expert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    loadExpert();
  }, [expertId]);

  const loadExpert = async () => {
    try {
      setIsLoading(true);
      
      // Get current user ID
      const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
      const currentUserId = profileData?.id;
      
      // Prevent users from viewing their own profile as an expert
      if (currentUserId === expertId) {
        console.warn('[ExpertDetail] User tried to view their own profile as expert');
        Alert.alert('Error', 'You cannot view your own profile in the expert directory');
        router.back();
        return;
      }
      
      console.log('[ExpertDetail] Loading expert:', expertId);
      
      const expertRef = doc(db, 'profiles', expertId as string);
      const docSnap = await getDoc(expertRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Verify this is an expert profile
        if (data.userType !== 'expert') {
          console.warn('[ExpertDetail] Profile is not marked as expert');
          Alert.alert('Error', 'This profile is not an expert profile');
          router.back();
          return;
        }
        
        const expertData: Expert = {
          id: data.id,
          name: data.name || 'Unknown Expert',
          expertise: data.expertise || '',
          experience: data.experience || '',
          rating: data.averageRating || 4.5,
          isOnline: data.isOnline || false,
          chatRate: data.chatRate || 0,
          callRate: data.callRate || 0,
          avatarUrl: data.avatarUrl,
          bio: data.bio || '',
          email: data.email || '',
          userType: data.userType
        };
        
        setExpert(expertData);
        console.log('[ExpertDetail] ✓ Loaded expert:', expertData.name);
      } else {
        console.error('[ExpertDetail] Expert not found in Firestore');
        Alert.alert('Error', 'Expert not found');
        router.back();
      }
    } catch (err) {
      console.error('[ExpertDetail] Error loading expert:', err);
      console.error('[ExpertDetail] Error details:', err instanceof Error ? err.message : String(err));
      Alert.alert('Error', 'Something went wrong loading expert details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = () => {
    if (!expert) return;

    router.push({
      pathname: '/chat/[expertId]',
      params: {
        expertId: expert.id,
        expertName: expert.name,
        expertImage: expert.avatarUrl || '',
        chatRate: expert.chatRate.toString()
      }
    });
  };

  const handleStartCall = (type: 'audio' | 'video') => {
    if (!expert) return;

    Alert.alert(
      'Start Call',
      `Start ${type} call with ${expert.name}? Rate: ₹${expert.callRate}/min`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Call',
          onPress: () => {
            router.push({
              pathname: '/call/[expertId]',
              params: {
                expertId: expert.id,
                expertName: expert.name,
                expertImage: expert.avatarUrl || '',
                callType: type,
                callRate: expert.callRate.toString()
              }
            });
          }
        }
      ]
    );
  };

  const handleShareProfile = () => {
    if (!expert) return;

    Alert.alert(
      'Share Profile',
      `Share ${expert.name}'s profile`,
      [
        {
          text: 'Copy Link',
          onPress: () => copyProfileLink()
        },
        {
          text: 'WhatsApp',
          onPress: () => shareViaWhatsApp()
        },
        {
          text: 'Email',
          onPress: () => shareViaEmail()
        },
        {
          text: 'More Options',
          onPress: () => shareViaSystem()
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const copyProfileLink = async () => {
    if (!expert) return;
    const profileUrl = `https://expertmentor.app/expert/${expert.id}`;

    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(profileUrl);
        Alert.alert('Success', 'Profile link copied to clipboard!');
      } catch (error) {
        Alert.alert('Error', 'Failed to copy link');
      }
    } else {
      Alert.alert('Info', `Profile link: ${profileUrl}\\n\\nLong press to copy.`);
    }
  };

  const shareViaWhatsApp = async () => {
    if (!expert) return;
    const profileUrl = `https://expertmentor.app/expert/${expert.id}`;
    const message = `Check out ${expert.name}'s profile on ExpertMentor!\n${expert.expertise}\n\n${profileUrl}`;
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed on your device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open WhatsApp');
    }
  };

  const shareViaEmail = async () => {
    if (!expert) return;
    const profileUrl = `https://expertmentor.app/expert/${expert.id}`;
    const subject = `Check out ${expert.name} on ExpertMentor`;
    const body = `I found this expert on ExpertMentor who might interest you:\n\n${expert.name}\n${expert.expertise}\n${expert.bio}\n\nView profile: ${profileUrl}`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      await Linking.openURL(emailUrl);
    } catch (error) {
      Alert.alert('Error', 'Failed to open email client');
    }
  };

  const shareViaSystem = async () => {
    if (!expert) return;
    const profileUrl = `https://expertmentor.app/expert/${expert.id}`;
    const message = `Check out ${expert.name}'s profile on ExpertMentor!\n${expert.expertise}\n\n${profileUrl}`;

    try {
      await RNShare.share({
        message: message,
        title: `${expert.name} - ExpertMentor`
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!expert) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Expert not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#EFF6FF', '#FFFFFF']}
        style={styles.gradient}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="#1F2937" />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setIsFavorited(!isFavorited)}
              >
                <Heart
                  size={24}
                  color={isFavorited ? "#EF4444" : "#1F2937"}
                  fill={isFavorited ? "#EF4444" : "none"}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleShareProfile}>
                <Share size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.imageContainer}>
              <Image
                source={{
                  uri: expert.avatarUrl || 'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=400'
                }}
                style={styles.profileImage}
              />
              {expert.isOnline && (
                <View style={styles.onlineBadge}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Online</Text>
                </View>
              )}
            </View>

            <Text style={styles.name}>{expert.name}</Text>
            <Text style={styles.expertise}>{expert.expertise || 'Expert Consultant'}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Star size={16} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.statValue}>{expert.rating || 4.8}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statItem}>
                <Users size={16} color="#2563EB" />
                <Text style={styles.statValue}>{expert.experience || '5+'}</Text>
                <Text style={styles.statLabel}>Years Exp</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statItem}>
                <Clock size={16} color="#10B981" />
                <Text style={styles.statValue}>{'< 5 min'}</Text>
                <Text style={styles.statLabel}>Response</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>
              {expert.bio || 'Experienced professional ready to help you achieve your goals.'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services & Rates</Text>

            <View style={styles.serviceCard}>
              <View style={styles.serviceIconContainer}>
                <MessageCircle size={24} color="#2563EB" />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>Chat Consultation</Text>
                <Text style={styles.serviceDescription}>Text-based messaging</Text>
              </View>
              <View style={styles.serviceRate}>
                <Text style={styles.rateAmount}>₹{expert.chatRate}</Text>
                <Text style={styles.rateUnit}>/min</Text>
              </View>
            </View>

            <View style={styles.serviceCard}>
              <View style={styles.serviceIconContainer}>
                <Phone size={24} color="#10B981" />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>Voice Call</Text>
                <Text style={styles.serviceDescription}>Audio consultation</Text>
              </View>
              <View style={styles.serviceRate}>
                <Text style={styles.rateAmount}>₹{expert.callRate}</Text>
                <Text style={styles.rateUnit}>/min</Text>
              </View>
            </View>

            <View style={styles.serviceCard}>
              <View style={styles.serviceIconContainer}>
                <Video size={24} color="#8B5CF6" />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>Video Call</Text>
                <Text style={styles.serviceDescription}>Face-to-face consultation</Text>
              </View>
              <View style={styles.serviceRate}>
                <Text style={styles.rateAmount}>₹{expert.callRate}</Text>
                <Text style={styles.rateUnit}>/min</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleStartChat}
          >
            <MessageCircle size={20} color="#2563EB" />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleStartCall('audio')}
          >
            <Phone size={20} color="#FFFFFF" />
            <Text style={styles.callButtonText}>Call Now</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  onlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  expertise: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  serviceDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  serviceRate: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rateAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  rateUnit: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 2,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
