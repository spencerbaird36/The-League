import { 
  TradeProposal, 
  CreateTradeProposalRequest, 
  TradeProposalResponse,
  LeagueTeam,
  TradeNotification,
  TradeActivity
} from '../types/Trade';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://the-league-api-1ff2960f0715.herokuapp.com' 
  : 'http://localhost:5000';

export class TradeProposalService {
  private baseUrl = `${API_BASE_URL}/api/trades`;

  // Get all teams in a league with their rosters
  async getLeagueTeams(leagueId: number): Promise<LeagueTeam[]> {
    try {
      console.log(`📋 Fetching league teams for league ${leagueId}`);
      
      const response = await fetch(`${this.baseUrl}/league/${leagueId}/teams`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch league teams: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.length} teams for league ${leagueId}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching league teams:', error);
      throw error;
    }
  }

  // Create a new trade proposal
  async createTradeProposal(request: CreateTradeProposalRequest): Promise<TradeProposalResponse> {
    try {
      console.log(`🤝 Creating trade proposal from user ${request.proposingUserId} to user ${request.targetUserId}`);
      
      const response = await fetch(`${this.baseUrl}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create trade proposal: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Created trade proposal with ID ${data.tradeProposal?.id}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error creating trade proposal:', error);
      throw error;
    }
  }

  // Get all trade proposals for a user
  async getUserTradeProposals(userId: number): Promise<TradeProposal[]> {
    try {
      console.log(`📋 Fetching trade proposals for user ${userId}`);
      
      const response = await fetch(`${this.baseUrl}/proposals/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch trade proposals: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.length} trade proposals for user ${userId}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching trade proposals:', error);
      throw error;
    }
  }

  // Get pending trade proposals proposed by a user (for managing own proposals)
  async getPendingTradesProposed(userId: number): Promise<TradeProposal[]> {
    try {
      console.log(`📋 Fetching pending trades proposed by user ${userId}`);
      
      const response = await fetch(`${this.baseUrl}/proposals/user/${userId}/proposed/pending`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pending trades proposed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.length} pending trades proposed by user ${userId}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching pending trades proposed:', error);
      throw error;
    }
  }

  // Get pending trade proposals received by a user
  async getPendingTradesReceived(userId: number): Promise<TradeProposal[]> {
    try {
      console.log(`📋 Fetching pending trades received for user ${userId}`);
      
      const response = await fetch(`${this.baseUrl}/proposals/user/${userId}/received/pending`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pending trades: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.length} pending trades for user ${userId}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching pending trades:', error);
      throw error;
    }
  }

  // Respond to a trade proposal (accept/reject)
  async respondToTradeProposal(tradeId: number, accept: boolean, message?: string): Promise<TradeProposalResponse> {
    try {
      console.log(`🤝 ${accept ? 'Accepting' : 'Rejecting'} trade proposal ${tradeId}`);
      
      const response = await fetch(`${this.baseUrl}/proposals/${tradeId}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accept, message }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to respond to trade proposal: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ ${accept ? 'Accepted' : 'Rejected'} trade proposal ${tradeId}`);
      
      return data;
    } catch (error) {
      console.error(`❌ Error responding to trade proposal:`, error);
      throw error;
    }
  }

  // Cancel a trade proposal (only proposing user can do this)
  async cancelTradeProposal(tradeId: number): Promise<TradeProposalResponse> {
    try {
      console.log(`❌ Cancelling trade proposal ${tradeId}`);
      
      const response = await fetch(`${this.baseUrl}/proposals/${tradeId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to cancel trade proposal: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Cancelled trade proposal ${tradeId}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error cancelling trade proposal:', error);
      throw error;
    }
  }

  // Get trade notifications for a user
  async getTradeNotifications(userId: number): Promise<TradeNotification[]> {
    try {
      console.log(`🔔 Fetching trade notifications for user ${userId}`);
      
      const response = await fetch(`${this.baseUrl}/notifications/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch trade notifications: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.length} trade notifications for user ${userId}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching trade notifications:', error);
      throw error;
    }
  }

  // Mark trade notification as read
  async markNotificationAsRead(notificationId: number): Promise<void> {
    try {
      console.log(`✅ Marking trade notification ${notificationId} as read`);
      
      const response = await fetch(`${this.baseUrl}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.status} ${response.statusText}`);
      }

      console.log(`✅ Marked notification ${notificationId} as read`);
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  // Get league trade activity (completed trades visible to all users)
  async getLeagueTradeActivity(leagueId: number): Promise<TradeActivity[]> {
    try {
      console.log(`🏆 Fetching league trade activity for league ${leagueId}`);
      
      const response = await fetch(`${this.baseUrl}/activity/league/${leagueId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch league trade activity: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.length} league trade activities`);
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching league trade activity:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const tradeProposalService = new TradeProposalService();