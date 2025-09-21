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

  // Enhanced auto-draft logic - smart position prioritization with multi-league balancing
  selectBestAvailablePlayer(
    availablePlayers: Player[],
    neededPositions: string[],
    draftedPlayers: Player[]
  ): Player | null {
    console.log('🤖 ===== DRAFT SERVICE: selectBestAvailablePlayer CALLED =====');
    console.log(`🤖 Available players: ${availablePlayers.length}, Needed positions: ${neededPositions.length}, Drafted players: ${draftedPlayers.length}`);
    // Get players that haven't been drafted
    const undraftedPlayers = availablePlayers.filter(player =>
      !draftedPlayers.some(drafted => drafted.id === player.id)
    );

    if (undraftedPlayers.length === 0) {
      return null;
    }

    // Helper function to get player's projected fantasy points (default to 0 if missing)
    const getProjectedPoints = (player: Player): number => {
      const points = player.projection?.fantasyPoints || 0;
      return points;
    };

    // Count current draft distribution by league
    const leagueCounts = draftedPlayers.reduce((counts, player) => {
      counts[player.league] = (counts[player.league] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Updated priority positions: RB, WR, SF, C, SS, 2B first
    const highPriorityPositions = ['RB', 'WR', 'SF', 'C', 'SS', '2B'];
    const mediumPriorityPositions = ['QB', 'TE', 'OF', 'SP', 'CP', 'PG', 'SG', 'PF'];

    // Helper function to determine league balance priority
    const getLeagueBalancePriority = (player: Player): number => {
      const currentCount = leagueCounts[player.league] || 0;
      const totalDrafted = Object.values(leagueCounts).reduce((sum, count) => sum + count, 0);

      if (totalDrafted === 0) return 1; // First few picks, any league is fine

      // Calculate how underrepresented this league is
      const expectedPercentage = 0.33; // Aim for roughly equal distribution
      const actualPercentage = currentCount / totalDrafted;
      const underrepresentation = expectedPercentage - actualPercentage;

      // Return priority score (higher = more needed)
      return Math.max(0, underrepresentation * 3) + 1;
    };

    // Helper function to calculate combined score
    const getPlayerScore = (player: Player): number => {
      const fantasyPoints = getProjectedPoints(player);
      const leagueBalance = getLeagueBalancePriority(player);

      // Fantasy points should be the PRIMARY factor
      // Base score heavily weighted on fantasy points (multiply by 100 to make it dominant)
      const baseScore = fantasyPoints * 100;

      // Position priority bonus (additive, not multiplicative)
      let positionBonus = 0;
      if (highPriorityPositions.includes(player.position)) {
        positionBonus = 50; // 50 point bonus for high priority positions
      } else if (mediumPriorityPositions.includes(player.position)) {
        positionBonus = 20; // 20 point bonus for medium priority positions
      }

      // League balance bonus (smaller additive bonus, max 30 points)
      const leagueBonus = Math.min((leagueBalance - 1) * 10, 30);

      // Combine: fantasy points (primary) + position bonus + league balance bonus
      return baseScore + positionBonus + leagueBonus;
    };

    console.log('🎯 Auto-draft analysis:');
    console.log('📊 League distribution:', leagueCounts);

    // Debug: Log fantasy points distribution
    const playersWithPoints = undraftedPlayers.filter(p => getProjectedPoints(p) > 0);
    const playersWithoutPoints = undraftedPlayers.filter(p => getProjectedPoints(p) === 0);

    console.log(`📊 Fantasy points distribution: ${playersWithPoints.length} players with points, ${playersWithoutPoints.length} without`);

    // Debug: Log top 10 players by fantasy points
    const topPlayersByFantasyPoints = undraftedPlayers
      .sort((a, b) => getProjectedPoints(b) - getProjectedPoints(a))
      .slice(0, 10);
    console.log('🏆 Top 10 players by fantasy points:');
    topPlayersByFantasyPoints.forEach((player, index) => {
      console.log(`   ${index + 1}. ${player.name} (${player.position}, ${player.league}): ${getProjectedPoints(player)} fantasy points`);
    });

    // Check specifically for Caleb Martin to debug why he might be selected
    const calebMartin = undraftedPlayers.find(p => p.name.toLowerCase().includes('caleb martin'));
    if (calebMartin) {
      console.log('🏀 Caleb Martin analysis:');
      console.log(`   Name: ${calebMartin.name}`);
      console.log(`   Position: ${calebMartin.position}`);
      console.log(`   League: ${calebMartin.league}`);
      console.log(`   Fantasy Points: ${getProjectedPoints(calebMartin)}`);
      console.log(`   Total Score: ${getPlayerScore(calebMartin)}`);
      console.log(`   Full projection:`, calebMartin.projection);
      console.log(`   Is high priority position? ${highPriorityPositions.includes(calebMartin.position)}`);
    }

    // If most players have 0 fantasy points, there might be an issue with projection data
    if (playersWithoutPoints.length > playersWithPoints.length) {
      console.warn('⚠️  WARNING: Most players have 0 fantasy points! Check projection data.');

      // If ALL players have 0 fantasy points, we need to fall back to a simpler algorithm
      if (playersWithPoints.length === 0) {
        console.error('🚨 CRITICAL: NO PLAYERS HAVE FANTASY POINTS! Using fallback selection...');

        // Fallback: Just pick the first high-priority position player alphabetically
        // This is better than random selection based on tiny bonuses
        const fallbackPlayer = undraftedPlayers
          .filter(p => highPriorityPositions.includes(p.position))
          .sort((a, b) => a.name.localeCompare(b.name))[0];

        if (fallbackPlayer) {
          console.log(`🔄 Fallback selection: ${fallbackPlayer.name} (${fallbackPlayer.position})`);
          return fallbackPlayer;
        }
      }
    }

    // Phase 1: Check if we have specific position needs
    if (neededPositions.length > 0) {
      const neededPlayers = undraftedPlayers.filter(player =>
        neededPositions.includes(player.position)
      );

      if (neededPlayers.length > 0) {
        // Sort needed players by combined score (fantasy points + position priority + league balance)
        neededPlayers.sort((a, b) => getPlayerScore(b) - getPlayerScore(a));

        const selectedPlayer = neededPlayers[0];
        console.log(`🎯 Auto-drafting NEEDED position ${selectedPlayer.position} (${selectedPlayer.league}): ${selectedPlayer.name}`);
        console.log(`   📈 Fantasy Points: ${getProjectedPoints(selectedPlayer)} | Score: ${getPlayerScore(selectedPlayer).toFixed(1)}`);
        console.log(`   🔧 Full projection data:`, selectedPlayer.projection);

        // Show top 5 needed players for comparison
        console.log(`   🏆 Top 5 needed players of this position:`);
        neededPlayers.slice(0, 5).forEach((player, index) => {
          console.log(`      ${index + 1}. ${player.name}: ${getProjectedPoints(player)} fantasy points (Score: ${getPlayerScore(player).toFixed(1)})`);
        });

        return selectedPlayer;
      }
    }

    // Phase 2: No specific needs, prioritize high-value positions with league balance
    const highPriorityPlayers = undraftedPlayers.filter(player =>
      highPriorityPositions.includes(player.position)
    );

    if (highPriorityPlayers.length > 0) {
      // Sort by combined score
      highPriorityPlayers.sort((a, b) => getPlayerScore(b) - getPlayerScore(a));

      const selectedPlayer = highPriorityPlayers[0];
      console.log(`🎯 Auto-drafting HIGH PRIORITY position ${selectedPlayer.position} (${selectedPlayer.league}): ${selectedPlayer.name}`);
      console.log(`   📈 Fantasy Points: ${getProjectedPoints(selectedPlayer)} | Score: ${getPlayerScore(selectedPlayer).toFixed(1)}`);
      console.log(`   🔧 Full projection data:`, selectedPlayer.projection);

      // Show top 5 high priority players for comparison
      console.log(`   🏆 Top 5 high priority players:`);
      highPriorityPlayers.slice(0, 5).forEach((player, index) => {
        console.log(`      ${index + 1}. ${player.name}: ${getProjectedPoints(player)} fantasy points (Score: ${getPlayerScore(player).toFixed(1)})`);
      });

      return selectedPlayer;
    }

    // Phase 3: Medium priority positions
    const mediumPriorityPlayers = undraftedPlayers.filter(player =>
      mediumPriorityPositions.includes(player.position)
    );

    if (mediumPriorityPlayers.length > 0) {
      // Sort by combined score
      mediumPriorityPlayers.sort((a, b) => getPlayerScore(b) - getPlayerScore(a));

      const selectedPlayer = mediumPriorityPlayers[0];
      console.log(`🎯 Auto-drafting MEDIUM PRIORITY position ${selectedPlayer.position} (${selectedPlayer.league}): ${selectedPlayer.name}`);
      console.log(`   📈 Fantasy Points: ${getProjectedPoints(selectedPlayer)} | Score: ${getPlayerScore(selectedPlayer).toFixed(1)}`);
      return selectedPlayer;
    }

    // Phase 4: Fallback to best available player overall with league balance
    undraftedPlayers.sort((a, b) => getPlayerScore(b) - getPlayerScore(a));

    const selectedPlayer = undraftedPlayers[0];
    console.log(`🎯 Auto-drafting BEST REMAINING ${selectedPlayer.position} (${selectedPlayer.league}): ${selectedPlayer.name}`);
    console.log(`   📈 Fantasy Points: ${getProjectedPoints(selectedPlayer)} | Score: ${getPlayerScore(selectedPlayer).toFixed(1)}`);
    return selectedPlayer;
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