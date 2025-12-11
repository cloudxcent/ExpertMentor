import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Wallet, CreditCard, Smartphone, DollarSign } from 'lucide-react-native';
import { createPaymentHandler } from '../../utils/paymentHandler';

// Initialize payment handler with your credentials
const paymentHandler = createPaymentHandler(
  process.env.RAZORPAY_KEY_ID || '',
  process.env.RAZORPAY_KEY_SECRET || '',
  process.env.CASHFREE_APP_ID || '',
  process.env.CASHFREE_APP_SECRET || '',
  'https://your-backend.com', // Replace with your backend URL
  false // Set to true for production
);

interface TopUpOption {
  amount: number;
  label: string;
  popular?: boolean;
}

const TOPUP_OPTIONS: TopUpOption[] = [
  { amount: 500, label: '₹500' },
  { amount: 1000, label: '₹1,000', popular: true },
  { amount: 2000, label: '₹2,000' },
  { amount: 5000, label: '₹5,000' },
  { amount: 10000, label: '₹10,000', popular: true },
  { amount: 20000, label: '₹20,000' },
];

export default function WalletTopUpScreen() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'razorpay' | 'cashfree' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);

  const amount = customAmount ? parseInt(customAmount) : selectedAmount;

  const validateAmount = (): boolean => {
    if (!amount || amount < 100 || amount > 50000) {
      Alert.alert('Invalid Amount', 'Please enter an amount between ₹100 and ₹50,000');
      return false;
    }
    return true;
  };

  const handleRazorpayPayment = async () => {
    if (!validateAmount() || !email) {
      Alert.alert('Required', 'Please provide email address');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[WalletTopUp] Initiating Razorpay payment:', amount);

      const { orderId } = await paymentHandler.initializeRazorpayPayment(
        'user-id-here',
        amount!,
        email,
        phoneNumber || '9999999999',
        `Wallet Top-up ₹${amount}`
      );

      Alert.alert('Success', `Order created: ${orderId}\n\nImplement Razorpay modal for payment`);
      setShowEmailModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashfreePayment = async () => {
    if (!validateAmount() || !email || !phoneNumber || !customerName) {
      Alert.alert('Required', 'Please provide name, email, and phone number');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[WalletTopUp] Initiating Cashfree payment:', amount);

      const { orderId, redirectUrl } = await paymentHandler.initializeCashfreePayment(
        'user-id-here',
        amount!,
        customerName,
        email,
        phoneNumber,
        `Wallet Top-up ₹${amount}`
      );

      Alert.alert('Success', `Order created: ${orderId}\n\nRedirect to: ${redirectUrl}`);
      setShowNameModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const proceedToPayment = () => {
    if (!selectedProvider) {
      Alert.alert('Select Payment Method', 'Please choose Razorpay or Cashfree');
      return;
    }

    if (selectedProvider === 'razorpay') {
      setShowEmailModal(true);
    } else if (selectedProvider === 'cashfree') {
      setShowNameModal(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2563EB', '#1D4ED8']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Money to Wallet</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Amount</Text>

          <View style={styles.amountGrid}>
            {TOPUP_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.amount}
                style={[
                  styles.amountOption,
                  selectedAmount === option.amount && styles.amountOptionSelected,
                ]}
                onPress={() => {
                  setSelectedAmount(option.amount);
                  setCustomAmount('');
                }}
              >
                {option.popular && (
                  <Text style={styles.popularBadge}>Popular</Text>
                )}
                <Text
                  style={[
                    styles.amountText,
                    selectedAmount === option.amount && styles.amountTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount */}
          <View style={styles.customAmountSection}>
            <Text style={styles.customLabel}>Or enter custom amount</Text>
            <View style={styles.customInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.customInput}
                placeholder="Enter amount"
                keyboardType="number-pad"
                value={customAmount}
                onChangeText={(text) => {
                  setCustomAmount(text);
                  setSelectedAmount(null);
                }}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <Text style={styles.amountNote}>Min: ₹100 | Max: ₹50,000</Text>
          </View>
        </View>

        {/* Amount Summary */}
        {amount && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount:</Text>
              <Text style={styles.summaryValue}>₹{amount.toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fee:</Text>
              <Text style={styles.summaryValue}>Free</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelBold}>Total Payable:</Text>
              <Text style={styles.summaryValueBold}>₹{amount.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              selectedProvider === 'razorpay' && styles.paymentMethodSelected,
            ]}
            onPress={() => setSelectedProvider('razorpay')}
          >
            <View style={styles.paymentMethodIcon}>
              <CreditCard size={24} color="#2563EB" />
            </View>
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodName}>Razorpay</Text>
              <Text style={styles.paymentMethodDesc}>
                Credit Card, Debit Card, Net Banking, UPI
              </Text>
            </View>
            <View
              style={[
                styles.radioButton,
                selectedProvider === 'razorpay' && styles.radioButtonSelected,
              ]}
            >
              {selectedProvider === 'razorpay' && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethodCard,
              selectedProvider === 'cashfree' && styles.paymentMethodSelected,
            ]}
            onPress={() => setSelectedProvider('cashfree')}
          >
            <View style={styles.paymentMethodIcon}>
              <Smartphone size={24} color="#5B21B6" />
            </View>
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodName}>Cashfree</Text>
              <Text style={styles.paymentMethodDesc}>UPI, Card, Net Banking</Text>
            </View>
            <View
              style={[
                styles.radioButton,
                selectedProvider === 'cashfree' && styles.radioButtonSelected,
              ]}
            >
              {selectedProvider === 'cashfree' && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Security Info */}
        <View style={styles.securitySection}>
          <Text style={styles.securityTitle}>🔒 Secure Payment</Text>
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure. We never store your card details.
          </Text>
        </View>
      </ScrollView>

      {/* Proceed Button */}
      {amount && selectedProvider && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.proceedButton, isLoading && styles.proceedButtonDisabled]}
            onPress={proceedToPayment}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Wallet size={20} color="#FFFFFF" />
                <Text style={styles.proceedButtonText}>
                  Proceed to Pay ₹{amount.toLocaleString()}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Email Modal for Razorpay */}
      <Modal
        visible={showEmailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Email Address</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter your email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => handleRazorpayPayment()}
            >
              <Text style={styles.modalButtonText}>Continue to Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowEmailModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Name & Contact Modal for Cashfree */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Payment Details</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Full Name"
              value={customerName}
              onChangeText={setCustomerName}
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Email Address"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="10 digit mobile number"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                maxLength={10}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => handleCashfreePayment()}
            >
              <Text style={styles.modalButtonText}>Continue to Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowNameModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
  headerGradient: {
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amountOption: {
    width: '31%',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  amountOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  popularBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  amountTextSelected: {
    color: '#2563EB',
  },
  customAmountSection: {
    marginTop: 16,
  },
  customLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  customInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  amountNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryLabelBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  summaryValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  paymentMethodSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  paymentMethodDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  radioButtonSelected: {
    borderColor: '#2563EB',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
    margin: 3,
  },
  securitySection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: '#065F46',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  proceedButtonDisabled: {
    opacity: 0.6,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#1F2937',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 16,
    paddingLeft: 12,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  modalButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
