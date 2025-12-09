/**
 * Pricing and Payment System
 * Handles balance checking, cost calculations, and payment distribution
 */

export const PLATFORM_COMMISSION_PERCENTAGE = 20; // 20% goes to platform
export const EXPERT_EARNING_PERCENTAGE = 80; // 80% goes to expert

export interface PricingConfig {
  chatRatePerMinute: number;
  audioCallRatePerMinute: number;
  videoCallRatePerMinute: number;
}

export interface PaymentDistribution {
  totalAmount: number;
  expertEarnings: number; // 80%
  platformRevenue: number; // 20%
}

/**
 * Calculate the cost of a session based on type and duration
 */
export const calculateSessionCost = (
  ratePerMinute: number,
  durationMinutes: number
): number => {
  return Math.ceil(durationMinutes) * ratePerMinute;
};

/**
 * Check if user has sufficient balance for a session
 */
export const hasSufficientBalance = (
  userBalance: number,
  ratePerMinute: number,
  estimatedMinutes: number = 1 // minimum 1 minute
): boolean => {
  const requiredAmount = ratePerMinute * estimatedMinutes;
  return userBalance >= requiredAmount;
};

/**
 * Calculate balance required for a session
 */
export const getRequiredBalance = (
  ratePerMinute: number,
  estimatedMinutes: number = 1
): number => {
  return ratePerMinute * estimatedMinutes;
};

/**
 * Distribute payment: 80% to expert, 20% to platform
 */
export const distributePayment = (totalAmount: number): PaymentDistribution => {
  const expertEarnings = (totalAmount * EXPERT_EARNING_PERCENTAGE) / 100;
  const platformRevenue = (totalAmount * PLATFORM_COMMISSION_PERCENTAGE) / 100;

  return {
    totalAmount,
    expertEarnings: Math.round(expertEarnings * 100) / 100, // Round to 2 decimals
    platformRevenue: Math.round(platformRevenue * 100) / 100,
  };
};

/**
 * Calculate balance after payment
 */
export const calculateBalanceAfterPayment = (
  currentBalance: number,
  sessionCost: number
): number => {
  return Math.max(0, currentBalance - sessionCost);
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number | string, currency: string = 'INR'): string => {
  const symbols: { [key: string]: string } = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£',
  };

  const symbol = symbols[currency] || currency;
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return `${symbol}0.00`;
  }
  
  return `${symbol}${numAmount.toFixed(2)}`;
};

/**
 * Format duration from seconds to readable format
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

/**
 * Get pricing for different session types
 */
export const getPricingInfo = (config: PricingConfig, sessionType: 'chat' | 'audio' | 'video') => {
  switch (sessionType) {
    case 'chat':
      return {
        rate: config.chatRatePerMinute,
        type: 'Chat',
        icon: 'message-circle',
      };
    case 'audio':
      return {
        rate: config.audioCallRatePerMinute,
        type: 'Audio Call',
        icon: 'phone',
      };
    case 'video':
      return {
        rate: config.videoCallRatePerMinute,
        type: 'Video Call',
        icon: 'video',
      };
  }
};

/**
 * Validate pricing configuration
 */
export const validatePricingConfig = (config: Partial<PricingConfig>): boolean => {
  const isValid =
    config.chatRatePerMinute !== undefined &&
    config.audioCallRatePerMinute !== undefined &&
    config.videoCallRatePerMinute !== undefined &&
    config.chatRatePerMinute > 0 &&
    config.audioCallRatePerMinute > 0 &&
    config.videoCallRatePerMinute > 0;

  return isValid;
};

/**
 * Get available balance after reserving for a session
 */
export const getAvailableBalance = (
  totalBalance: number,
  reservedAmount: number
): number => {
  return Math.max(0, totalBalance - reservedAmount);
};

/**
 * Check minimum balance required (at least 1 minute of service)
 */
export const getMinimumBalanceRequired = (ratePerMinute: number): number => {
  return ratePerMinute;
};
