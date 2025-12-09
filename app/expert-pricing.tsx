import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Save, DollarSign, Phone, Video, MessageCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../config/firebase';
import { api } from '../utils/api.firebase';
import { formatCurrency, validatePricingConfig } from '../utils/pricing';

interface PricingRates {
  chatRatePerMinute: string;
  audioCallRatePerMinute: string;
  videoCallRatePerMinute: string;
}

export default function ExpertPricingScreen() {
  const [rates, setRates] = useState<PricingRates>({
    chatRatePerMinute: '0',
    audioCallRatePerMinute: '0',
    videoCallRatePerMinute: '0',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPricingRates();
  }, []);

  const loadPricingRates = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.back();
        return;
      }

      const result = await api.getExpertPricing(user.uid);
      if (result.success && result.pricing) {
        setRates({
          chatRatePerMinute: result.pricing.chatRatePerMinute.toString(),
          audioCallRatePerMinute: result.pricing.audioCallRatePerMinute.toString(),
          videoCallRatePerMinute: result.pricing.videoCallRatePerMinute.toString(),
        });
      }
    } catch (error) {
      console.error('Error loading pricing rates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRateChange = (field: keyof PricingRates, value: string) => {
    setRates((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSavePricing = async () => {
    try {
      // Validate all rates are positive numbers
      const chatRate = parseFloat(rates.chatRatePerMinute);
      const audioRate = parseFloat(rates.audioCallRatePerMinute);
      const videoRate = parseFloat(rates.videoCallRatePerMinute);

      if (isNaN(chatRate) || isNaN(audioRate) || isNaN(videoRate)) {
        Alert.alert('Invalid Input', 'Please enter valid numbers for all rates');
        return;
      }

      if (chatRate <= 0 || audioRate <= 0 || videoRate <= 0) {
        Alert.alert('Invalid Rates', 'All rates must be greater than 0');
        return;
      }

      setIsSaving(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const result = await api.updateExpertPricing(
        user.uid,
        chatRate,
        audioRate,
        videoRate
      );

      if (result.success) {
        Alert.alert('Success', 'Pricing rates updated successfully!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to update pricing rates');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update pricing rates');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  const isFormValid =
    parseFloat(rates.chatRatePerMinute) > 0 &&
    parseFloat(rates.audioCallRatePerMinute) > 0 &&
    parseFloat(rates.videoCallRatePerMinute) > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Your Rates</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Info Card */}
          <LinearGradient
            colors={['#EFF6FF', '#DBEAFE']}
            style={styles.infoCard}
          >
            <Text style={styles.infoTitle}>💡 Pricing Guide</Text>
            <Text style={styles.infoText}>
              Set your per-minute rates for different session types. Users will be charged based on
              these rates for the duration of your session.
            </Text>
            <Text style={[styles.infoText, { marginTop: 8 }]}>
              Platform takes 20% commission. You keep 80% of earnings.
            </Text>
          </LinearGradient>

          {/* Chat Rate */}
          <View style={styles.rateSection}>
            <View style={styles.rateHeader}>
              <View style={styles.rateIconContainer}>
                <MessageCircle size={24} color="#3B82F6" />
              </View>
              <View style={styles.rateHeaderText}>
                <Text style={styles.rateTitle}>Chat Sessions</Text>
                <Text style={styles.rateDescription}>Text-based conversations</Text>
              </View>
            </View>
            <View style={styles.rateInputContainer}>
              <DollarSign size={20} color="#6B7280" />
              <TextInput
                style={styles.rateInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={rates.chatRatePerMinute}
                onChangeText={(value) => handleRateChange('chatRatePerMinute', value)}
                placeholderTextColor="#D1D5DB"
              />
              <Text style={styles.rateUnit}>/min</Text>
            </View>
            {rates.chatRatePerMinute && parseFloat(rates.chatRatePerMinute) > 0 && (
              <View style={styles.earningsPreview}>
                <Text style={styles.earningsLabel}>Your earnings (per minute):</Text>
                <Text style={styles.earningsAmount}>
                  {formatCurrency(parseFloat(rates.chatRatePerMinute) * 0.8)}
                </Text>
              </View>
            )}
          </View>

          {/* Audio Call Rate */}
          <View style={styles.rateSection}>
            <View style={styles.rateHeader}>
              <View style={styles.rateIconContainer}>
                <Phone size={24} color="#10B981" />
              </View>
              <View style={styles.rateHeaderText}>
                <Text style={styles.rateTitle}>Audio Calls</Text>
                <Text style={styles.rateDescription}>Voice conversations</Text>
              </View>
            </View>
            <View style={styles.rateInputContainer}>
              <DollarSign size={20} color="#6B7280" />
              <TextInput
                style={styles.rateInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={rates.audioCallRatePerMinute}
                onChangeText={(value) => handleRateChange('audioCallRatePerMinute', value)}
                placeholderTextColor="#D1D5DB"
              />
              <Text style={styles.rateUnit}>/min</Text>
            </View>
            {rates.audioCallRatePerMinute && parseFloat(rates.audioCallRatePerMinute) > 0 && (
              <View style={styles.earningsPreview}>
                <Text style={styles.earningsLabel}>Your earnings (per minute):</Text>
                <Text style={styles.earningsAmount}>
                  {formatCurrency(parseFloat(rates.audioCallRatePerMinute) * 0.8)}
                </Text>
              </View>
            )}
          </View>

          {/* Video Call Rate */}
          <View style={styles.rateSection}>
            <View style={styles.rateHeader}>
              <View style={styles.rateIconContainer}>
                <Video size={24} color="#F59E0B" />
              </View>
              <View style={styles.rateHeaderText}>
                <Text style={styles.rateTitle}>Video Calls</Text>
                <Text style={styles.rateDescription}>Face-to-face conversations</Text>
              </View>
            </View>
            <View style={styles.rateInputContainer}>
              <DollarSign size={20} color="#6B7280" />
              <TextInput
                style={styles.rateInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={rates.videoCallRatePerMinute}
                onChangeText={(value) => handleRateChange('videoCallRatePerMinute', value)}
                placeholderTextColor="#D1D5DB"
              />
              <Text style={styles.rateUnit}>/min</Text>
            </View>
            {rates.videoCallRatePerMinute && parseFloat(rates.videoCallRatePerMinute) > 0 && (
              <View style={styles.earningsPreview}>
                <Text style={styles.earningsLabel}>Your earnings (per minute):</Text>
                <Text style={styles.earningsAmount}>
                  {formatCurrency(parseFloat(rates.videoCallRatePerMinute) * 0.8)}
                </Text>
              </View>
            )}
          </View>

          {/* Earnings Summary */}
          {isFormValid && (
            <LinearGradient
              colors={['#F0FDF4', '#DCFCE7']}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryTitle}>📊 Earnings Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Chat (per min):</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(parseFloat(rates.chatRatePerMinute) * 0.8)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Audio Call (per min):</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(parseFloat(rates.audioCallRatePerMinute) * 0.8)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Video Call (per min):</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(parseFloat(rates.videoCallRatePerMinute) * 0.8)}
                </Text>
              </View>
              <View style={styles.divider} />
              <Text style={styles.summaryNote}>
                For a 10-minute video call at {formatCurrency(parseFloat(rates.videoCallRatePerMinute))}/min, you'll earn{' '}
                {formatCurrency(parseFloat(rates.videoCallRatePerMinute) * 10 * 0.8)}
              </Text>
            </LinearGradient>
          )}
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, !isFormValid && styles.saveButtonDisabled]}
            onPress={handleSavePricing}
            disabled={!isFormValid || isSaving}
            activeOpacity={0.7}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Save size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Rates</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  rateSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rateIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rateHeaderText: {
    flex: 1,
    gap: 2,
  },
  rateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  rateDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  rateInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    padding: 0,
  },
  rateUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  earningsPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '500',
  },
  earningsAmount: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(22, 101, 52, 0.2)',
  },
  summaryNote: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
