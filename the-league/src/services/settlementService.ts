// Automated bet settlement service
import { BetStatus, bettingService } from './bettingService';

export interface GameResult {
  gameId: number;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  finalTotal: number;
  gameStatus: 'Final' | 'Completed' | 'In Progress' | 'Scheduled';
  completedAt: string;
}

export interface SettlementResult {
  betId: number;
  originalStatus: BetStatus;
  newStatus: BetStatus;
  payout?: number;
  reason: string;
  settledAt: string;
}

export interface SettlementReport {
  gameId: number;
  gameInfo: string;
  totalBetsSettled: number;
  winnersCount: number;
  losersCount: number;
  pushesCount: number;
  totalPayouts: number;
  settlementResults: SettlementResult[];
}

export interface AutoSettlementConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxBetsPerRun: number;
  retryFailedSettlements: boolean;
  notifications: {
    enabled: boolean;
    onBatchComplete: boolean;
    onErrors: boolean;
  };
}

// Game result fetching service
class GameResultService {
  private readonly API_BASE = process.env.NODE_ENV === 'production'
    ? 'https://the-league-api-1ff2960f0715.herokuapp.com/api'
    : 'http://localhost:5000/api';

  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Fetch completed games from ESPN API or our backend
  async getCompletedGames(sport?: string, since?: string): Promise<GameResult[]> {
    try {
      const params = new URLSearchParams();
      if (sport) params.append('sport', sport);
      if (since) params.append('since', since);

      const response = await fetch(`${this.API_BASE}/games/completed?${params}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Endpoint not implemented yet, return mock data
          console.warn('Completed games endpoint not available, using mock data');
          return [
            {
              gameId: 101,
              sport: 'NFL',
              homeTeam: 'Chiefs',
              awayTeam: 'Bills',
              homeScore: 28,
              awayScore: 24,
              finalTotal: 52,
              gameStatus: 'Final',
              completedAt: new Date().toISOString()
            },
            {
              gameId: 102,
              sport: 'NFL',
              homeTeam: 'Cowboys',
              awayTeam: 'Giants',
              homeScore: 21,
              awayScore: 14,
              finalTotal: 35,
              gameStatus: 'Final',
              completedAt: new Date().toISOString()
            }
          ];
        }
        throw new Error('Failed to fetch completed games');
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error or server not available
        console.warn('Games API not available, using mock completed games');
        return [];
      }
      throw error;
    }
  }

  // Get specific game result
  async getGameResult(gameId: number): Promise<GameResult | null> {
    try {
      const response = await fetch(`${this.API_BASE}/games/${gameId}/result`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Game result endpoint not available or game not found
          console.warn(`Game result endpoint not available for game ${gameId}, using mock data`);

          // Return mock game result based on gameId
          const mockResults: Record<number, GameResult> = {
            101: {
              gameId: 101,
              sport: 'NFL',
              homeTeam: 'Chiefs',
              awayTeam: 'Bills',
              homeScore: 28,
              awayScore: 24,
              finalTotal: 52,
              gameStatus: 'Final',
              completedAt: new Date().toISOString()
            },
            102: {
              gameId: 102,
              sport: 'NFL',
              homeTeam: 'Cowboys',
              awayTeam: 'Giants',
              homeScore: 21,
              awayScore: 14,
              finalTotal: 35,
              gameStatus: 'Final',
              completedAt: new Date().toISOString()
            }
          };

          return mockResults[gameId] || null;
        }
        throw new Error('Failed to fetch game result');
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error or server not available
        console.warn(`Game result API not available for game ${gameId}`);
        return null;
      }
      throw error;
    }
  }
}

// Bet settlement logic
class BetSettlementEngine {

  // Determine if a spread bet won, lost, or pushed
  private settleSpreadBet(
    selection: string,
    pointSpread: number,
    homeScore: number,
    awayScore: number
  ): BetStatus {
    const scoreDifference = homeScore - awayScore; // Positive if home wins
    const adjustedSpread = pointSpread; // Home team spread

    if (selection.includes('Home') || selection.includes('Team1')) {
      // Betting on home team
      const coverMargin = scoreDifference + adjustedSpread;
      if (coverMargin > 0) return BetStatus.Won;
      if (coverMargin < 0) return BetStatus.Lost;
      return BetStatus.Push; // Exact cover
    } else {
      // Betting on away team
      const coverMargin = -scoreDifference + Math.abs(adjustedSpread);
      if (coverMargin > 0) return BetStatus.Won;
      if (coverMargin < 0) return BetStatus.Lost;
      return BetStatus.Push; // Exact cover
    }
  }

  // Determine if a moneyline bet won or lost
  private settleMoneylineBet(
    selection: string,
    homeScore: number,
    awayScore: number
  ): BetStatus {
    const homeWon = homeScore > awayScore;

    if (selection.includes('Home') || selection.includes('Team1')) {
      return homeWon ? BetStatus.Won : BetStatus.Lost;
    } else {
      return homeWon ? BetStatus.Lost : BetStatus.Won;
    }
  }

  // Determine if an over/under bet won, lost, or pushed
  private settleOverUnderBet(
    selection: string,
    overUnderLine: number,
    finalTotal: number
  ): BetStatus {
    if (selection === 'Over') {
      if (finalTotal > overUnderLine) return BetStatus.Won;
      if (finalTotal < overUnderLine) return BetStatus.Lost;
      return BetStatus.Push; // Exact total
    } else {
      if (finalTotal < overUnderLine) return BetStatus.Won;
      if (finalTotal > overUnderLine) return BetStatus.Lost;
      return BetStatus.Push; // Exact total
    }
  }

  // Main settlement logic for a single bet
  async settleBet(bet: any, gameResult: GameResult): Promise<SettlementResult> {
    let newStatus: BetStatus;
    let reason: string;

    try {
      // Determine bet outcome based on bet type
      switch (bet.betType) {
        case 1: // MatchupSpread
        case 4: // GameSpread
          newStatus = this.settleSpreadBet(
            bet.selection,
            bet.pointSpread || 0,
            gameResult.homeScore,
            gameResult.awayScore
          );
          reason = `Spread bet: ${bet.selection} with spread ${bet.pointSpread}. Final: ${gameResult.homeTeam} ${gameResult.homeScore} - ${gameResult.awayTeam} ${gameResult.awayScore}`;
          break;

        case 2: // MatchupMoneyline
        case 5: // GameMoneyline
          newStatus = this.settleMoneylineBet(
            bet.selection,
            gameResult.homeScore,
            gameResult.awayScore
          );
          reason = `Moneyline bet: ${bet.selection}. Final: ${gameResult.homeTeam} ${gameResult.homeScore} - ${gameResult.awayTeam} ${gameResult.awayScore}`;
          break;

        case 3: // MatchupOverUnder
        case 6: // GameOverUnder
          newStatus = this.settleOverUnderBet(
            bet.selection,
            bet.overUnderLine || 0,
            gameResult.finalTotal
          );
          reason = `Over/Under bet: ${bet.selection} ${bet.overUnderLine}. Final total: ${gameResult.finalTotal}`;
          break;

        default:
          throw new Error(`Unsupported bet type: ${bet.betType}`);
      }

      // Calculate payout for winning bets
      let payout = 0;
      if (newStatus === BetStatus.Won) {
        payout = bet.potentialPayout;
      } else if (newStatus === BetStatus.Push) {
        payout = bet.amount; // Return original bet amount
      }

      return {
        betId: bet.id,
        originalStatus: bet.status,
        newStatus,
        payout: payout > 0 ? payout : undefined,
        reason,
        settledAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error settling bet ${bet.id}:`, error);
      throw error;
    }
  }
}

