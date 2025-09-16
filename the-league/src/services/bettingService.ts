// API endpoints for betting system
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://the-league-api-1ff2960f0715.herokuapp.com/api'
  : 'http://localhost:5000/api';

export enum BetType {
  Matchup = 'Matchup',
  Game = 'Game'
}

export enum BetStatus {
  Active = 'Active',
  Won = 'Won',
  Lost = 'Lost',
  Pushed = 'Pushed',
  Cancelled = 'Cancelled'
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
  Team1Spread = 'Team1Spread',
  Team2Spread = 'Team2Spread',
  Team1Moneyline = 'Team1Moneyline',
  Team2Moneyline = 'Team2Moneyline',
  Over = 'Over',
  Under = 'Under'
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
  betType: BetType;
  amount: number;
  potentialPayout: number;
  status: BetStatus;
  selection: string;
  matchupBetId?: number;
  gameBetId?: number;
  placedAt: string;
  settledAt?: string;
  description: string;
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
    const response = await fetch(`${API_BASE}/betting/place`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request)
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

    if (status) params.append('status', status);
    if (type) params.append('type', type);
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
    if (gameSelection) params.append('gameSelection', gameSelection);

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
    if (gameSelection) params.append('gameSelection', gameSelection);

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
    if (gameSelection) params.append('gameSelection', gameSelection);

    const response = await fetch(`${API_BASE}/betting/kelly-bet-size?${params}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to calculate Kelly bet size');
    }

    return response.json();
  }
};