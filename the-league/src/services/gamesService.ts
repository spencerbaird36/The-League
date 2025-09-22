// API service for sports games data
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://the-league-api-1ff2960f0715.herokuapp.com/api'
  : 'http://localhost:5000/api';

export interface GameData {
  externalGameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameDateTime: string;
  week?: string;
  season?: string;
  pointSpread?: number;
  overUnderLine?: number;
  homeMoneylineOdds?: number;
  awayMoneylineOdds?: number;
  overOdds?: number;
  underOdds?: number;
  homeScore?: number;
  awayScore?: number;
  gameStatus: string;
}

export interface SportGames {
  NFL: GameData[];
  NBA: GameData[];
  MLB: GameData[];
  totalGames: number;
}

export interface SyncResult {
  success: boolean;
  message: string;
  gamesProcessed: number;
  gamesCreated: number;
  gamesUpdated: number;
  errors: string[];
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const gamesService = {
  // Get all upcoming games across all sports
  async getAllUpcomingGames(days: number = 7): Promise<SportGames> {
    const response = await fetch(`${API_BASE}/sportsdata/upcoming?days=${days}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch upcoming games');
    }

    return response.json();
  },

  // Get upcoming games for a specific sport
  async getUpcomingGames(sport: string, days: number = 7): Promise<GameData[]> {
    const response = await fetch(`${API_BASE}/sportsdata/upcoming/${sport}?days=${days}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${sport} games`);
    }

    return response.json();
  },

  // Manual sync operations
  async syncNflGames(): Promise<SyncResult> {
    const response = await fetch(`${API_BASE}/sportsdata/sync/nfl`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to sync NFL games');
    }

    return response.json();
  },

  async syncNbaGames(): Promise<SyncResult> {
    const response = await fetch(`${API_BASE}/sportsdata/sync/nba`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to sync NBA games');
    }

    return response.json();
  },

  async syncMlbGames(): Promise<SyncResult> {
    const response = await fetch(`${API_BASE}/sportsdata/sync/mlb`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to sync MLB games');
    }

    return response.json();
  },

  async syncAllGames(): Promise<SyncResult[]> {
    const response = await fetch(`${API_BASE}/sportsdata/sync/all`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to sync all games');
    }

    return response.json();
  },

  // Update scores for live games
  async updateGameScores(sport: string): Promise<SyncResult> {
    const response = await fetch(`${API_BASE}/sportsdata/scores/${sport}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to update ${sport} scores`);
    }

    return response.json();
  }
};