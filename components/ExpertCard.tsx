import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Star, Clock, Phone, MessageCircle } from 'lucide-react-native';

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

interface ExpertCardProps {
  expert: Expert;
  onPress?: () => void;
  onChat?: () => void;
  onCall?: () => void;
}

export default function ExpertCard({ expert, onPress, onChat, onCall }: ExpertCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Image source={{ uri: expert.image }} style={styles.avatar} />
        <View style={styles.info}>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{expert.name}</Text>
            {expert.isOnline && <View style={styles.onlineIndicator} />}
          </View>
          <Text style={styles.expertise}>{expert.expertise}</Text>
          <View style={styles.stats}>
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
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.chatButton} onPress={onChat}>
          <MessageCircle size={16} color="#2563EB" />
          <Text style={styles.chatButtonText}>₹{expert.chatRate}/min</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.callButton} onPress={onCall}>
          <Phone size={16} color="#059669" />
          <Text style={styles.callButtonText}>₹{expert.callRate}/min</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginRight: 8,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  expertise: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  reviewText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  chatButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  callButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
});