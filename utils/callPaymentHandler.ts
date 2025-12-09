/**
 * Call Session Handler
 * Manages payment processing at the end of a call session
 */

import { api } from './api.firebase';
import { calculateSessionCost, formatCurrency, distributePayment } from './pricing';

export interface CallEndDetails {
  sessionId: string;
  clientId: string;
  expertId: string;
  sessionType: 'audio' | 'video';
  durationSeconds: number;
  ratePerMinute: number;
  expertName: string;
  clientName: string;
}

/**
 * Process payment when a call session ends
 */
export const processCallPayment = async (details: CallEndDetails) => {
  try {
    // Calculate the cost
    const durationMinutes = Math.ceil(details.durationSeconds / 60);
    const totalCost = calculateSessionCost(details.ratePerMinute, durationMinutes);

    // Check if client has sufficient balance
    const balanceCheck = await api.checkBalance(details.clientId, totalCost);

    if (!balanceCheck.success) {
      return {
        success: false,
        error: 'Failed to check client balance',
        cost: totalCost,
      };
    }

    if (!balanceCheck.hasSufficientBalance) {
      return {
        success: false,
        error: 'Client has insufficient balance to complete payment',
        cost: totalCost,
        currentBalance: balanceCheck.currentBalance || 0,
      };
    }

    // Process the payment
    const paymentResult = await api.processSessionPayment(
      details.sessionId,
      details.clientId,
      details.expertId,
      totalCost,
      details.sessionType === 'audio' ? 'call' : 'call' // Could also use 'video' if needed
    );

    if (!paymentResult.success) {
      return {
        success: false,
        error: paymentResult.error || 'Failed to process payment',
        cost: totalCost,
      };
    }

    // Calculate the distribution
    const distribution = distributePayment(totalCost);

    return {
      success: true,
      totalCost,
      durationMinutes,
      expertEarnings: distribution.expertEarnings,
      platformRevenue: distribution.platformRevenue,
      clientNewBalance: (balanceCheck.currentBalance || 0) - totalCost,
    };
  } catch (error: any) {
    console.error('Error processing call payment:', error);
    return {
      success: false,
      error: error.message || 'An error occurred while processing payment',
    };
  }
};

/**
 * Format call summary for display
 */
export const formatCallSummary = (details: CallEndDetails, totalCost: number) => {
  const durationMinutes = Math.ceil(details.durationSeconds / 60);
  const distribution = distributePayment(totalCost);

  return {
    title: `${details.sessionType === 'audio' ? 'Audio' : 'Video'} Call Summary`,
    details: [
      { label: 'Duration', value: `${durationMinutes} minute(s)` },
      { label: 'Rate', value: `${formatCurrency(details.ratePerMinute)}/min` },
      { label: 'Total Cost', value: formatCurrency(totalCost) },
      { label: 'Expert Earnings (80%)', value: formatCurrency(distribution.expertEarnings) },
      { label: 'Platform Fee (20%)', value: formatCurrency(distribution.platformRevenue) },
    ],
  };
};

/**
 * Check if call can start based on balance
 */
export const canStartCall = (
  clientBalance: number,
  ratePerMinute: number,
  minimumMinutes: number = 1
): { can: boolean; reason?: string; requiredAmount?: number } => {
  const requiredAmount = ratePerMinute * minimumMinutes;

  if (clientBalance < requiredAmount) {
    return {
      can: false,
      reason: `Insufficient balance. You need ${formatCurrency(requiredAmount)} to start this call.`,
      requiredAmount,
    };
  }

  return { can: true };
};

/**
 * Calculate remaining balance after call
 */
export const calculateFinalBalance = (
  currentBalance: number,
  totalCost: number
): { newBalance: number; displayNewBalance: string } => {
  const newBalance = Math.max(0, currentBalance - totalCost);
  return {
    newBalance,
    displayNewBalance: formatCurrency(newBalance),
  };
};
