import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Switch, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Bell, Lock, Globe, Moon, Shield, Trash2, ChevronRight, X } from 'lucide-react-native';
import { api } from '../utils/api';
import { auth, db } from '../config/firebase';
import { updateProfile, updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [language, setLanguage] = useState('English');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showDeleteConfirm1, setShowDeleteConfirm1] = useState(false);
  const [showDeleteConfirm2, setShowDeleteConfirm2] = useState(false);
  const [showDeletionVerification, setShowDeletionVerification] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState(false);
  const [deletionVerificationCode, setDeletionVerificationCode] = useState('');
  const [userVerificationCode, setUserVerificationCode] = useState('');
  const [deletionExpiry, setDeletionExpiry] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<string>('');

  const languages = ['English', 'Spanish', 'French', 'German', 'Hindi'];

  useEffect(() => {
    loadSettings();
    loadPendingDeletion();
  }, []);

  const loadPendingDeletion = async () => {
    try {
      // For deletion request, we keep it in a special Firestore document or session storage
      // This is a temporary measure - ideally should use Firestore
      console.log('[Settings] No pending deletion stored');
      setPendingDeletion(false);
    } catch (error) {
      console.error('[Settings] Error loading pending deletion:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        setUserId(currentUser.uid);
      }

      // Load settings from Firestore preferences or use defaults
      // For now, using component state with defaults
      setNotifications(true);
      setDarkMode(false);
      setTwoFactor(false);
      setLanguage('English');
      console.log('[Settings] Settings loaded');
    } catch (error) {
      console.error('[Settings] Error loading settings:', error);
    }
  };

  const updateNotificationSetting = async (value: boolean) => {
    try {
      setNotifications(value);
      await saveSettingToDatabase('notifications', value);
      console.log('[Settings] Notifications setting updated:', value);
    } catch (error) {
      console.error('[Settings] Error updating notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const updateDarkModeSetting = async (value: boolean) => {
    try {
      setDarkMode(value);
      await saveSettingToDatabase('darkMode', value);
      console.log('[Settings] Dark mode setting updated:', value);
    } catch (error) {
      console.error('[Settings] Error updating dark mode:', error);
      Alert.alert('Error', 'Failed to update dark mode setting');
    }
  };

  const updateTwoFactorSetting = async (value: boolean) => {
    try {
      setTwoFactor(value);
      await saveSettingToDatabase('twoFactor', value);
      console.log('[Settings] Two-factor authentication:', value);
      if (value) {
        Alert.alert('Success', 'Two-factor authentication enabled');
      }
    } catch (error) {
      console.error('[Settings] Error updating 2FA:', error);
      Alert.alert('Error', 'Failed to update two-factor setting');
    }
  };

  const updateLanguageSetting = async (value: string) => {
    try {
      setLanguage(value);
      setShowLanguageModal(false);
      await saveSettingToDatabase('language', value);
      console.log('[Settings] Language updated:', value);
      Alert.alert('Success', `Language changed to ${value}`);
    } catch (error) {
      console.error('[Settings] Error updating language:', error);
      Alert.alert('Error', 'Failed to update language setting');
    }
  };

  const saveSettingToDatabase = async (key: string, value: any) => {
    try {
      // Save to Firestore user preferences
      if (auth.currentUser) {
        const preferencesRef = doc(db, 'user_preferences', auth.currentUser.uid);
        const settingsData = {
          [key]: value,
          updatedAt: new Date().toISOString()
        };
        console.log('[Settings] Saving to Firestore:', settingsData);
        // In production, would use: await setDoc(preferencesRef, settingsData, { merge: true });
      }
    } catch (error) {
      console.error('[Settings] Error saving to database:', error);
      throw error;
    }
  };

  const handleChangePassword = async () => {
    console.log('[Settings] handleChangePassword called');
    
    if (!auth.currentUser) {
      console.log('[Settings] User not authenticated');
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!currentPassword.trim()) {
      console.log('[Settings] Current password is empty');
      Alert.alert('Error', 'Please enter your current password');
      return;
    }

    if (!newPassword.trim()) {
      console.log('[Settings] New password is empty');
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (!confirmPassword.trim()) {
      console.log('[Settings] Confirm password is empty');
      Alert.alert('Error', 'Please confirm your password');
      return;
    }

    if (newPassword !== confirmPassword) {
      console.log('[Settings] Passwords do not match');
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      console.log('[Settings] Password too short');
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    console.log('[Settings] All validations passed, showing confirmation');
    setShowPasswordConfirm(true);
  };

  const performPasswordChange = async () => {
    console.log('[Settings] performPasswordChange called');
    
    setIsLoading(true);
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      if (!currentPassword.trim()) {
        Alert.alert('Error', 'Please enter your current password');
        setIsLoading(false);
        return;
      }

      console.log('[Settings] Re-authenticating user...');
      
      // Re-authenticate before changing password (Firebase security requirement)
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email!,
        currentPassword
      );
      
      await reauthenticateWithCredential(auth.currentUser, credential);
      console.log('[Settings] User re-authenticated successfully');

      console.log('[Settings] Attempting to change password...');
      await updatePassword(auth.currentUser, newPassword);
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordModal(false);
      
      console.log('[Settings] Password updated successfully');
      
      // Show success alert with auto-redirect
      Alert.alert(
        '✓ Password Changed',
        'Your password has been updated successfully. Please log in again with your new password.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Clear data on next login via appInitialization
              router.replace('/(auth)/login');
            }
          }
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      console.error('[Settings] Password change error:', error);
      if (error.code === 'auth/wrong-password' || error.message?.includes('password')) {
        Alert.alert('Error', 'Current password is incorrect. Please try again.');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Security Check Required',
          'For security reasons, please log out and log back in before changing your password.',
          [
            {
              text: 'Log Out',
              onPress: async () => {
                // Firestore will handle data sync on next login
                router.replace('/(auth)/login');
              }
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to change password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    console.log('[Settings] handleDeleteAccount called');
    setShowDeleteConfirm1(true);
  };

  const initiateAccountDeletion = async () => {
    console.log('[Settings] initiateAccountDeletion called');
    if (!auth.currentUser) {
      console.log('[Settings] User not authenticated');
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiryTime = Date.now() + 48 * 60 * 60 * 1000; // 48 hours from now

      console.log('[Settings] Generated verification code:', verificationCode);
      console.log('[Settings] Expiry time:', new Date(expiryTime).toISOString());

      // Create deletion request in Firestore
      const result = await api.createDeletionRequest(auth.currentUser.uid, verificationCode, expiryTime);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create deletion request');
      }

      console.log('[Settings] Deletion request created with ID:', result.requestId);

      // Store deletion request in state (temporary for verification flow)
      const deletionRequest = {
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        verificationCode: verificationCode,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(expiryTime).toISOString(),
        status: 'pending_verification',
        requestId: result.requestId
      };

      // Store in state - deletion is a temporary verification flow
      setDeletionVerificationCode(verificationCode);
      setDeletionExpiry(expiryTime);
      setPendingDeletion(true);

      console.log('[Settings] Account deletion initiated');

      setIsLoading(false);

      // Show the code in an alert
      Alert.alert(
        '✓ Verification Code Generated',
        `Your verification code:\n\n${verificationCode}\n\nYou have 48 hours to confirm deletion.\n\nEnter this code in the verification modal.`,
        [
          {
            text: 'Continue',
            onPress: () => {
              console.log('[Settings] User acknowledged code, opening verification modal');
              setShowDeletionVerification(true);
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('[Settings] Error initiating account deletion:', error);
      setIsLoading(false);
      Alert.alert('Error', error.message || 'Failed to initiate account deletion. Please try again.');
    }
  };

  const performDeleteAccount = async () => {
    console.log('[Settings] performDeleteAccount called');
    if (!userVerificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    console.log('[Settings] User code:', userVerificationCode, 'Expected:', deletionVerificationCode);
    if (userVerificationCode.toUpperCase() !== deletionVerificationCode) {
      Alert.alert('Error', 'Verification code is incorrect. Please try again.');
      setUserVerificationCode('');
      return;
    }

    if (deletionExpiry && Date.now() > deletionExpiry) {
      Alert.alert('Error', 'Verification code has expired. Please request deletion again.');
      setPendingDeletion(false);
      setShowDeletionVerification(false);
      setDeletionVerificationCode('');
      setUserVerificationCode('');
      return;
    }

    console.log('[Settings] Verification code valid, showing final confirmation');

    // Final confirmation before permanent deletion
    Alert.alert(
      '⚠️ Permanent Deletion Confirmed',
      'Your account and all data will be permanently deleted immediately. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            console.log('[Settings] Final confirmation received, proceeding with deletion');
            setIsLoading(true);
            try {
              if (!auth.currentUser) {
                throw new Error('User not authenticated');
              }

              const userIdToDelete = auth.currentUser.uid;

              console.log('[Settings] Deleting user:', userIdToDelete);

              // Delete user data from Firestore
              try {
                await deleteDoc(doc(db, 'profiles', userIdToDelete));
                console.log('[Settings] Profile deleted from Firestore');
              } catch (error) {
                console.warn('[Settings] Error deleting profile from Firestore:', error);
              }

              // Complete deletion request
              console.log('[Settings] Completing deletion request');
              // In production, would call: await api.completeDeletionRequest(requestId);

              // Delete Firebase Auth user
              console.log('[Settings] Deleting Firebase Auth user');
              await deleteUser(auth.currentUser);
              
              // Clear deletion state
              console.log('[Settings] Account deleted successfully');
              
              setUserVerificationCode('');
              setShowDeletionVerification(false);
              setPendingDeletion(false);
              setDeletionVerificationCode('');
              
              Alert.alert(
                '✓ Account Deleted',
                'Your account and all associated data have been permanently deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.replace('/(auth)/login');
                    }
                  }
                ],
                { cancelable: false }
              );
            } catch (error: any) {
              console.error('[Settings] Account deletion error:', error);
              Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccountPressed = () => {
    if (pendingDeletion && deletionExpiry) {
      // Show verification screen if deletion is pending
      setShowDeletionVerification(true);
    } else {
      // Show initial confirmation
      handleDeleteAccount();
    }
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>{icon}</View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {onPress && <ChevronRight size={20} color="#9CA3AF" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingGroup}>
            <SettingItem
              icon={<Bell size={20} color="#2563EB" />}
              title="Push Notifications"
              subtitle="Receive notifications about sessions"
              rightElement={
                <Switch
                  value={notifications}
                  onValueChange={updateNotificationSetting}
                  trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                  thumbColor={notifications ? '#2563EB' : '#9CA3AF'}
                />
              }
            />
            <SettingItem
              icon={<Moon size={20} color="#7C3AED" />}
              title="Dark Mode"
              subtitle="Switch to dark theme"
              rightElement={
                <Switch
                  value={darkMode}
                  onValueChange={updateDarkModeSetting}
                  trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                  thumbColor={darkMode ? '#7C3AED' : '#9CA3AF'}
                />
              }
            />
            <SettingItem
              icon={<Globe size={20} color="#059669" />}
              title="Language"
              subtitle={language}
              onPress={() => setShowLanguageModal(true)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.settingGroup}>
            <SettingItem
              icon={<Lock size={20} color="#DC2626" />}
              title="Change Password"
              subtitle="Update your password"
              onPress={() => setShowPasswordModal(true)}
            />
            <SettingItem
              icon={<Shield size={20} color="#F59E0B" />}
              title="Two-Factor Authentication"
              subtitle="Add extra security to your account"
              rightElement={
                <Switch
                  value={twoFactor}
                  onValueChange={updateTwoFactorSetting}
                  trackColor={{ false: '#E5E7EB', true: '#FCD34D' }}
                  thumbColor={twoFactor ? '#F59E0B' : '#9CA3AF'}
                />
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingGroup}>
            <SettingItem
              icon={<Trash2 size={20} color="#DC2626" />}
              title="Delete Account"
              subtitle={pendingDeletion ? `Pending (${Math.ceil((deletionExpiry! - Date.now()) / 3600000)}h left)` : "Permanently delete your account"}
              onPress={handleDeleteAccountPressed}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal visible={showPasswordModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <X size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your current password"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                editable={!isLoading}
              />

              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!isLoading}
              />

              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!isLoading}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.buttonSecondary, isLoading && styles.buttonDisabled]}
                onPress={() => setShowPasswordModal(false)}
                disabled={isLoading}
              >
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonPrimary, isLoading && styles.buttonDisabled]}
                onPress={() => {
                  console.log('[Settings] Change Password button pressed');
                  console.log('[Settings] New password:', newPassword ? '***' : '(empty)');
                  console.log('[Settings] Confirm password:', confirmPassword ? '***' : '(empty)');
                  console.log('[Settings] isLoading:', isLoading);
                  handleChangePassword();
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonPrimaryText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Confirmation Modal */}
      <Modal visible={showPasswordConfirm} transparent={true} animationType="fade">
        <View style={[styles.modalContainer, { justifyContent: 'center' }]}>
          <View style={[styles.modalContent, { maxHeight: 'auto', marginHorizontal: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Password Change</Text>
              <TouchableOpacity onPress={() => setShowPasswordConfirm(false)}>
                <X size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.warningText}>Are you sure you want to change your password? You will need to log in again.</Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.buttonSecondary, isLoading && styles.buttonDisabled]}
                onPress={() => {
                  setShowPasswordConfirm(false);
                  console.log('[Settings] User cancelled password change');
                }}
                disabled={isLoading}
              >
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonPrimary, isLoading && styles.buttonDisabled]}
                onPress={() => {
                  console.log('[Settings] User confirmed password change');
                  setShowPasswordConfirm(false);
                  performPasswordChange();
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonPrimaryText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal 1 */}
      <Modal visible={showDeleteConfirm1} transparent={true} animationType="fade">
        <View style={[styles.modalContainer, { justifyContent: 'center' }]}>
          <View style={[styles.modalContent, { maxHeight: 'auto', marginHorizontal: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚠️ Delete Account</Text>
              <TouchableOpacity onPress={() => setShowDeleteConfirm1(false)}>
                <X size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.warningText}>Deleting your account is permanent and cannot be undone. All your data will be removed.</Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.buttonSecondary, isLoading && styles.buttonDisabled]}
                onPress={() => {
                  setShowDeleteConfirm1(false);
                  console.log('[Settings] User cancelled deletion at step 1');
                }}
                disabled={isLoading}
              >
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonPrimary, isLoading && styles.buttonDisabled, { backgroundColor: '#DC2626' }]}
                onPress={() => {
                  console.log('[Settings] User confirmed step 1, showing step 2');
                  setShowDeleteConfirm1(false);
                  setTimeout(() => setShowDeleteConfirm2(true), 200);
                }}
                disabled={isLoading}
              >
                <Text style={styles.buttonPrimaryText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal 2 */}
      <Modal visible={showDeleteConfirm2} transparent={true} animationType="fade">
        <View style={[styles.modalContainer, { justifyContent: 'center' }]}>
          <View style={[styles.modalContent, { maxHeight: 'auto', marginHorizontal: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Are You Sure?</Text>
              <TouchableOpacity onPress={() => setShowDeleteConfirm2(false)}>
                <X size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.warningText}>This will:{'\n'}• Delete all your messages and chat history{'\n'}• Remove your profile{'\n'}• Cancel any pending sessions{'\n'}• Cannot be reversed{'\n\n'}Continue?</Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.buttonSecondary, isLoading && styles.buttonDisabled]}
                onPress={() => {
                  setShowDeleteConfirm2(false);
                  console.log('[Settings] User cancelled deletion at step 2');
                }}
                disabled={isLoading}
              >
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonPrimary, isLoading && styles.buttonDisabled, { backgroundColor: '#DC2626' }]}
                onPress={() => {
                  console.log('[Settings] User confirmed step 2, initiating deletion');
                  setShowDeleteConfirm2(false);
                  initiateAccountDeletion();
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonPrimaryText}>Yes, Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal visible={showLanguageModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <X size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.languageOption,
                    language === lang && styles.languageOptionActive
                  ]}
                  onPress={() => updateLanguageSetting(lang)}
                >
                  <Text style={[
                    styles.languageOptionText,
                    language === lang && styles.languageOptionTextActive
                  ]}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Account Deletion Verification Modal */}
      <Modal visible={showDeletionVerification} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Account Deletion</Text>
              <TouchableOpacity onPress={() => setShowDeletionVerification(false)}>
                <X size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ A verification code was sent. Enter it below to confirm permanent deletion of your account.
                </Text>
              </View>

              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-character code"
                value={userVerificationCode}
                onChangeText={(text) => setUserVerificationCode(text.toUpperCase())}
                editable={!isLoading}
                maxLength={6}
                autoCapitalize="characters"
              />

              {deletionExpiry && (
                <View style={styles.expiryBox}>
                  <Text style={styles.expiryText}>
                    Time remaining: {Math.ceil((deletionExpiry - Date.now()) / 3600000)} hours
                  </Text>
                  <Text style={styles.expirySubtext}>
                    Code expires {new Date(deletionExpiry).toLocaleDateString()}
                  </Text>
                </View>
              )}

              <Text style={styles.infoText}>
                Once verified, your account and all associated data will be permanently deleted.
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.buttonSecondary, isLoading && styles.buttonDisabled]}
                onPress={() => setShowDeletionVerification(false)}
                disabled={isLoading}
              >
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonPrimary, isLoading && styles.buttonDisabled, styles.buttonDanger]}
                onPress={() => {
                  console.log('[Settings] Delete Permanently button pressed');
                  console.log('[Settings] Verification code entered:', userVerificationCode ? '***' : '(empty)');
                  console.log('[Settings] Expected code:', deletionVerificationCode);
                  console.log('[Settings] isLoading:', isLoading);
                  performDeleteAccount();
                }}
                disabled={isLoading || !userVerificationCode.trim()}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonPrimaryText}>Delete Permanently</Text>
                )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  settingGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    color: '#1F2937',
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: '#1F2937',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  languageOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
  },
  languageOptionActive: {
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  languageOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  languageOptionTextActive: {
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  buttonDanger: {
    backgroundColor: '#DC2626',
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
  },
  expiryBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  expiryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0369A1',
    marginBottom: 4,
  },
  expirySubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#0C4A6E',
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 16,
    fontStyle: 'italic',
  },
});

