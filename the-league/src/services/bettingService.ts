// API endpoints for betting system
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://the-league-api-1ff2960f0715.herokuapp.com/api'
  : 'http://localhost:5000/api';

export enum BetType {
  MatchupSpread = 1,
  MatchupMoneyline = 2,
  MatchupOverUnder = 3,
  GameSpread = 4,
  GameMoneyline = 5,
  GameOverUnder = 6,
  GameProps = 7
}

export enum BetStatus {
  Active = 1,
  Won = 2,
  Lost = 3,
  Push = 4,
  Cancelled = 5,
  Voided = 6,
  Expired = 7,
  Pending = 8
}

export enum MatchupBetSelection {
  Team1Spread = 'Team1Spread',
  Team2Spread = 'Team2Spread',
  Team1Moneyline = 'Team1Moneyline',
  Team2Moneyline = 'Team2Moneyline',
  Over = 'Over',
  Under = 'Under'
}

export enum GameBetSelection {
  HomeSpread = 1,
  AwaySpread = 2,
  HomeMoneyline = 3,
  AwayMoneyline = 4,
  Over = 5,
  Under = 6
}

export interface MatchupBetOption {
  id: number;
  leagueId: number;
  week: number;
  season: number;
  sport: string;
  team1UserId: number;
  team1UserName: string;
  team2UserId: number;
  team2UserName: string;
  pointSpread?: number;
  overUnderLine?: number;
  team1MoneylineOdds?: number;
  team2MoneylineOdds?: number;
  expiresAt?: string;
  notes?: string;
}

export interface GameBetOption {
  id: number;
  leagueId: number;
  week: number;
  season: number;
  sport: string;
  team1Name: string;
  team2Name: string;
  gameDate: string;
  pointSpread?: number;
  overUnderLine?: number;
  team1MoneylineOdds?: number;
  team2MoneylineOdds?: number;
  expiresAt?: string;
  notes?: string;
}

export interface AvailableBets {
  matchupBets: MatchupBetOption[];
  gameBets: GameBetOption[];
}

export interface PlaceBetRequest {
  betType: BetType;
  amount: number;
  matchupBetId?: number;
  matchupSelection?: MatchupBetSelection;
  gameBetId?: number;
  gameSelection?: GameBetSelection;
  notes?: string;
}

export interface PlaceBetResponse {
  success: boolean;
  message: string;
  betId?: number;
  newTokenBalance?: number;
  potentialPayout?: number;
  errorMessage?: string;
}

export interface UserBet {
  id: number;
  userId: number;
  userName: string;
  leagueId: number;
  leagueName: string;
  type: BetType;
  typeDisplayName: string;
  amount: number;
  potentialPayout: number;
  odds: number;
  status: BetStatus;
  statusDisplayName: string;
  expiresAt: string;
  createdAt: string;
  settledAt?: string;
  notes?: string;
  settlementNotes?: string;
  settledByAdminName?: string;
  canBeCancelled: boolean;
  isExpired: boolean;
  impliedProbability: number;
  matchupBet?: any;
  gameBet?: any;

  // Computed properties for compatibility
  betType?: BetType;
  selection?: string;
  placedAt?: string;
  description?: string;
}

export interface BettingStats {
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  winRate: number;
  profitLoss: number;
  activeBets: number;
  activeBetsAmount: number;
}

export interface ParlayLeg {
  betType: BetType;
  matchupBetId?: number;
  matchupSelection?: MatchupBetSelection;
  gameBetId?: number;
  gameSelection?: GameBetSelection;
  odds: number;
  description: string;
}

export interface ParlayBetRequest {
  legs: ParlayLeg[];
  amount: number;
  notes?: string;
}

export interface ParlayBetResponse {
  success: boolean;
  message: string;
  betId?: number;
  newTokenBalance?: number;
  potentialPayout?: number;
  combinedOdds?: number;
  errorMessage?: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const bettingService = {
  // Get all available bets for the user
  async getAvailableBets(): Promise<AvailableBets> {
    const response = await fetch(`${API_BASE}/betting/available`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch available bets');
    }

    return response.json();
  },

  // Get available matchup bets
  async getAvailableMatchups(leagueId?: number): Promise<MatchupBetOption[]> {
    const url = leagueId
      ? `${API_BASE}/betting/available/matchups?leagueId=${leagueId}`
      : `${API_BASE}/betting/available/matchups`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch available matchup bets');
    }

    return response.json();
  },

