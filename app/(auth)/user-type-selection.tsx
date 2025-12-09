import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { User, Briefcase, CheckCircle } from 'lucide-react-native';

export default function UserTypeSelection() {
  const [selectedType, setSelectedType] = useState<'client' | 'expert' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedType) return;

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      router.replace({
        pathname: '/(auth)/profile-setup',
        params: { userType: selectedType }
      });
    }, 500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#EBF4FF', '#FFFFFF']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Mentorxity</Text>
            <Text style={styles.subtitle}>
              How would you like to use the platform?
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedType === 'client' && styles.optionCardSelected
              ]}
              onPress={() => setSelectedType('client')}
              activeOpacity={0.7}
            >
              <View style={styles.optionIconContainer}>
                <User size={40} color={selectedType === 'client' ? '#2563EB' : '#6B7280'} />
              </View>
              <Text style={[
                styles.optionTitle,
                selectedType === 'client' && styles.optionTitleSelected
              ]}>
                I Need Advice
              </Text>
              <Text style={styles.optionDescription}>
                Connect with industry experts and get professional guidance
              </Text>
              {selectedType === 'client' && (
                <View style={styles.checkMark}>
                  <CheckCircle size={24} color="#2563EB" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedType === 'expert' && styles.optionCardSelected
              ]}
              onPress={() => setSelectedType('expert')}
              activeOpacity={0.7}
            >
              <View style={styles.optionIconContainer}>
                <Briefcase size={40} color={selectedType === 'expert' ? '#2563EB' : '#6B7280'} />
              </View>
              <Text style={[
                styles.optionTitle,
                selectedType === 'expert' && styles.optionTitleSelected
              ]}>
                I'm an Expert
              </Text>
              <Text style={styles.optionDescription}>
                Share your expertise and help others while earning
              </Text>
              {selectedType === 'expert' && (
                <View style={styles.checkMark}>
                  <CheckCircle size={24} color="#2563EB" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedType && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!selectedType || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 20,
    marginBottom: 32,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EBF4FF',
  },
  optionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  optionTitleSelected: {
    color: '#2563EB',
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  checkMark: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  continueButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
