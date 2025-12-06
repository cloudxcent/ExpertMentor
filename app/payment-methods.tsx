import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, TextInput, Alert, Modal } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, CreditCard, Building2, Smartphone, Plus, Trash2, X } from 'lucide-react-native';

interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'bank';
  details: string;
  name: string;
  isDefault: boolean;
}

export default function PaymentMethodsScreen() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      details: '**** **** **** 4532',
      name: 'HDFC Bank Card',
      isDefault: true
    },
    {
      id: '2',
      type: 'upi',
      details: 'user@paytm',
      name: 'Paytm UPI',
      isDefault: false
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<'card' | 'upi' | 'bank'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(methods => methods.filter(m => m.id !== id));
          }
        }
      ]
    );
  };

  const handleAddPayment = () => {
    let details = '';
    let name = '';

    if (selectedType === 'card') {
      if (!cardNumber || !cardName) {
        Alert.alert('Error', 'Please fill all card details');
        return;
      }
      details = `**** **** **** ${cardNumber.slice(-4)}`;
      name = cardName;
    } else if (selectedType === 'upi') {
      if (!upiId) {
        Alert.alert('Error', 'Please enter UPI ID');
        return;
      }
      details = upiId;
      name = 'UPI Payment';
    } else {
      if (!accountNumber) {
        Alert.alert('Error', 'Please enter account number');
        return;
      }
      details = `**** ${accountNumber.slice(-4)}`;
      name = 'Bank Account';
    }

    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: selectedType,
      details,
      name,
      isDefault: paymentMethods.length === 0
    };

    setPaymentMethods([...paymentMethods, newMethod]);
    setShowAddModal(false);
    setCardNumber('');
    setCardName('');
    setUpiId('');
    setAccountNumber('');
    Alert.alert('Success', 'Payment method added successfully');
  };

  const PaymentMethodCard = ({ method }: { method: PaymentMethod }) => (
    <View style={styles.methodCard}>
      <View style={styles.methodHeader}>
        <View style={styles.methodIcon}>
          {method.type === 'card' && <CreditCard size={24} color="#2563EB" />}
          {method.type === 'upi' && <Smartphone size={24} color="#7C3AED" />}
          {method.type === 'bank' && <Building2 size={24} color="#059669" />}
        </View>
        <View style={styles.methodDetails}>
          <Text style={styles.methodName}>{method.name}</Text>
          <Text style={styles.methodInfo}>{method.details}</Text>
        </View>
        {method.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>Default</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(method.id)}
      >
        <Trash2 size={20} color="#DC2626" />
      </TouchableOpacity>
    </View>
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
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Payment Methods</Text>
          {paymentMethods.map(method => (
            <PaymentMethodCard key={method.id} method={method} />
          ))}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Plus size={24} color="#2563EB" />
          <Text style={styles.addButtonText}>Add New Payment Method</Text>
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Supported Payment Methods</Text>
          <View style={styles.infoItem}>
            <CreditCard size={20} color="#6B7280" />
            <Text style={styles.infoText}>Credit & Debit Cards (Visa, Mastercard, RuPay)</Text>
          </View>
          <View style={styles.infoItem}>
            <Smartphone size={20} color="#6B7280" />
            <Text style={styles.infoText}>UPI (Google Pay, PhonePe, Paytm)</Text>
          </View>
          <View style={styles.infoItem}>
            <Building2 size={20} color="#6B7280" />
            <Text style={styles.infoText}>Net Banking (All major banks)</Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment Method</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'card' && styles.typeButtonActive]}
                onPress={() => setSelectedType('card')}
              >
                <CreditCard size={20} color={selectedType === 'card' ? '#2563EB' : '#6B7280'} />
                <Text style={[styles.typeButtonText, selectedType === 'card' && styles.typeButtonTextActive]}>Card</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'upi' && styles.typeButtonActive]}
                onPress={() => setSelectedType('upi')}
              >
                <Smartphone size={20} color={selectedType === 'upi' ? '#2563EB' : '#6B7280'} />
                <Text style={[styles.typeButtonText, selectedType === 'upi' && styles.typeButtonTextActive]}>UPI</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'bank' && styles.typeButtonActive]}
                onPress={() => setSelectedType('bank')}
              >
                <Building2 size={20} color={selectedType === 'bank' ? '#2563EB' : '#6B7280'} />
                <Text style={[styles.typeButtonText, selectedType === 'bank' && styles.typeButtonTextActive]}>Bank</Text>
              </TouchableOpacity>
            </View>

            {selectedType === 'card' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Card Number"
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  keyboardType="numeric"
                  maxLength={16}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Cardholder Name"
                  value={cardName}
                  onChangeText={setCardName}
                />
              </>
            )}

            {selectedType === 'upi' && (
              <TextInput
                style={styles.input}
                placeholder="UPI ID (e.g., user@paytm)"
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
              />
            )}

            {selectedType === 'bank' && (
              <TextInput
                style={styles.input}
                placeholder="Account Number"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="numeric"
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddPayment}
              >
                <Text style={styles.saveButtonText}>Add Payment</Text>
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
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  methodInfo: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  defaultBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    flex: 1,
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
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  typeButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  typeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#2563EB',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
