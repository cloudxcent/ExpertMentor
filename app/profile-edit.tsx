import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Image, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Save, Camera } from 'lucide-react-native';
import { storage, StorageKeys } from '../utils/storage';
import { db, auth } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  bio: string;
  userType: 'expert' | 'client';
  experience?: string;
  expertise?: string;
  industry?: string;
  chatRate?: number;
  callRate?: number;
  avatarUrl?: string;
}

export default function ProfileEditScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [expertise, setExpertise] = useState('');
  const [industry, setIndustry] = useState('');
  const [chatRate, setChatRate] = useState('');
  const [callRate, setCallRate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await storage.getItem(StorageKeys.USER_PROFILE);
      if (profileData) {
        setProfile(profileData);
        setName(profileData.name || '');
        setBio(profileData.bio || '');
        setExperience(profileData.experience || '');
        setExpertise(profileData.expertise || '');
        setIndustry(profileData.industry || '');
        setChatRate(profileData.chatRate?.toString() || '');
        setCallRate(profileData.callRate?.toString() || '');
        setAvatarUrl(profileData.avatarUrl || '');
      }
    } catch (error) {
      console.log('Error loading profile:', error);
    }
  };

  const pickImage = async () => {
    if (!profile) {
      Alert.alert('Error', 'Profile not found');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6, // Reduced quality for smaller file size
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        const imageUri = result.assets[0].uri;
        console.log('[Profile] 📡 Image selected:', imageUri);
        
        // For web compatibility, convert to base64 data URL
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        console.log('[Profile] Original blob size:', blob.size, 'bytes');
        
        // Create a promise-based FileReader
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
        console.log('[Profile] ✅ Image converted to base64');
        console.log('[Profile] Base64 size:', base64String.length, 'characters');
        
        // Check if size is reasonable (should be < 500KB as base64)
        if (base64String.length > 500000) {
          Alert.alert('Image Too Large', 'Please choose a smaller image');
          setUploading(false);
          return;
        }
        
        // Store the base64 data URL directly
        setAvatarUrl(base64String);
        
        console.log('[Profile] 📋 Avatar ready to save');
        
      } catch (error: any) {
        console.error('[Profile] ❌ Error processing image:', error);
        Alert.alert('Error', 'Failed to process image');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (profile?.userType === 'expert') {
      if (!expertise.trim()) {
        Alert.alert('Error', 'Please enter your expertise');
        return;
      }
      if (!experience.trim()) {
        Alert.alert('Error', 'Please enter your experience');
        return;
      }
      if (!chatRate || parseFloat(chatRate) <= 0) {
        Alert.alert('Error', 'Please enter a valid chat rate');
        return;
      }
      if (!callRate || parseFloat(callRate) <= 0) {
        Alert.alert('Error', 'Please enter a valid call rate');
        return;
      }
    }

    setIsSaving(true);

    try {
      if (!profile) {
        Alert.alert('Error', 'Profile not found');
        return;
      }

      console.log('[Profile] Saving profile to Firestore...');

      const updateData: any = {
        name: name.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl || null,
        updatedAt: new Date().toISOString()
      };

      if (profile.userType === 'expert') {
        updateData.expertise = expertise.trim();
        updateData.experience = experience.trim();
        updateData.industry = industry.trim();
        updateData.chatRate = parseFloat(chatRate);
        updateData.callRate = parseFloat(callRate);
      }

      // Update Firestore
      const profileRef = doc(db, 'profiles', profile.id);
      await updateDoc(profileRef, updateData);
      
      console.log('[Profile] ✓ Firestore updated');

      // Update local storage
      const updatedProfileData = {
        ...profile,
        name: name.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl,
        ...(profile.userType === 'expert' && {
          expertise: expertise.trim(),
          experience: experience.trim(),
          industry: industry.trim(),
          chatRate: parseFloat(chatRate),
          callRate: parseFloat(callRate),
        })
      };

      await storage.setItem(StorageKeys.USER_PROFILE, updatedProfileData);
      console.log('[Profile] ✓ Local storage updated');

      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (error: any) {
      console.error('[Profile] ✗ Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {avatarUrl && !avatarUrl.startsWith('blob:') ? (
              <Image 
                source={{ uri: avatarUrl }} 
                style={styles.avatarImage}
                onError={(error) => console.log('[Profile] Image load error:', error.nativeEvent.error)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.placeholderText}>No Photo</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.changePhotoButton}
            onPress={pickImage}
          >
            <Camera size={18} color="#FFFFFF" />
            <Text style={styles.changePhotoText}>Tap to change photo</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Fields */}
        <View style={styles.formSection}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#D1D5DB"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Tell us about yourself"
              value={bio}
              onChangeText={setBio}
              placeholderTextColor="#D1D5DB"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {profile.userType === 'expert' && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Expertise *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your expertise (e.g., Business, Marketing)"
                  value={expertise}
                  onChangeText={setExpertise}
                  placeholderTextColor="#D1D5DB"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Experience *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Years of experience or description"
                  value={experience}
                  onChangeText={setExperience}
                  placeholderTextColor="#D1D5DB"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Industry</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your industry"
                  value={industry}
                  onChangeText={setIndustry}
                  placeholderTextColor="#D1D5DB"
                />
              </View>

              <View style={styles.ratesContainer}>
                <View style={[styles.fieldGroup, styles.rateField]}>
                  <Text style={styles.label}>Chat Rate (₹/min) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={chatRate}
                    onChangeText={setChatRate}
                    placeholderTextColor="#D1D5DB"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.fieldGroup, styles.rateField]}>
                  <Text style={styles.label}>Call Rate (₹/min) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={callRate}
                    onChangeText={setCallRate}
                    placeholderTextColor="#D1D5DB"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  content: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280'
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 16
  },
  avatarContainer: {
    marginBottom: 16
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB'
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 12
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  changePhotoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500'
  },
  formSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16
  },
  fieldGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB'
  },
  bioInput: {
    height: 100
  },
  ratesContainer: {
    flexDirection: 'row',
    gap: 12
  },
  rateField: {
    flex: 1,
    marginBottom: 0
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  buttonDisabled: {
    opacity: 0.6
  }
});
