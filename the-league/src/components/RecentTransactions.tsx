import React, { useState, useEffect } from 'react';
import { apiRequest } from '../config/api';
import { cleanPlayerName } from '../utils/playerNameUtils';
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
  playerName: string | null;
  playerPosition: string;
  playerTeam: string;
  playerLeague: string;
  details?: string;
  createdAt: string;
}

interface RecentTransactionsProps {
  user: User | null;
  refreshTrigger?: number; // Optional prop to trigger refresh when draft is reset
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ user, refreshTrigger }) => {
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
          
          // Transform the data to match our interface and filter for only completed trades
          let transformedTransactions: Transaction[] = [];
          
          if (Array.isArray(transactionsData)) {
            // Filter for TRADE transactions (completed/accepted trades) and free agent activity
            const relevantTransactions = transactionsData.filter((entry: any) => {
              const transactionType = entry.type || entry.Type || entry.transactionType;
              return transactionType === 'Trade' || transactionType === 'TRADE' || 
                     transactionType === 'FreeAgentPickup' || transactionType === 'ADD' ||
                     transactionType === 'Drop' || transactionType === 'DROP';
            });
            
            transformedTransactions = relevantTransactions.slice(0, 10).map((entry: any, index: number) => ({
              id: entry.id || index,
              userId: entry.userId || entry.user?.id,
              username: entry.username || entry.user?.username || 'Unknown',
              firstName: entry.firstName || entry.user?.firstName || '',
              lastName: entry.lastName || entry.user?.lastName || '',
              transactionType: entry.transactionType || entry.type || 'DRAFT',
              playerName: entry.playerName ? cleanPlayerName(entry.playerName) : (entry.player?.name ? cleanPlayerName(entry.player.name) : null),
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
  }, [user?.league?.id, refreshTrigger]); // Add refreshTrigger to dependencies

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
    const userDisplay = transaction.userId === user?.id ? 'You' : `${transaction.firstName} ${transaction.lastName}`;
    
    switch (transaction.transactionType) {
      case 'DRAFT':
        if (transaction.playerName) {
          const draftPlayerInfo = `${transaction.playerName} (${transaction.playerPosition}, ${transaction.playerTeam})`;
          return `${userDisplay} drafted ${draftPlayerInfo}`;
        }
        return `${userDisplay} drafted a player`;
      case 'ADD':
        if (transaction.playerName) {
          const addPlayerInfo = `${transaction.playerName} (${transaction.playerPosition}, ${transaction.playerTeam})`;
          return `${userDisplay} added ${addPlayerInfo}`;
        }
        return `${userDisplay} added a player`;
      case 'DROP':
        if (transaction.playerName) {
          const dropPlayerInfo = `${transaction.playerName} (${transaction.playerPosition}, ${transaction.playerTeam})`;
          return `${userDisplay} dropped ${dropPlayerInfo}`;
        }
        return `${userDisplay} dropped a player`;
      case 'TRADE':
        // For trades, use the full description from the backend since it contains the complete trade details
        return transaction.details || `Trade completed`;
      case 'WAIVER':
        if (transaction.playerName) {
          const waiverPlayerInfo = `${transaction.playerName} (${transaction.playerPosition}, ${transaction.playerTeam})`;
          return `${userDisplay} claimed ${waiverPlayerInfo} off waivers`;
        }
        return `${userDisplay} claimed a player off waivers`;
      default:
        if (transaction.playerName) {
          const playerInfo = `${transaction.playerName} (${transaction.playerPosition}, ${transaction.playerTeam})`;
          return `${userDisplay} made a transaction with ${playerInfo}`;
        } else {
          return transaction.details || `${userDisplay} made a transaction`;
        }
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
        <h3 className="transactions-header">Recent Activity</h3>
        <div className="transactions-loading">Loading transactions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transactions-card">
        <h3 className="transactions-header">Recent Activity</h3>
        <div className="transactions-error">{error}</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="transactions-card">
        <h3 className="transactions-header">
          <span className="transactions-icon">📈</span>
          Recent Activity
        </h3>
        <div className="transactions-empty">No recent activity in your league.</div>
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
          View All Activity →
        </button>
      </div>
    </div>
  );
};

export default RecentTransactions;