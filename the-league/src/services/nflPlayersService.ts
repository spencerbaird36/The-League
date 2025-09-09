import { API_BASE_URL } from '../config/api';

const API_BASE_WITH_PATH = `${API_BASE_URL}/api/nflplayers`;

export interface ActiveNflPlayer {
  id: number;
  playerID: number;
  team: string;
  firstName: string;
  lastName: string;
  fantasyPosition: string;
  age: number;
  fullName: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string;
}

export interface NflPlayerStats {
  totalPlayers: number;
  totalTeams: number;
  totalPositions: number;
  teams: string[];
  positions: string[];
  positionCounts: { [position: string]: number };
}

export interface SyncResult {
  success: boolean;
  message: string;
  playersAdded: number;
  playersUpdated: number;
  playersRemoved: number;
  totalValidPlayers: number;
}

export interface PlayersResponse {
  players: ActiveNflPlayer[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export class NflPlayersService {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  private handleResponse = async (response: Response) => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  };

  // Sync NFL players from external API
  async syncNflPlayers(): Promise<SyncResult> {
    const response = await fetch(`${API_BASE_WITH_PATH}/sync`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Get active NFL players with filtering and pagination
  async getActivePlayers(
    position?: string,
    team?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<PlayersResponse> {
    const params = new URLSearchParams();
    if (position) params.append('position', position);
    if (team) params.append('team', team);
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    const response = await fetch(`${API_BASE_WITH_PATH}?${params}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Get a specific NFL player by PlayerID
  async getPlayerById(playerId: number): Promise<ActiveNflPlayer> {
    const response = await fetch(`${API_BASE_WITH_PATH}/${playerId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Get all available teams
  async getAvailableTeams(): Promise<string[]> {
    const response = await fetch(`${API_BASE_WITH_PATH}/teams`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Get all available fantasy positions
  async getAvailablePositions(): Promise<string[]> {
    const response = await fetch(`${API_BASE_WITH_PATH}/positions`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Get players by position
  async getPlayersByPosition(
    position: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<PlayersResponse> {
    return this.getActivePlayers(position, undefined, page, pageSize);
  }

  // Get players by team
  async getPlayersByTeam(
    team: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<PlayersResponse> {
    return this.getActivePlayers(undefined, team, page, pageSize);
  }

  // Get database stats
  async getStats(): Promise<NflPlayerStats> {
    const response = await fetch(`${API_BASE_WITH_PATH}/stats`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const nflPlayersService = new NflPlayersService();