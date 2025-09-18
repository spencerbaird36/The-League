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

  async startDraft(draftId: number, userId: number): Promise<DraftState> {
    try {
      const response = await apiRequest(`/api/draft/${draftId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId
        }),
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
    
    let cleanPlayerName = draftPick.playerName;
    let extractedPlayerId: string | null = null;
    
    // First, check if the player name contains an ID prefix (e.g., "aaron-rodgers:Aaron Rodgers")
    const idPrefixMatch = cleanPlayerName.match(/^([^:]+):(.+)$/);
    if (idPrefixMatch) {
      extractedPlayerId = idPrefixMatch[1].trim();
      cleanPlayerName = idPrefixMatch[2].trim();
    }
    
    // Then, remove "(AUTO)" suffix for auto-drafted players
    cleanPlayerName = cleanPlayerName.replace(/\s*\(AUTO\)\s*$/, '').trim();
    
    
    // If we extracted a player ID from the prefix, try to find by ID first
    if (extractedPlayerId) {
      const playerById = players.find((player: any) => player.id === extractedPlayerId);
      if (playerById) {
        return playerById;
      }
    }
    
    // Find the actual player by cleaned name, team, and league
    const actualPlayer = players.find((player: any) => 
      player.name === cleanPlayerName && 
      player.team === draftPick.playerTeam &&
      player.league === draftPick.playerLeague
    );
    
    if (actualPlayer) {
      console.log(`✅ Found actual player by name: ${actualPlayer.name} (${actualPlayer.id})`);
      return actualPlayer;
    }
    
    
    // Fallback to synthetic player if not found (shouldn't happen)
    return {
      id: extractedPlayerId || `${draftPick.playerLeague}-${cleanPlayerName.toLowerCase().replace(/\s+/g, '-')}`, // Use extracted ID or generate one
      name: cleanPlayerName, // Use cleaned name without (AUTO) suffix
      position: draftPick.playerPosition,
      team: draftPick.playerTeam,
      league: draftPick.playerLeague as 'NFL' | 'MLB' | 'NBA',
    } as Player;
  }

  // Auto-draft logic - select best available player based on projected points
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

    // Helper function to get player's projected fantasy points (default to 0 if missing)
    const getProjectedPoints = (player: Player): number => {
      return player.projection?.fantasyPoints || 0;
    };

    // Priority positions to target first: SS, OF, PG, RB, WR
    const priorityPositions = ['SS', 'OF', 'PG', 'RB', 'WR'];

    // Check if we should prioritize filling needed positions first
    if (neededPositions.length > 0) {
      const neededPlayers = undraftedPlayers.filter(player =>
        neededPositions.includes(player.position)
      );

      if (neededPlayers.length > 0) {
        // Within needed positions, prioritize our target positions first
        const neededPriorityPlayers = neededPlayers.filter(player =>
          priorityPositions.includes(player.position)
        );

        if (neededPriorityPlayers.length > 0) {
          // Sort by projected points (highest first) and take the best
          neededPriorityPlayers.sort((a, b) => getProjectedPoints(b) - getProjectedPoints(a));
          console.log(`🎯 Auto-drafting priority position ${neededPriorityPlayers[0].position}: ${neededPriorityPlayers[0].name} (${getProjectedPoints(neededPriorityPlayers[0])} pts)`);
          return neededPriorityPlayers[0];
        }

        // If no priority positions in needed, take best available needed position
        neededPlayers.sort((a, b) => getProjectedPoints(b) - getProjectedPoints(a));
        console.log(`🎯 Auto-drafting needed position ${neededPlayers[0].position}: ${neededPlayers[0].name} (${getProjectedPoints(neededPlayers[0])} pts)`);
        return neededPlayers[0];
      }
    }

    // If no specific position needs, prioritize our target positions
    const availablePriorityPlayers = undraftedPlayers.filter(player =>
      priorityPositions.includes(player.position)
    );

    if (availablePriorityPlayers.length > 0) {
      // Sort by projected points (highest first) and take the best
      availablePriorityPlayers.sort((a, b) => getProjectedPoints(b) - getProjectedPoints(a));
      console.log(`🎯 Auto-drafting priority position ${availablePriorityPlayers[0].position}: ${availablePriorityPlayers[0].name} (${getProjectedPoints(availablePriorityPlayers[0])} pts)`);
      return availablePriorityPlayers[0];
    }

    // Fallback: draft the highest projected points player across all remaining sports
    undraftedPlayers.sort((a, b) => getProjectedPoints(b) - getProjectedPoints(a));
    console.log(`🎯 Auto-drafting best remaining player: ${undraftedPlayers[0].name} (${undraftedPlayers[0].position}, ${getProjectedPoints(undraftedPlayers[0])} pts)`);
    return undraftedPlayers[0];
  }

  // Get available players for a draft
  async fetchAvailablePlayersForDraft(leagueId: number): Promise<Player[]> {
    try {
      const response = await apiRequest(`/api/draft/league/${leagueId}/available-players`);
      if (response.ok) {
        const data = await response.json();
        console.log(`🔍 Fetched ${data.availablePlayers} available players out of ${data.totalPlayers} total (${data.draftedPlayers} drafted)`);
        
        // Convert backend format to Player format
        return data.players.map((player: any) => ({
          id: player.id,
          name: player.name,
          position: player.position,
          team: player.team,
          league: player.league as 'NFL' | 'NBA' | 'MLB',
          projection: player.projection ? {
            fantasyPoints: player.projection.fantasyPoints,
            // NFL specific
            passingYards: player.projection.passingYards,
            passingTouchdowns: player.projection.passingTouchdowns,
            rushingYards: player.projection.rushingYards,
            rushingTouchdowns: player.projection.rushingTouchdowns,
            receivingYards: player.projection.receivingYards,
            receivingTouchdowns: player.projection.receivingTouchdowns,
            fieldGoalsMade: player.projection.fieldGoalsMade,
            // NBA specific
            points: player.projection.points,
            rebounds: player.projection.rebounds,
            assists: player.projection.assists,
            steals: player.projection.steals,
            blocks: player.projection.blocks,
            turnovers: player.projection.turnovers,
            // MLB specific
            runs: player.projection.runs,
            hits: player.projection.hits,
            homeRuns: player.projection.homeRuns,
            battingAverage: player.projection.battingAverage,
            runsBattedIn: player.projection.runsBattedIn,
            stolenBases: player.projection.stolenBases,
            wins: player.projection.wins,
            saves: player.projection.saves,
            strikeouts: player.projection.strikeouts,
            whip: player.projection.whip
          } : undefined
        } as Player));
      } else {
        throw new Error(`Failed to fetch available players: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching available players:', error);
      throw error;
    }
  }
}

export const draftService = new DraftService();