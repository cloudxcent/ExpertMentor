import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { User, Briefcase, DollarSign, Tag, ArrowRight, MessageCircle, Phone } from 'lucide-react-native';
import { auth, db } from '../../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface ProfileData {
  name: string;
  bio: string;
  experience: string;
  expertise: string;
  chatRate: string;
  callRate: string;
  userType: 'expert' | 'client';
}

export default function ProfileSetupScreen() {
  const params = useLocalSearchParams();
  const userType = (params.userType as 'expert' | 'client') || 'client';

  const [formData, setFormData] = useState<ProfileData>({
    name: '',
    bio: '',
    experience: '',
    expertise: '',
    chatRate: '',
    callRate: '',
    userType: userType
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Please enter your full name');
      return false;
    }

    if (!formData.bio.trim()) {
      setError('Please enter your bio');
      return false;
    }

    if (formData.userType === 'expert') {
      if (!formData.experience.trim()) {
        setError('Please enter your years of experience');
        return false;
      }

      if (!formData.expertise.trim()) {
        setError('Please enter your areas of expertise');
        return false;
      }

      if (!formData.chatRate || isNaN(Number(formData.chatRate))) {
        setError('Please enter a valid chat rate');
        return false;
      }

      if (!formData.callRate || isNaN(Number(formData.callRate))) {
        setError('Please enter a valid call rate');
        return false;
      }
    }

    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated. Please log in again.');
        setIsLoading(false);
        router.replace('/(auth)/login');
        return;
      }

      console.log('[ProfileSetup] Saving profile for user:', user.uid);

      const profilePayload = {
        id: user.uid,
        name: formData.name,
        bio: formData.bio,
        email: user.email || '',
        userType: formData.userType,
        experience: formData.experience || null,
        expertise: formData.expertise || null,
        chatRate: formData.chatRate ? Number(formData.chatRate) : 0,
        callRate: formData.callRate ? Number(formData.callRate) : 0,
        isOnline: true,
        updatedAt: new Date().toISOString()
      };

      // Check if profile exists
      const docRef = doc(db, 'profiles', user.uid);
      const docSnap = await getDoc(docRef);

      console.log('[ProfileSetup] Profile exists:', docSnap.exists());

      // Save profile to Firestore
      await setDoc(docRef, profilePayload);

      console.log('[ProfileSetup] Profile saved successfully');

      // Data will be retrieved via real-time listeners in appInitialization.ts
      // No need to store in localStorage - Firestore handles everything

      setIsLoading(false);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Profile save error:', err);
      setIsLoading(false);
      setError('Failed to save profile. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#EBF4FF', '#FFFFFF']}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Complete Your Profile</Text>
              <Text style={styles.subtitle}>
                {userType === 'expert'
                  ? 'Share your expertise and help others'
                  : 'Tell us about yourself'}
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <View style={styles.inputContainer}>
                  <User size={20} color="#6B7280" />
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => {
                      setFormData({ ...formData, name: text });
                      setError('');
                    }}
                    placeholder="Enter your full name"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bio *</Text>
                <TextInput
                  style={styles.textArea}
                  value={formData.bio}
                  onChangeText={(text) => {
                    setFormData({ ...formData, bio: text });
                    setError('');
                  }}
                  placeholder={
                    userType === 'expert'
                      ? 'Tell clients about your background and experience...'
                      : 'Tell experts what you\'re looking for...'
                  }
                  multiline
                  numberOfLines={4}
                />
              </View>

              {userType === 'expert' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Years of Experience *</Text>
                    <View style={styles.inputContainer}>
                      <Briefcase size={20} color="#6B7280" />
                      <TextInput
                        style={styles.input}
                        value={formData.experience}
                        onChangeText={(text) => {
                          setFormData({ ...formData, experience: text });
                          setError('');
                        }}
                        placeholder="e.g., 5"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Areas of Expertise *</Text>
                    <View style={styles.inputContainer}>
                      <Tag size={20} color="#6B7280" />
                      <TextInput
                        style={styles.input}
                        value={formData.expertise}
                        onChangeText={(text) => {
                          setFormData({ ...formData, expertise: text });
                          setError('');
                        }}
                        placeholder="e.g., Software Development, Product Management"
                      />
                    </View>
                  </View>

                  <View style={styles.ratesSection}>
                    <Text style={styles.ratesSectionTitle}>Set Your Rates</Text>
                    <View style={styles.ratesContainer}>
                      <View style={styles.rateInput}>
                        <Text style={styles.label}>Chat Rate *</Text>
                        <View style={styles.inputContainer}>
                          <MessageCircle size={18} color="#6B7280" />
                          <Text style={styles.currencySymbol}>₹</Text>
                          <TextInput
                            style={styles.input}
                            value={formData.chatRate}
                            onChangeText={(text) => {
                              setFormData({ ...formData, chatRate: text });
                              setError('');
                            }}
                            placeholder="15"
                            keyboardType="numeric"
                          />
                          <Text style={styles.rateUnit}>/min</Text>
                        </View>
                      </View>

                      <View style={styles.rateInput}>
                        <Text style={styles.label}>Call Rate *</Text>
                        <View style={styles.inputContainer}>
                          <Phone size={18} color="#6B7280" />
                          <Text style={styles.currencySymbol}>₹</Text>
                          <TextInput
                            style={styles.input}
                            value={formData.callRate}
                            onChangeText={(text) => {
                              setFormData({ ...formData, callRate: text });
                              setError('');
                            }}
                            placeholder="40"
                            keyboardType="numeric"
                          />
                          <Text style={styles.rateUnit}>/min</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </>
              )}

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSaveProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Complete Setup</Text>
                    <ArrowRight size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    textAlignVertical: 'top',
    minHeight: 120,
  },
  ratesSection: {
    marginTop: 8,
  },
  ratesSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  ratesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  rateInput: {
    flex: 1,
    gap: 8,
  },
  currencySymbol: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  rateUnit: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 8,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
