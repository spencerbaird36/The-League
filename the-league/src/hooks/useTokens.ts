import { useState, useEffect, useCallback } from 'react';
import { tokenService, TokenBalance, TokenTransaction } from '../services/tokenService';

export const useTokens = () => {
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setError(null);
      const tokenBalance = await tokenService.getBalance();
      setBalance(tokenBalance);
    } catch (err) {
      console.error('Error fetching token balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch token balance');
    }
  }, []);

  const fetchTransactions = useCallback(async (page: number = 1, pageSize: number = 20) => {
    try {
      setError(null);
      const tokenTransactions = await tokenService.getTransactions(page, pageSize);
      if (page === 1) {
        setTransactions(tokenTransactions);
      } else {
        setTransactions(prev => [...prev, ...tokenTransactions]);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  const purchaseTokensDev = useCallback(async (amount: number) => {
    try {
      setError(null);
      const result = await tokenService.quickPurchaseForDev(amount);
      if (result.success) {
        await refreshBalance();
        await fetchTransactions(1); // Refresh transactions to show new purchase
        return result;
      }
      throw new Error('Purchase failed');
    } catch (err) {
      console.error('Error purchasing tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to purchase tokens');
      throw err;
    }
  }, [refreshBalance, fetchTransactions]);

  const requestWithdrawal = useCallback(async (
    tokenAmount: number,
    paymentMethod?: string,
    paymentDetails?: string
  ) => {
    try {
      setError(null);
      const result = await tokenService.requestWithdrawal(tokenAmount, paymentMethod, paymentDetails);
      if (result.success) {
        await refreshBalance();
        await fetchTransactions(1); // Refresh transactions to show new withdrawal
        return result;
      }
      throw new Error('Withdrawal request failed');
    } catch (err) {
      console.error('Error requesting withdrawal:', err);
      setError(err instanceof Error ? err.message : 'Failed to request withdrawal');
      throw err;
    }
  }, [refreshBalance, fetchTransactions]);

  useEffect(() => {
    const initializeTokenData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchBalance(),
          fetchTransactions()
        ]);
      } catch (err) {
        console.error('Error initializing token data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTokenData();
  }, [fetchBalance, fetchTransactions]);

  return {
    balance,
    transactions,
    isLoading,
    error,
    refreshBalance,
    fetchTransactions,
    purchaseTokensDev,
    requestWithdrawal,
    setError
  };
};