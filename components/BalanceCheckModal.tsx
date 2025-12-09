import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView } from 'react-native';
import { AlertTriangle, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '../utils/pricing';

interface BalanceCheckModalProps {
  visible: boolean;
  currentBalance: number;
  requiredAmount: number;
  sessionType: 'chat' | 'audio' | 'video';
  expertName: string;
  onAddBalance: () => void;
  onDismiss: () => void;
}

export default function BalanceCheckModal({
  visible,
  currentBalance,
  requiredAmount,
  sessionType,
  expertName,
  onAddBalance,
  onDismiss,
}: BalanceCheckModalProps) {
  const shortfallAmount = requiredAmount - currentBalance;
  const sessionTypeLabel = sessionType === 'audio' ? 'Audio Call' : sessionType === 'video' ? 'Video Call' : 'Chat';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.backdrop} />
        <View style={styles.modalContent}>
          <LinearGradient
            colors={['#FEF3C7', '#FED7AA']}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <AlertTriangle size={48} color="#D97706" />
              <Text style={styles.headerTitle}>Insufficient Balance</Text>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            <Text style={styles.description}>
              You don't have enough balance to start this {sessionTypeLabel.toLowerCase()} with {expertName}.
            </Text>

            <View style={styles.balanceBox}>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Current Balance:</Text>
                <Text style={styles.balanceValue}>{formatCurrency(currentBalance)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Required Amount:</Text>
                <Text style={styles.balanceValue}>{formatCurrency(requiredAmount)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.balanceRow}>
                <Text style={styles.shortfallLabel}>Amount Needed:</Text>
                <Text style={styles.shortfallValue}>{formatCurrency(shortfallAmount)}</Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Session Details</Text>
              <Text style={styles.infoText}>
                • Type: {sessionTypeLabel}
              </Text>
              <Text style={styles.infoText}>
                • Expert: {expertName}
              </Text>
              <Text style={styles.infoText}>
                • Rate: {formatCurrency(requiredAmount)} per minute (minimum)
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.dismissButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addBalanceButton}
              onPress={onAddBalance}
              activeOpacity={0.7}
            >
              <Text style={styles.addBalanceButtonText}>Add Balance</Text>
              <ArrowRight size={20} color="#FFFFFF" style={styles.buttonIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#92400E',
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    textAlign: 'center',
  },
  balanceBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
  },
  shortfallLabel: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  shortfallValue: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    gap: 8,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  addBalanceButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addBalanceButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonIcon: {
    marginLeft: 4,
  },
});
