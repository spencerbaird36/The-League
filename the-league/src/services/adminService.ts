import { API_BASE_URL } from '../config/api';

const API_BASE_WITH_PATH = `${API_BASE_URL}/api`;

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  teamLogo?: string;
  league?: {
    id: number;
    name: string;
    joinCode: string;
  };
  teamStats?: {
    wins: number;
    losses: number;
    ties: number;
    pointsFor: number;
    pointsAgainst: number;
    winPercentage: number;
  };
}

export interface AdminLeague {
  id: number;
  name: string;
  description: string;
  maxPlayers: number;
  joinCode: string;
  isActive: boolean;
  createdAt: string;
  createdBy: {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  userCount: number;
  draftCount: number;
  users: AdminUser[];
}

export interface AdminPlayer {
  id: number;
  name: string;
  position: string;
  team: string;
  league: string;
  isActive: boolean;
  bye?: number;
  rankings?: number;
}

export interface AdminDashboard {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalLeagues: number;
    activeLeagues: number;
    totalPlayers: number;
    activePlayers: number;
  };
  playersByLeague: Array<{ league: string; count: number }>;
  recentUsers: Array<{
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    createdAt: string;
  }>;
  recentLeagues: Array<{
    id: number;
    name: string;
    createdBy: string;
    createdAt: string;
    userCount: number;
  }>;
}

export class AdminService {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  private handleResponse = async (response: Response) => {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  };

  // Dashboard
  async getDashboard(userId: number): Promise<AdminDashboard> {
    const response = await fetch(`${API_BASE_WITH_PATH}/admin/dashboard?userId=${userId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Leagues Management
  async getAllLeagues(userId: number): Promise<AdminLeague[]> {
    const response = await fetch(`${API_BASE_WITH_PATH}/admin/leagues?userId=${userId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async deleteLeague(leagueId: number, userId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_WITH_PATH}/admin/leagues/${leagueId}?userId=${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Users Management
  async getAllUsers(userId: number): Promise<AdminUser[]> {
    const response = await fetch(`${API_BASE_WITH_PATH}/admin/users?userId=${userId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async deleteUser(targetUserId: number, userId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_WITH_PATH}/admin/users/${targetUserId}?userId=${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Players Management
  async getAllPlayers(userId: number, league?: string): Promise<AdminPlayer[]> {
    const url = league 
      ? `${API_BASE_WITH_PATH}/admin/players?userId=${userId}&league=${league}`
      : `${API_BASE_WITH_PATH}/admin/players?userId=${userId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async createPlayer(userId: number, playerData: Omit<AdminPlayer, 'id'>): Promise<AdminPlayer> {
    const response = await fetch(`${API_BASE_WITH_PATH}/admin/players?userId=${userId}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(playerData),
    });
    return this.handleResponse(response);
  }

  async updatePlayer(playerId: number, userId: number, playerData: Partial<Omit<AdminPlayer, 'id'>>): Promise<AdminPlayer> {
    const response = await fetch(`${API_BASE_WITH_PATH}/admin/players/${playerId}?userId=${userId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(playerData),
    });
    return this.handleResponse(response);
  }

  async deletePlayer(playerId: number, userId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_WITH_PATH}/admin/players/${playerId}?userId=${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Check if user is admin
  isAdmin(userEmail: string): boolean {
    return userEmail.toLowerCase() === 'spencer.baird36@gmail.com';
  }
}

export const adminService = new AdminService();