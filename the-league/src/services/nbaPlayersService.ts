import { API_BASE_URL } from '../config/api';

const API_BASE_WITH_PATH = `${API_BASE_URL}/api/nbaplayers`;

export interface ActiveNbaPlayer {
    id: number;
    playerID: number;
    team: string;
    position: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    createdAt: string;
    updatedAt: string;
    lastSyncedAt: string;
    fullName: string;
    age: number;
}

export interface PaginatedNbaPlayersResponse {
    players: ActiveNbaPlayer[];
    pagination: {
        page: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
    };
}

export interface SyncResult {
    success: boolean;
    message: string;
    playersAdded?: number;
    playersUpdated?: number;
    playersRemoved?: number;
    totalValidPlayers?: number;
}

export interface NbaPlayerStats {
    totalPlayers: number;
    totalTeams: number;
    totalPositions: number;
    teams: string[];
    positions: string[];
    positionCounts: Record<string, number>;
}

export class NbaPlayersService {
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

    async syncNbaPlayers(): Promise<SyncResult> {
        const response = await fetch(`${API_BASE_WITH_PATH}/sync`, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    async getActivePlayers(
        position?: string,
        team?: string,
        page: number = 1,
        pageSize: number = 50
    ): Promise<PaginatedNbaPlayersResponse> {
        const params = new URLSearchParams();
        if (position) params.append('position', position);
        if (team) params.append('team', team);
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());

        const response = await fetch(`${API_BASE_WITH_PATH}?${params}`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    async getPlayerById(playerId: number): Promise<ActiveNbaPlayer> {
        const response = await fetch(`${API_BASE_WITH_PATH}/${playerId}`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    async getPlayersByPosition(
        position: string,
        page: number = 1,
        pageSize: number = 50
    ): Promise<PaginatedNbaPlayersResponse> {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());

        const response = await fetch(`${API_BASE_WITH_PATH}/position/${position}?${params}`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    async getPlayersByTeam(
        team: string,
        page: number = 1,
        pageSize: number = 50
    ): Promise<PaginatedNbaPlayersResponse> {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());

        const response = await fetch(`${API_BASE_WITH_PATH}/team/${team}?${params}`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    async getAvailableTeams(): Promise<string[]> {
        const response = await fetch(`${API_BASE_WITH_PATH}/teams`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    async getAvailablePositions(): Promise<string[]> {
        const response = await fetch(`${API_BASE_WITH_PATH}/positions`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    async getStats(): Promise<NbaPlayerStats> {
        const response = await fetch(`${API_BASE_WITH_PATH}/stats`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }
}

export const nbaPlayersService = new NbaPlayersService();