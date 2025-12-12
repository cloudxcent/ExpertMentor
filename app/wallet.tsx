import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, CreditCard, Plus, Wallet, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../config/firebase';
import { useWallet } from '../utils/useWallet';
import { formatCurrency } from '../utils/pricing';

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500];
const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit/Debit Card', icon: '💳' },
  { id: 'upi', label: 'UPI', icon: '📱' },
  { id: 'netbanking', label: 'Net Banking', icon: '🏦' },
];

export default function WalletScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);

  const wallet = useWallet(userId);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.back();
        return;
      }
      setUserId(user.uid);
      await wallet.loadBalance();
    } catch (error) {
      console.error('Error initializing wallet screen:', error);
    }
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const getAmountToAdd = (): number => {
    if (selectedAmount) return selectedAmount;
    const parsed = parseFloat(customAmount);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleAddBalance = async () => {
    const amountToAdd = getAmountToAdd();

    if (amountToAdd <= 0) {
      Alert.alert('Invalid Amount', 'Please select or enter a valid amount');
      return;
    }

    if (!selectedPaymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method');
      return;
    }

    setIsProcessing(true);

    try {
      // In a real app, this would integrate with a payment gateway
      // For now, we'll simulate the payment process
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const result = await wallet.addFunds(amountToAdd, selectedPaymentMethod);

      if (result.success) {
        setSuccessAmount(amountToAdd);
        setSuccessModal(true);
        setSelectedAmount(null);
        setCustomAmount('');
        setSelectedPaymentMethod(null);

        // Reset success modal after 2 seconds and navigate back
        setTimeout(() => {
          setSuccessModal(false);
          router.back();
        }, 2000);
      } else {
        Alert.alert('Error', result.error || 'Failed to add balance');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const amountToAdd = getAmountToAdd();
  const isAmountValid = amountToAdd > 0 && selectedPaymentMethod;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Balance to Wallet</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Current Balance Card */}
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceCardContent}>
            <View style={styles.balanceTop}>
              <View>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                {wallet.isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.balanceAmount}>{formatCurrency(wallet.balance)}</Text>
                )}
              </View>
              <Wallet size={40} color="#FFFFFF" />
            </View>
          </View>
        </LinearGradient>

        {/* Preset Amounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.presetsGrid}>
            {PRESET_AMOUNTS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.presetButton,
                  selectedAmount === amount && styles.presetButtonSelected,
                ]}
                onPress={() => handleAmountSelect(amount)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    selectedAmount === amount && styles.presetButtonTextSelected,
                  ]}
                >
                  {formatCurrency(amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Amount</Text>
          <View style={styles.customAmountContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.customAmountInput}
              placeholder="Enter custom amount"
              keyboardType="decimal-pad"
              value={customAmount}
              onChangeText={handleCustomAmount}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          {customAmount && parseFloat(customAmount) > 0 && (
            <Text style={styles.customAmountDisplay}>
              Amount: {formatCurrency(parseFloat(customAmount))}
            </Text>
          )}
        </View>

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentMethodsContainer}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodButton,
                  selectedPaymentMethod === method.id && styles.paymentMethodButtonSelected,
                ]}
                onPress={() => setSelectedPaymentMethod(method.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
                <Text
                  style={[
                    styles.paymentMethodLabel,
                    selectedPaymentMethod === method.id && styles.paymentMethodLabelSelected,
                  ]}
                >
                  {method.label}
                </Text>
                {selectedPaymentMethod === method.id && (
                  <CheckCircle size={20} color="#3B82F6" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amount Summary */}
        {amountToAdd > 0 && (
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount to Add:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(amountToAdd)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>New Balance:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(wallet.balance + amountToAdd)}
              </Text>
            </View>
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 How it works</Text>
          <Text style={styles.infoText}>
            • Your wallet balance is used to pay for chat and call sessions
          </Text>
          <Text style={styles.infoText}>
            • You can add funds anytime using your preferred payment method
          </Text>
          <Text style={styles.infoText}>
            • Unused balance remains in your account for future sessions
          </Text>
        </View>
      </ScrollView>

      {/* Add Balance Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addBalanceButton, !isAmountValid && styles.addBalanceButtonDisabled]}
          onPress={handleAddBalance}
          disabled={!isAmountValid || isProcessing}
          activeOpacity={0.7}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.addBalanceButtonText}>Add Balance</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal
        visible={successModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModal(false)}
      >
        <View style={styles.successModalContainer}>
          <View style={styles.successModalContent}>
            <CheckCircle size={64} color="#10B981" />
            <Text style={styles.successTitle}>Balance Added!</Text>
            <Text style={styles.successMessage}>
              {formatCurrency(successAmount)} has been added to your wallet.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  balanceCard: {
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceCardContent: {
    gap: 16,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetButtonSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  presetButtonTextSelected: {
    color: '#3B82F6',
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    padding: 0,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3B82F6',
  },
  customAmountDisplay: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 4,
  },
  paymentMethodsContainer: {
    gap: 10,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  paymentMethodButtonSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  paymentMethodIcon: {
    fontSize: 20,
  },
  paymentMethodLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  paymentMethodLabelSelected: {
    color: '#3B82F6',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  summaryBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    color: '#047857',
    fontWeight: '700',
  },
  infoBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    gap: 8,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addBalanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    gap: 8,
  },
  addBalanceButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  addBalanceButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 16,
    width: '80%',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  successMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
