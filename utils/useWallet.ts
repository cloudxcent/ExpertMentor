import { useState, useCallback, useRef } from 'react';
import { api } from './api.firebase';
import { hasSufficientBalance, getRequiredBalance } from './pricing';

export interface WalletState {
  balance: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing wallet operations
 */
export const useWallet = (userId: string | null) => {
  const [walletState, setWalletState] = useState<WalletState>({
    balance: 0,
    isLoading: true,
    error: null,
  });

  const [isOperating, setIsOperating] = useState(false);

  const loadBalance = useCallback(async () => {
    if (!userId) {
      setWalletState({
        balance: 0,
        isLoading: false,
        error: 'No user ID provided',
      });
      return;
    }

    try {
      setWalletState((prev) => ({ ...prev, isLoading: true }));
      const result = await api.getWalletBalance(userId);

      if (result.success && result.balance !== undefined) {
        setWalletState({
          balance: result.balance,
          isLoading: false,
          error: null,
        });
      } else {
        setWalletState({
          balance: 0,
          isLoading: false,
          error: result.error || 'Failed to load balance',
        });
      }
    } catch (error: any) {
      setWalletState({
        balance: 0,
        isLoading: false,
        error: error.message || 'Failed to load balance',
      });
    }
  }, [userId]);

  const addFunds = useCallback(
    async (amount: number, paymentMethod: string) => {
      if (!userId) {
        setWalletState((prev) => ({
          ...prev,
          error: 'No user ID provided',
        }));
        return { success: false };
      }

      setIsOperating(true);
      try {
        const result = await api.addWalletFunds(userId, amount, paymentMethod);

        if (result.success) {
          // Reload balance after adding funds
          await loadBalance();
          return { success: true, transactionId: result.transactionId };
        } else {
          setWalletState((prev) => ({
            ...prev,
            error: result.error || 'Failed to add funds',
          }));
          return { success: false, error: result.error };
        }
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to add funds';
        setWalletState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      } finally {
        setIsOperating(false);
      }
    },
    [userId, loadBalance]
  );

  const checkBalance = useCallback(
    async (requiredAmount: number) => {
      if (!userId) {
        return { hasSufficient: false, currentBalance: 0 };
      }

      try {
        const result = await api.checkBalance(userId, requiredAmount);

        if (result.success) {
          return {
            hasSufficient: result.hasSufficientBalance || false,
            currentBalance: result.currentBalance || 0,
          };
        } else {
          return { hasSufficient: false, currentBalance: 0 };
        }
      } catch (error) {
        return { hasSufficient: false, currentBalance: 0 };
      }
    },
    [userId]
  );

  const canAfford = useCallback(
    (ratePerMinute: number, minutes: number = 1) => {
      const requiredAmount = getRequiredBalance(ratePerMinute, minutes);
      return hasSufficientBalance(walletState.balance, ratePerMinute, minutes);
    },
    [walletState.balance]
  );

  return {
    ...walletState,
    loadBalance,
    addFunds,
    checkBalance,
    canAfford,
    isOperating,
  };
};

/**
 * Hook for managing transaction history
 */
export const useTransactionHistory = (userId: string | null) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(
    async (limit: number = 50) => {
      if (!userId) {
        setError('No user ID provided');
        return;
      }

      try {
        setIsLoading(true);
        const result = await api.getTransactionHistory(userId, limit);

        if (result.success && result.transactions) {
          setTransactions(result.transactions);
          setError(null);
        } else {
          setError(result.error || 'Failed to load transactions');
          setTransactions([]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load transactions');
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  return {
    transactions,
    isLoading,
    error,
    loadTransactions,
  };
};

/**
 * Hook for managing expert earnings
 */
export const useExpertEarnings = (expertId: string | null) => {
  const [earnings, setEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEarnings = useCallback(async () => {
    if (!expertId) {
      setError('No expert ID provided');
      return;
    }

    try {
      setIsLoading(true);
      const result = await api.getTotalEarnings(expertId);

      if (result.success && result.earnings !== undefined) {
        setEarnings(result.earnings);
        setError(null);
      } else {
        setError(result.error || 'Failed to load earnings');
        setEarnings(0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load earnings');
      setEarnings(0);
    } finally {
      setIsLoading(false);
    }
  }, [expertId]);

  return {
    earnings,
    isLoading,
    error,
    loadEarnings,
  };
};
