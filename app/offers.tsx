import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Gift, Star, Zap, Users, DollarSign, Clock } from 'lucide-react-native';
import { storage, StorageKeys } from '../utils/storage';

interface Offer {
  id: string;
  title: string;
  description: string;
  discount: string;
  icon: React.ReactNode;
  isRedeemed: boolean;
  validUntil?: string;
}

export default function OffersScreen() {
  const [userType, setUserType] = useState<'mentor' | 'client'>('client');

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
    if (profileData) {
      setUserType(profileData.userType);
    }
  };

  const clientOffers: Offer[] = [
    {
      id: '1',
      title: 'Welcome Offer',
      description: 'First 2 minutes of chat FREE with any expert',
      discount: 'FREE',
      icon: <Gift size={28} color="#F59E0B" />,
      isRedeemed: false,
      validUntil: 'Valid for first session only'
    },
    {
      id: '2',
      title: 'Call Starter',
      description: 'Get 1 minute FREE on your first call with an expert',
      discount: 'FREE',
      icon: <Clock size={28} color="#2563EB" />,
      isRedeemed: false,
      validUntil: 'One-time offer'
    },
    {
      id: '3',
      title: 'Referral Bonus',
      description: 'Refer a friend and get ₹100 in wallet when they complete first session',
      discount: '₹100',
      icon: <Users size={28} color="#059669" />,
      isRedeemed: false,
    },
    {
      id: '4',
      title: 'Weekend Special',
      description: '20% OFF on all sessions during weekends',
      discount: '20% OFF',
      icon: <Star size={28} color="#F59E0B" />,
      isRedeemed: false,
      validUntil: 'Valid Sat-Sun only'
    },
    {
      id: '5',
      title: 'Loyalty Reward',
      description: 'Complete 5 sessions and get ₹200 bonus in your wallet',
      discount: '₹200',
      icon: <Zap size={28} color="#8B5CF6" />,
      isRedeemed: false,
    },
  ];

  const mentorOffers: Offer[] = [
    {
      id: '1',
      title: 'Client Magnet',
      description: 'Offer first 2 min chat FREE to attract new clients',
      discount: 'Boost Visibility',
      icon: <Gift size={28} color="#F59E0B" />,
      isRedeemed: false,
    },
    {
      id: '2',
      title: 'Call Promotion',
      description: 'Offer 1 min call FREE to new clients and increase bookings',
      discount: 'More Clients',
      icon: <Clock size={28} color="#2563EB" />,
      isRedeemed: false,
    },
    {
      id: '3',
      title: 'Early Bird Bonus',
      description: 'Earn extra 10% on sessions completed before 10 AM',
      discount: '+10%',
      icon: <Star size={28} color="#F59E0B" />,
      isRedeemed: false,
      validUntil: 'Valid weekdays'
    },
    {
      id: '4',
      title: 'Top Performer',
      description: 'Complete 20 sessions this month and get ₹500 bonus',
      discount: '₹500',
      icon: <Zap size={28} color="#8B5CF6" />,
      isRedeemed: false,
    },
  ];

  const offers = userType === 'client' ? clientOffers : mentorOffers;

  const handleRedeemOffer = (offerId: string) => {
    console.log('Redeeming offer:', offerId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2563EB', '#1D4ED8']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Offers</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.bannerContainer}>
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            style={styles.banner}
          >
            <Gift size={40} color="#F59E0B" />
            <Text style={styles.bannerTitle}>Special Offers Just for You!</Text>
            <Text style={styles.bannerText}>
              {userType === 'client'
                ? 'Save money on sessions with exclusive deals'
                : 'Attract more clients with promotional offers'}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.offersSection}>
          <Text style={styles.sectionTitle}>Available Offers</Text>

          {offers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <View style={styles.offerIconContainer}>
                  {offer.icon}
                </View>
                <View style={styles.offerBadge}>
                  <Text style={styles.offerBadgeText}>{offer.discount}</Text>
                </View>
              </View>

              <Text style={styles.offerTitle}>{offer.title}</Text>
              <Text style={styles.offerDescription}>{offer.description}</Text>

              {offer.validUntil && (
                <Text style={styles.offerValidity}>{offer.validUntil}</Text>
              )}

              {offer.isRedeemed ? (
                <View style={styles.redeemedButton}>
                  <Text style={styles.redeemedText}>Redeemed</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.redeemButton}
                  onPress={() => handleRedeemOffer(offer.id)}
                >
                  <Text style={styles.redeemButtonText}>Redeem Now</Text>
                  <ArrowLeft size={16} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How to Use Offers?</Text>
          <View style={styles.infoSteps}>
            <View style={styles.infoStep}>
              <View style={styles.infoStepNumber}>
                <Text style={styles.infoStepNumberText}>1</Text>
              </View>
              <Text style={styles.infoStepText}>
                {userType === 'client'
                  ? 'Tap "Redeem Now" on any available offer'
                  : 'Enable offer in your mentor settings'}
              </Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.infoStepNumber}>
                <Text style={styles.infoStepNumberText}>2</Text>
              </View>
              <Text style={styles.infoStepText}>
                {userType === 'client'
                  ? 'Select an expert and start your session'
                  : 'Clients will see your promotional offer'}
              </Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.infoStepNumber}>
                <Text style={styles.infoStepNumberText}>3</Text>
              </View>
              <Text style={styles.infoStepText}>
                {userType === 'client'
                  ? 'Discount will be applied automatically'
                  : 'Attract more clients and grow your business'}
              </Text>
            </View>
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
  headerGradient: {
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  bannerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  banner: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FBBF24',
  },
  bannerTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#92400E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  bannerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 20,
  },
  offersSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  offerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  offerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  offerBadgeText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#065F46',
  },
  offerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  offerDescription: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 12,
  },
  offerValidity: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    marginBottom: 16,
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  redeemButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  redeemedButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  redeemedText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  infoSteps: {
    gap: 16,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoStepNumberText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  infoStepText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 22,
    paddingTop: 4,
  },
});
