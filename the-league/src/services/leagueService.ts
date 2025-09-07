import { API_BASE_URL } from '../config/api';

const API_BASE_WITH_PATH = `${API_BASE_URL}/api`;

export interface LeagueConfiguration {
  id: number;
  leagueId: number;
  includeNFL: boolean;
  includeMLB: boolean;
  includeNBA: boolean;
  totalKeeperSlots: number;
  keepersPerSport: number;
  createdAt: string;
  updatedAt?: string;
}

export const leagueService = {
  async getLeagueConfiguration(leagueId: number): Promise<LeagueConfiguration> {
    const response = await fetch(`${API_BASE_WITH_PATH}/leagues/${leagueId}/configuration`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }
};