// Main settlement service
export class SettlementService {
  private gameResultService: GameResultService;
  private settlementEngine: BetSettlementEngine;
  private config: AutoSettlementConfig;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config?: Partial<AutoSettlementConfig>) {
    this.gameResultService = new GameResultService();
    this.settlementEngine = new BetSettlementEngine();
    this.config = {
      enabled: true,
      intervalMinutes: 15,
      maxBetsPerRun: 100,
      retryFailedSettlements: true,
      notifications: {
        enabled: true,
        onBatchComplete: true,
        onErrors: true
      },
      ...config
    };
  }

  // Start automated settlement monitoring
  start(): void {
    if (this.isRunning) {
      console.log('Settlement service is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting automated bet settlement (interval: ${this.config.intervalMinutes} minutes)`);

    // Run immediately, then on interval
    this.runSettlementBatch();
    this.intervalId = setInterval(() => {
      this.runSettlementBatch();
    }, this.config.intervalMinutes * 60 * 1000);
  }

  // Stop automated settlement monitoring
  stop(): void {
    if (!this.isRunning) {
      console.log('Settlement service is not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('Stopped automated bet settlement');
  }

  // Run a single settlement batch
  async runSettlementBatch(): Promise<SettlementReport[]> {
    if (!this.config.enabled) {
      console.log('Auto-settlement is disabled');
      return [];
    }

    console.log('Running settlement batch...');

    try {
      // Get pending settlements (bets that need to be settled)
      const pendingBets = await bettingService.getPendingSettlements();

      if (pendingBets.length === 0) {
        console.log('No pending bets to settle');
        return [];
      }

      console.log(`Found ${pendingBets.length} pending bets to settle`);

      // Group bets by game
      const betsByGame = this.groupBetsByGame(pendingBets);
      const reports: SettlementReport[] = [];

      // Process each game
      for (const [gameId, bets] of Array.from(betsByGame.entries())) {
        try {
          const report = await this.settleGameBets(gameId, bets);
          if (report) {
            reports.push(report);
          }
        } catch (error) {
          console.error(`Failed to settle bets for game ${gameId}:`, error);
          if (this.config.notifications.onErrors) {
            this.notifyError(`Failed to settle game ${gameId}`, error);
          }
        }
      }

      if (this.config.notifications.onBatchComplete && reports.length > 0) {
        this.notifyBatchComplete(reports);
      }

      return reports;

    } catch (error) {
      console.error('Error in settlement batch:', error);
      if (this.config.notifications.onErrors) {
        this.notifyError('Settlement batch failed', error);
      }
      return [];
    }
  }

  // Group bets by their associated game
  private groupBetsByGame(bets: any[]): Map<number, any[]> {
    const gameGroups = new Map<number, any[]>();

    for (const bet of bets) {
      const gameId = bet.gameBetId || bet.matchupBetId || 0;
      if (!gameGroups.has(gameId)) {
        gameGroups.set(gameId, []);
      }
      gameGroups.get(gameId)!.push(bet);
    }

    return gameGroups;
  }

  // Settle all bets for a specific game
  private async settleGameBets(gameId: number, bets: any[]): Promise<SettlementReport | null> {
    try {
      // Get game result
      const gameResult = await this.gameResultService.getGameResult(gameId);

      if (!gameResult || gameResult.gameStatus !== 'Final') {
        console.log(`Game ${gameId} not yet final, skipping settlement`);
        return null;
      }

      console.log(`Settling ${bets.length} bets for game ${gameId}`);

      const settlementResults: SettlementResult[] = [];
      let winnersCount = 0;
      let losersCount = 0;
      let pushesCount = 0;
      let totalPayouts = 0;

      // Process each bet
      for (const bet of bets.slice(0, this.config.maxBetsPerRun)) {
        try {
          const result = await this.settlementEngine.settleBet(bet, gameResult);

          // Apply settlement through API
          await bettingService.forceSettlement(
            bet.id,
            result.newStatus,
            result.reason
          );

          settlementResults.push(result);

          // Update counters
          switch (result.newStatus) {
            case BetStatus.Won:
              winnersCount++;
              if (result.payout) totalPayouts += result.payout;
              break;
            case BetStatus.Lost:
              losersCount++;
              break;
            case BetStatus.Push:
              pushesCount++;
              if (result.payout) totalPayouts += result.payout;
              break;
          }

        } catch (error) {
          console.error(`Failed to settle bet ${bet.id}:`, error);
        }
      }

      const report: SettlementReport = {
        gameId,
        gameInfo: `${gameResult.awayTeam} @ ${gameResult.homeTeam} (${gameResult.homeScore}-${gameResult.awayScore})`,
        totalBetsSettled: settlementResults.length,
        winnersCount,
        losersCount,
        pushesCount,
        totalPayouts,
        settlementResults
      };

      console.log(`Settled ${settlementResults.length} bets for game ${gameId}`);
      return report;

    } catch (error) {
      console.error(`Error settling game ${gameId}:`, error);
      throw error;
    }
  }

  // Manual settlement trigger for specific games
  async settleGame(gameId: number): Promise<SettlementReport | null> {
    console.log(`Manual settlement triggered for game ${gameId}`);

    try {
      // Get all pending bets for this game
      const allPendingBets = await bettingService.getPendingSettlements();
      const gameBets = allPendingBets.filter(bet =>
        bet.gameBetId === gameId || bet.matchupBetId === gameId
      );

      if (gameBets.length === 0) {
        console.log(`No pending bets found for game ${gameId}`);
        return null;
      }

      return await this.settleGameBets(gameId, gameBets);

    } catch (error) {
      console.error(`Manual settlement failed for game ${gameId}:`, error);
      throw error;
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<AutoSettlementConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Settlement service configuration updated');

    // Restart if interval changed and service is running
    if (this.isRunning && newConfig.intervalMinutes) {
      this.stop();
      this.start();
    }
  }

  // Get current configuration
  getConfig(): AutoSettlementConfig {
    return { ...this.config };
  }

  // Get service status
  getStatus(): { isRunning: boolean; config: AutoSettlementConfig } {
    return {
      isRunning: this.isRunning,
      config: this.getConfig()
    };
  }

  // Notification helpers
  private notifyBatchComplete(reports: SettlementReport[]): void {
    const totalBets = reports.reduce((sum, r) => sum + r.totalBetsSettled, 0);
    const totalPayouts = reports.reduce((sum, r) => sum + r.totalPayouts, 0);

    console.log(`Settlement batch complete: ${totalBets} bets settled, $${totalPayouts.toFixed(2)} in payouts`);

    // In a real app, this could send notifications to admins
    // this.notificationService.send({
    //   type: 'settlement_batch_complete',
    //   data: { totalBets, totalPayouts, reports }
    // });
  }

  private notifyError(message: string, error: any): void {
    console.error(message, error);

    // In a real app, this could send error notifications
    // this.notificationService.send({
    //   type: 'settlement_error',
    //   data: { message, error: error.message }
    // });
  }
}

// Export singleton instance
export const settlementService = new SettlementService();

// Auto-start in production or when explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.REACT_APP_AUTO_SETTLEMENT === 'true') {
  settlementService.start();
}