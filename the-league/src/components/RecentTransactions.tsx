import React, { useState, useEffect } from 'react';
import { apiRequest } from '../config/api';
import './RecentTransactions.css';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  league?: {
    id: number;
    name: string;
  };
}

interface Transaction {
  id: number;
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  transactionType: 'DRAFT' | 'ADD' | 'DROP' | 'TRADE' | 'WAIVER';
  playerName: string;
  playerPosition: string;
  playerTeam: string;
  playerLeague: string;
  details?: string;
  createdAt: string;
}

interface RecentTransactionsProps {
  user: User | null;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ user }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user?.league?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching transactions for league:', user.league.id);
        const response = await apiRequest(`/api/teams/transactions/${user.league.id}`);
        
        if (response.ok) {
          const transactionsData = await response.json();
          console.log('Transactions data received:', transactionsData);
          
          // Transform the data to match our interface
          let transformedTransactions: Transaction[] = [];
          
          if (Array.isArray(transactionsData)) {
            transformedTransactions = transactionsData.slice(0, 10).map((entry: any, index: number) => ({
              id: entry.id || index,
              userId: entry.userId || entry.user?.id,
              username: entry.username || entry.user?.username || 'Unknown',
              firstName: entry.firstName || entry.user?.firstName || '',
              lastName: entry.lastName || entry.user?.lastName || '',
              transactionType: entry.transactionType || entry.type || 'DRAFT',
              playerName: entry.playerName || entry.player?.name || 'Unknown Player',
              playerPosition: entry.playerPosition || entry.player?.position || '',
              playerTeam: entry.playerTeam || entry.player?.team || '',
              playerLeague: entry.playerLeague || entry.player?.league || 'NFL',
              details: entry.details || entry.description,
              createdAt: entry.createdAt || entry.timestamp || new Date().toISOString()
            }));
          }
          
          setTransactions(transformedTransactions);
        } else {
          console.error('Failed to fetch transactions:', response.status, response.statusText);
          setError('Failed to load transactions');
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transactions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [user?.league?.id]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DRAFT': return '🎯';
      case 'ADD': return '✅';
      case 'DROP': return '❌';
      case 'TRADE': return '🔄';
      case 'WAIVER': return '📋';
      default: return '📝';
    }
  };

  const getTransactionText = (transaction: Transaction) => {
    const playerInfo = `${transaction.playerName} (${transaction.playerPosition}, ${transaction.playerTeam})`;
    const userDisplay = transaction.userId === user?.id ? 'You' : `${transaction.firstName} ${transaction.lastName}`;
    
    switch (transaction.transactionType) {
      case 'DRAFT':
        return `${userDisplay} drafted ${playerInfo}`;
      case 'ADD':
        return `${userDisplay} added ${playerInfo}`;
      case 'DROP':
        return `${userDisplay} dropped ${playerInfo}`;
      case 'TRADE':
        return `${userDisplay} traded ${playerInfo}`;
      case 'WAIVER':
        return `${userDisplay} claimed ${playerInfo} off waivers`;
      default:
        return `${userDisplay} made a transaction with ${playerInfo}`;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getLeagueIcon = (league: string) => {
    switch (league) {
      case 'NFL': return '🏈';
      case 'MLB': return '⚾';
      case 'NBA': return '🏀';
      default: return '🏆';
    }
  };

  if (isLoading) {
    return (
      <div className="transactions-card">
        <h3 className="transactions-header">Recent Transactions</h3>
        <div className="transactions-loading">Loading transactions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transactions-card">
        <h3 className="transactions-header">Recent Transactions</h3>
        <div className="transactions-error">{error}</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="transactions-card">
        <h3 className="transactions-header">
          <span className="transactions-icon">📈</span>
          Recent Transactions
        </h3>
        <div className="transactions-empty">No recent transactions in your league.</div>
      </div>
    );
  }

  return (
    <div className="transactions-card">
      <h3 className="transactions-header">
        <span className="transactions-icon">📈</span>
        Recent Transactions
      </h3>
      
      <div className="transactions-list">
        {transactions.map((transaction) => (
          <div 
            key={transaction.id}
            className={`transaction-item ${transaction.userId === user?.id ? 'user-transaction' : ''}`}
          >
            <div className="transaction-icon-wrapper">
              <span className="transaction-type-icon">
                {getTransactionIcon(transaction.transactionType)}
              </span>
              <span className="league-icon">
                {getLeagueIcon(transaction.playerLeague)}
              </span>
            </div>
            
            <div className="transaction-details">
              <div className="transaction-text">
                {getTransactionText(transaction)}
              </div>
              {transaction.details && (
                <div className="transaction-extra-details">
                  {transaction.details}
                </div>
              )}
            </div>
            
            <div className="transaction-time">
              {formatTimeAgo(transaction.createdAt)}
            </div>
          </div>
        ))}
      </div>
      
      <div className="transactions-footer">
        <button className="view-all-transactions">
          View All Transactions →
        </button>
      </div>
    </div>
  );
};

export default RecentTransactions;