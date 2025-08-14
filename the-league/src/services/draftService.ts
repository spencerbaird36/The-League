import { DraftState, DraftPick, LeagueMember } from '../context/DraftContext';
import { Player } from '../types/Player';
import { apiRequest } from '../config/api';

export interface CreateDraftRequest {
  leagueId: number;
  draftOrder: number[];
}

export interface MakeDraftPickRequest {
  userId: number;
  playerName: string;
  playerPosition: string;
  playerTeam: string;
  playerLeague: string;
}

export interface DraftPickResponse {
  id: number;
  userId: number;
  userFullName: string;
  username: string;
  playerName: string;
  playerPosition: string;
  playerTeam: string;
  playerLeague: string;
  pickNumber: number;
  round: number;
  roundPick: number;
  pickedAt: string;
  draft: {
    currentTurn: number;
    currentRound: number;
    isCompleted: boolean;
    nextUserId: number | null;
  };
}

class DraftService {
  // Using centralized API configuration

  async fetchDraftState(leagueId: number): Promise<DraftState | null> {
    try {
      const response = await apiRequest(`/api/draft/league/${leagueId}`);
      if (response.ok) {
        const draft = await response.json();
        return draft;
      } else if (response.status === 404) {
        return null; // No draft exists yet
      } else {
        throw new Error(`Failed to fetch draft state: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching draft state:', error);
      throw error;
    }
  }

  async fetchLeagueMembers(leagueId: number): Promise<LeagueMember[]> {
    try {
      const response = await apiRequest(`/api/leagues/${leagueId}/members`);
      if (response.ok) {
        const members = await response.json();
        return members;
      } else {
        throw new Error(`Failed to fetch league members: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching league members:', error);
      throw error;
    }
  }

  async createDraft(request: CreateDraftRequest): Promise<DraftState> {
    try {
      const response = await apiRequest(`/api/draft/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const draft = await response.json();
        return draft;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create draft');
      }
    } catch (error) {
      console.error('Error creating draft:', error);
      throw error;
    }
  }

  async startDraft(draftId: number): Promise<DraftState> {
    try {
      const response = await apiRequest(`/api/draft/${draftId}/start`, {
        method: 'POST',
      });

      if (response.ok) {
        const draft = await response.json();
        return draft;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start draft');
      }
    } catch (error) {
      console.error('Error starting draft:', error);
      throw error;
    }
  }

  async makeDraftPick(draftId: number, request: MakeDraftPickRequest): Promise<DraftPickResponse> {
    try {
      const response = await apiRequest(`/api/draft/${draftId}/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const pickResult = await response.json();
        return pickResult;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to make draft pick');
      }
    } catch (error) {
      console.error('Error making draft pick:', error);
      throw error;
    }
  }

  async resetDraft(draftId: number): Promise<DraftState> {
    try {
      const response = await apiRequest(`/api/draft/${draftId}/reset`, {
        method: 'POST',
      });

      if (response.ok) {
        const draft = await response.json();
        return draft;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset draft');
      }
    } catch (error) {
      console.error('Error resetting draft:', error);
      throw error;
    }
  }

  // Helper method to convert Player to draft pick request
  playerToDraftPickRequest(userId: number, player: Player): MakeDraftPickRequest {
    return {
      userId,
      playerName: player.name,
      playerPosition: player.position,
      playerTeam: player.team,
      playerLeague: player.league,
    };
  }

  // Helper method to convert draft pick response to Player
  draftPickToPlayer(draftPick: DraftPick): Player {
    // Import players data to find the actual player
    const { players } = require('../data/players');
    
    // Find the actual player by name, team, and league
    const actualPlayer = players.find((player: any) => 
      player.name === draftPick.playerName && 
      player.team === draftPick.playerTeam &&
      player.league === draftPick.playerLeague
    );
    
    if (actualPlayer) {
      return actualPlayer;
    }
    
    // Fallback to synthetic player if not found (shouldn't happen)
    return {
      id: `${draftPick.playerLeague}-${draftPick.playerName}`, // Synthetic ID
      name: draftPick.playerName,
      position: draftPick.playerPosition,
      team: draftPick.playerTeam,
      league: draftPick.playerLeague as 'NFL' | 'MLB' | 'NBA',
    } as Player;
  }

  // Auto-draft logic - select best available player for given requirements
  selectBestAvailablePlayer(
    availablePlayers: Player[],
    neededPositions: string[],
    draftedPlayers: Player[]
  ): Player | null {
    // Get players that haven't been drafted
    const undraftedPlayers = availablePlayers.filter(player => 
      !draftedPlayers.some(drafted => drafted.id === player.id)
    );

    if (undraftedPlayers.length === 0) {
      return null;
    }

    // If we have needed positions, prioritize those
    if (neededPositions.length > 0) {
      const neededPlayers = undraftedPlayers.filter(player =>
        neededPositions.includes(player.position)
      );
      
      if (neededPlayers.length > 0) {
        // Prioritize positions that aren't RB or WR (unless they're the only options)
        const nonRBWRPlayers = neededPlayers.filter(player => 
          !['RB', 'WR'].includes(player.position)
        );
        
        if (nonRBWRPlayers.length > 0) {
          return nonRBWRPlayers[Math.floor(Math.random() * nonRBWRPlayers.length)];
        } else {
          return neededPlayers[Math.floor(Math.random() * neededPlayers.length)];
        }
      }
    }

    // Fallback to random available player
    return undraftedPlayers[Math.floor(Math.random() * undraftedPlayers.length)];
  }
}

export const draftService = new DraftService();