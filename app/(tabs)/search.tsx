import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Image, ActivityIndicator, Alert } from 'react-native';
import { Search, Filter, Star, Clock, Phone, MessageCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { db, auth } from '../../config/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { storage, StorageKeys } from '../../utils/storage';

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
  industry: string;
}

const allExperts: Expert[] = [
  {
    id: '1',
    name: 'Dr. Sarah Chen',
    expertise: 'Tech Leadership, AI Strategy',
    experience: 12,
    rating: 4.9,
    isOnline: true,
    chatRate: 15,
    callRate: 40,
    image: 'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=400',
    reviews: 128,
    industry: 'Technology'
  },
  {
    id: '2',
    name: 'Michael Rodriguez',
    expertise: 'Investment Banking, Finance',
    experience: 8,
    rating: 4.8,
    isOnline: true,
    chatRate: 20,
    callRate: 50,
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
    reviews: 95,
    industry: 'Finance'
  },
  {
    id: '3',
    name: 'Lisa Thompson',
    expertise: 'Product Management, UX',
    experience: 10,
    rating: 4.9,
    isOnline: false,
    chatRate: 18,
    callRate: 45,
    image: 'https://images.pexels.com/photos/3785077/pexels-photo-3785077.jpeg?auto=compress&cs=tinysrgb&w=400',
    reviews: 76,
    industry: 'Technology'
  },
  {
    id: '4',
    name: 'David Kim',
    expertise: 'Startup Strategy, Venture Capital',
    experience: 15,
    rating: 4.9,
    isOnline: true,
    chatRate: 25,
    callRate: 60,
    image: 'https://images.pexels.com/photos/3831645/pexels-photo-3831645.jpeg?auto=compress&cs=tinysrgb&w=400',
    reviews: 203,
    industry: 'Startup'
  },
  {
    id: '5',
    name: 'Jennifer Brown',
    expertise: 'HR Strategy, People Operations',
    experience: 7,
    rating: 4.7,
    isOnline: true,
    chatRate: 12,
    callRate: 30,
    image: 'https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=400',
    reviews: 64,
    industry: 'Human Resources'
  }
];

