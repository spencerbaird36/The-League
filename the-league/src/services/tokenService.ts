// API endpoints for token management
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://the-league-api-1ff2960f0715.herokuapp.com/api'
  : 'http://localhost:5000/api';

export interface TokenBalance {
  balance: number;
  availableBalance: number;
  lockedBalance: number;
  lastUpdated: string;
}

export interface TokenTransaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
  transactionId?: string;
}

export interface PurchaseIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  tokenAmount: number;
  usdAmount: number;
}

export interface PurchaseConfirmResponse {
  success: boolean;
  tokensAdded: number;
  newBalance: number;
  transactionId: string;
}

export interface WithdrawalResponse {
  success: boolean;
  cashoutRequestId: number;
  tokenAmount: number;
  usdAmount: number;
  status: string;
  message: string;
}

export interface CashoutRequest {
  id: number;
  tokenAmount: number;
  usdAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  processedAt?: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const tokenService = {
  // Get user's current token balance
  async getBalance(): Promise<TokenBalance> {
    const response = await fetch(`${API_BASE}/tokens/balance`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch token balance');
    }

    return response.json();
  },

  // Get user's transaction history
  async getTransactions(page: number = 1, pageSize: number = 20): Promise<TokenTransaction[]> {
    const response = await fetch(
      `${API_BASE}/tokens/transactions?page=${page}&pageSize=${pageSize}`,
      {
        headers: getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch transaction history');
    }

    return response.json();
  },

  // Create payment intent for token purchase
  async createPurchaseIntent(tokenAmount: number): Promise<PurchaseIntentResponse> {
    const response = await fetch(`${API_BASE}/tokens/purchase/intent`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tokenAmount })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to create purchase intent');
    }

    return response.json();
  },

  // Confirm token purchase after successful payment
  async confirmPurchase(paymentIntentId: string): Promise<PurchaseConfirmResponse> {
    const response = await fetch(`${API_BASE}/tokens/purchase/confirm`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ paymentIntentId })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to confirm purchase');
    }

    return response.json();
  },

  // Request token withdrawal/cashout
  async requestWithdrawal(
    tokenAmount: number,
    paymentMethod?: string,
    paymentDetails?: string
  ): Promise<WithdrawalResponse> {
    const response = await fetch(`${API_BASE}/tokens/withdraw`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        tokenAmount,
        paymentMethod,
        paymentDetails
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to request withdrawal');
    }

    return response.json();
  },

  // Get user's cashout requests
  async getWithdrawals(page: number = 1, pageSize: number = 20): Promise<CashoutRequest[]> {
    const response = await fetch(
      `${API_BASE}/tokens/withdrawals?page=${page}&pageSize=${pageSize}`,
      {
        headers: getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch withdrawal history');
    }

    return response.json();
  },

  // Development: Quick token purchase (creates a mock successful payment)
  async quickPurchaseForDev(tokenAmount: number): Promise<PurchaseConfirmResponse> {
    const response = await fetch(`${API_BASE}/tokens/dev/quick-purchase`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tokenAmount })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to complete dev purchase');
    }

    return response.json();
  }
};