  // Get available game bets
  async getAvailableGames(leagueId?: number): Promise<GameBetOption[]> {
    const url = leagueId
      ? `${API_BASE}/betting/available/games?leagueId=${leagueId}`
      : `${API_BASE}/betting/available/games`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch available game bets');
    }

    return response.json();
  },

  // Place a bet
  async placeBet(request: PlaceBetRequest): Promise<PlaceBetResponse> {
    // Ensure amount is sent as decimal
    const requestWithDecimal = {
      ...request,
      amount: parseFloat(request.amount.toFixed(2))
    };

    const response = await fetch(`${API_BASE}/betting/place`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestWithDecimal)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.errorMessage || result.message || 'Failed to place bet');
    }

    return result;
  },

  // Get user's bets
  async getUserBets(
    status?: BetStatus,
    type?: BetType,
    leagueId?: number,
    page: number = 1,
    pageSize: number = 50
  ): Promise<UserBet[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    });

    if (status) params.append('status', status.toString());
    if (type) params.append('type', type.toString());
    if (leagueId) params.append('leagueId', leagueId.toString());

    const response = await fetch(`${API_BASE}/betting/my-bets?${params}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user bets');
    }

    return response.json();
  },

  // Get a specific bet
  async getUserBet(betId: number): Promise<UserBet> {
    const response = await fetch(`${API_BASE}/betting/my-bets/${betId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch bet details');
    }

    return response.json();
  },

  // Cancel a bet
  async cancelBet(betId: number): Promise<PlaceBetResponse> {
    const response = await fetch(`${API_BASE}/betting/my-bets/${betId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.errorMessage || result.message || 'Failed to cancel bet');
    }

    return result;
  },

  // Get user's betting statistics
  async getBettingStats(leagueId?: number): Promise<BettingStats> {
    const url = leagueId
      ? `${API_BASE}/betting/my-stats?leagueId=${leagueId}`
      : `${API_BASE}/betting/my-stats`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch betting statistics');
    }

    return response.json();
  },

  // Calculate odds for a bet
  async calculateOdds(
    betType: BetType,
    matchupBetId?: number,
    matchupSelection?: MatchupBetSelection,
    gameBetId?: number,
    gameSelection?: GameBetSelection
  ): Promise<number> {
    const params = new URLSearchParams({
      betType: betType.toString()
    });

    if (matchupBetId) params.append('matchupBetId', matchupBetId.toString());
    if (matchupSelection) params.append('matchupSelection', matchupSelection);
    if (gameBetId) params.append('gameBetId', gameBetId.toString());
    if (gameSelection) params.append('gameSelection', gameSelection.toString());

    const response = await fetch(`${API_BASE}/betting/odds/calculate?${params}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to calculate odds');
    }

    return response.json();
  },

  // Calculate potential payout
  async calculatePayout(
    betAmount: number,
    betType: BetType,
    matchupBetId?: number,
    matchupSelection?: MatchupBetSelection,
    gameBetId?: number,
    gameSelection?: GameBetSelection
  ): Promise<number> {
    const params = new URLSearchParams({
      betAmount: betAmount.toString(),
      betType: betType.toString()
    });

    if (matchupBetId) params.append('matchupBetId', matchupBetId.toString());
    if (matchupSelection) params.append('matchupSelection', matchupSelection);
    if (gameBetId) params.append('gameBetId', gameBetId.toString());
    if (gameSelection) params.append('gameSelection', gameSelection.toString());

    const response = await fetch(`${API_BASE}/betting/payout/calculate?${params}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to calculate payout');
    }

    return response.json();
  },

  // Calculate Kelly bet size recommendation
  async calculateKellyBetSize(
    bankroll: number,
    winProbability: number,
    betType: BetType,
    matchupBetId?: number,
    matchupSelection?: MatchupBetSelection,
    gameBetId?: number,
    gameSelection?: GameBetSelection
  ): Promise<number> {
    const params = new URLSearchParams({
      bankroll: bankroll.toString(),
      winProbability: winProbability.toString(),
      betType: betType.toString()
    });

    if (matchupBetId) params.append('matchupBetId', matchupBetId.toString());
    if (matchupSelection) params.append('matchupSelection', matchupSelection);
    if (gameBetId) params.append('gameBetId', gameBetId.toString());
    if (gameSelection) params.append('gameSelection', gameSelection.toString());

    const response = await fetch(`${API_BASE}/betting/kelly-bet-size?${params}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to calculate Kelly bet size');
    }

    return response.json();
  },

  // Get settlement reports for admin or detailed bet analysis
  async getSettlementReports(
    startDate?: string,
    endDate?: string,
    sport?: string
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (sport) params.append('sport', sport);

      const response = await fetch(`${API_BASE}/betting/settlement-reports?${params}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Endpoint not implemented yet, return mock data
          console.warn('Settlement reports endpoint not available, using mock data');
          return [
            {
              id: 1,
              gameInfo: 'Chiefs 28 - Bills 24',
              settledAt: new Date().toISOString(),
              totalBetsSettled: 5,
              totalPayouts: 250
            },
            {
              id: 2,
              gameInfo: 'Cowboys 21 - Giants 14',
              settledAt: new Date().toISOString(),
              totalBetsSettled: 3,
              totalPayouts: 150
            }
          ];
        }
        throw new Error('Failed to fetch settlement reports');
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error or server not available
        console.warn('Settlement API not available, using mock settlement reports');
        return [];
      }
      throw error;
    }
  },

  // Get pending settlements (games completed but bets not yet settled)
  async getPendingSettlements(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE}/betting/pending-settlements`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Endpoint not implemented yet, return mock data for development
          console.warn('Pending settlements endpoint not available, using mock data');
          return [
            {
              id: 1,
              gameBetId: 101,
              gameInfo: 'Chiefs vs Bills',
              description: 'Chiefs -3.5 spread bet',
              amount: 50,
              betType: 'Spread',
              placedAt: new Date().toISOString()
            },
            {
              id: 2,
              gameBetId: 101,
              gameInfo: 'Chiefs vs Bills',
              description: 'Over 47.5 total points',
              amount: 25,
              betType: 'Over/Under',
              placedAt: new Date().toISOString()
            },
            {
              id: 3,
              gameBetId: 102,
              gameInfo: 'Cowboys vs Giants',
              description: 'Cowboys moneyline',
              amount: 100,
              betType: 'Moneyline',
              placedAt: new Date().toISOString()
            }
          ];
        }
        throw new Error('Failed to fetch pending settlements');
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error or server not available
        console.warn('Betting API not available, using mock pending settlements');
        return [];
      }
      throw error;
    }
  },

  // Force settlement of a specific bet (admin function)
  async forceSettlement(betId: number, result: BetStatus, notes?: string): Promise<PlaceBetResponse> {
    try {
      const response = await fetch(`${API_BASE}/betting/force-settlement/${betId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ result, notes })
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Endpoint not implemented yet, return mock success response
          console.warn(`Force settlement endpoint not available, simulating settlement for bet ${betId}`);
          return {
            success: true,
            message: `Bet ${betId} settled as ${result} (simulated)`,
            newTokenBalance: 1000 // Mock balance
          };
        }
        const responseData = await response.json();
        throw new Error(responseData.errorMessage || responseData.message || 'Failed to force settlement');
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error or server not available
        console.warn('Settlement API not available, simulating force settlement');
        return {
          success: true,
          message: `Bet ${betId} settled as ${result} (simulated - API unavailable)`,
          newTokenBalance: 1000
        };
      }
      throw error;
    }
  },

  // Calculate parlay odds for multiple legs
  async calculateParlayOdds(legs: ParlayLeg[]): Promise<{ combinedOdds: number; impliedProbability: number }> {
    const response = await fetch(`${API_BASE}/betting/parlay/calculate-odds`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ legs })
    });

    if (!response.ok) {
      throw new Error('Failed to calculate parlay odds');
    }

    return response.json();
  },

  // Calculate parlay payout
  async calculateParlayPayout(legs: ParlayLeg[], amount: number): Promise<number> {
    const response = await fetch(`${API_BASE}/betting/parlay/calculate-payout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ legs, amount })
    });

    if (!response.ok) {
      throw new Error('Failed to calculate parlay payout');
    }

    return response.json();
  },

  // Place a parlay bet
  async placeParlayBet(request: ParlayBetRequest): Promise<ParlayBetResponse> {
    // Ensure amount is sent as decimal
    const requestWithDecimal = {
      ...request,
      amount: parseFloat(request.amount.toFixed(2))
    };

    const response = await fetch(`${API_BASE}/betting/parlay/place`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestWithDecimal)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.errorMessage || result.message || 'Failed to place parlay bet');
    }

    return result;
  },

  // Get user's parlay bets
  async getUserParlayBets(
    status?: BetStatus,
    page: number = 1,
    pageSize: number = 50
  ): Promise<any[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    });

    if (status) params.append('status', status.toString());

    const response = await fetch(`${API_BASE}/betting/parlay/my-bets?${params}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch parlay bets');
    }

    return response.json();
  }
};