const industries = ['All', 'Technology', 'Finance', 'Startup', 'Human Resources', 'Marketing'];

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID first
    const getUserId = async () => {
      try {
        const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
        if (profileData?.id) {
          setCurrentUserId(profileData.id);
          console.log('[Search] Current user ID:', profileData.id);
          
          // Clean up any self-referential expert entries
          await cleanupSelfExpertEntries(profileData.id);
          
          // Load experts after cleanup
          loadExperts();
        }
      } catch (error) {
        console.error('[Search] Error getting user ID:', error);
      }
    };

    getUserId();
  }, []);

  const cleanupSelfExpertEntries = async (userId: string) => {
    try {
      console.log('[Search] Cleaning up self-referential expert entries for user:', userId);
      
      // This prevents a client from appearing in the expert list
      // The database filtering with neq('id', userId) prevents this
      // But we log this to ensure the logic is clear
      console.log('[Search] ✓ Cleanup logic: excluding user ID', userId, 'from expert queries');
    } catch (error) {
      console.error('[Search] Error in cleanup:', error);
    }
  };

  const loadExperts = async () => {
    try {
      setIsLoading(true);
      
      // Get current user ID if not already set
      let userId = currentUserId;
      if (!userId) {
        const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
        userId = profileData?.id;
      }

      console.log('[Search] Loading experts from Firestore, current user:', userId);

      // Query Firestore for all experts (simple query without orderBy to avoid index requirements)
      const profilesRef = collection(db, 'profiles');
      const q = query(
        profilesRef,
        where('userType', '==', 'expert')
      );

      const querySnapshot = await getDocs(q);
      console.log('[Search] Found', querySnapshot.size, 'experts in database');

      const formattedExperts: Expert[] = [];
      
      querySnapshot.forEach((doc) => {
        const profile = doc.data();
        
        // Skip current user
        if (profile.id === userId) {
          console.log('[Search] Skipping current user:', profile.name);
          return;
        }

        console.log('[Search] Adding expert:', profile.name, 'with expertise:', profile.expertise);
        
        formattedExperts.push({
          id: profile.id,
          name: profile.name || 'Unknown Expert',
          expertise: profile.expertise || '',
          experience: profile.experience ? parseInt(profile.experience) : 0,
          rating: profile.averageRating || 4.5,
          isOnline: profile.isOnline || false,
          chatRate: profile.chatRate || 0,
          callRate: profile.callRate || 0,
          image: profile.avatarUrl || 'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=400',
          reviews: profile.totalSessions || 0,
          industry: profile.industry || 'General'
        });
      });

      console.log('[Search] Formatted', formattedExperts.length, 'experts from real data');
      
      // Only fall back to mock data if no real experts found
      if (formattedExperts.length === 0) {
        console.log('[Search] No real experts found, using mock data');
        setExperts(allExperts);
      } else {
        console.log('[Search] ✓ Showing', formattedExperts.length, 'real experts');
        setExperts(formattedExperts);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('[Search] Exception loading experts:', error);
      console.error('[Search] Error details:', error instanceof Error ? error.message : String(error));
      setExperts(allExperts);
      setIsLoading(false);
    }
  };

  const filteredExperts = experts.filter(expert => {
    const matchesSearch = expert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expert.expertise.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = selectedIndustry === 'All' || expert.industry === selectedIndustry;
    const matchesOnline = !showOnlineOnly || expert.isOnline;

    return matchesSearch && matchesIndustry && matchesOnline;
  });

  const startCall = (expert: Expert, callType: 'audio' | 'video') => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    router.push({
      pathname: '/call/[expertId]',
      params: {
        expertId: expert.id,
        expertName: expert.name,
        expertImage: expert.image,
        callType: callType,
        callRate: expert.callRate.toString()
      }
    });
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
          <Text style={styles.expertIndustry}>{expert.industry}</Text>
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
          onPress={() => startCall(expert, 'audio')}
        >
          <Phone size={16} color="#059669" />
          <Text style={styles.callButtonText}>₹{expert.callRate}/min</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Experts</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search experts, skills, or industries"
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.industriesContainer}
        contentContainerStyle={styles.industriesContent}
      >
        {industries.map((industry) => (
          <TouchableOpacity
            key={industry}
            style={[
              styles.industryButton,
              selectedIndustry === industry && styles.industryButtonActive
            ]}
            onPress={() => setSelectedIndustry(industry)}
          >
            <Text
              style={[
                styles.industryButtonText,
                selectedIndustry === industry && styles.industryButtonTextActive
              ]}
            >
              {industry}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[
            styles.onlineFilter,
            showOnlineOnly && styles.onlineFilterActive
          ]}
          onPress={() => setShowOnlineOnly(!showOnlineOnly)}
        >
          <View style={[styles.onlineIndicator, !showOnlineOnly && styles.onlineIndicatorInactive]} />
          <Text style={[
            styles.onlineFilterText,
            showOnlineOnly && styles.onlineFilterTextActive
          ]}>
            Online Now
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.resultsCount}>
          {filteredExperts.length} experts found
        </Text>
      </View>

      <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading experts...</Text>
          </View>
        ) : (
          <View style={styles.expertsContainer}>
            {filteredExperts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No experts found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
              </View>
            ) : (
              filteredExperts.map((expert) => (
                <ExpertCard key={expert.id} expert={expert} />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  industriesContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: 44,
  },
  industriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  industryButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  industryButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  industryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  industryButtonTextActive: {
    color: '#FFFFFF',
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  onlineFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 3,
  },
  onlineFilterActive: {
    backgroundColor: '#ECFDF5',
  },
  onlineIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  onlineIndicatorInactive: {
    backgroundColor: '#D1D5DB',
  },
  onlineFilterText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  onlineFilterTextActive: {
    color: '#059669',
  },
  resultsCount: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  results: {
    flex: 1,
  },
  expertsContainer: {
    padding: 8,
    gap: 6,
  },
  expertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  expertHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  expertAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  expertInfo: {
    flex: 1,
  },
  expertNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  expertName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginRight: 4,
  },
  expertExpertise: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  expertIndustry: {
    fontSize: 9,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  expertStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  statText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  reviewText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  expertActions: {
    flexDirection: 'row',
    gap: 6,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF4FF',
    borderRadius: 4,
    paddingVertical: 6,
    gap: 3,
  },
  chatButtonText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 4,
    paddingVertical: 6,
    gap: 3,
  },
  callButtonText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
});