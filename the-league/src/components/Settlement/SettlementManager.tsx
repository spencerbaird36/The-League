import React, { useState, useEffect, useCallback } from 'react';
import { settlementService, SettlementReport, AutoSettlementConfig } from '../../services/settlementService';
import { bettingService } from '../../services/bettingService';
import './SettlementManager.css';

interface SettlementManagerProps {
  className?: string;
}

interface ServiceStatus {
  isRunning: boolean;
  config: AutoSettlementConfig;
}

export const SettlementManager: React.FC<SettlementManagerProps> = ({ className }) => {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [pendingSettlements, setPendingSettlements] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<SettlementReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settlingGame, setSettlingGame] = useState<number | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get service status
      const serviceStatus = settlementService.getStatus();
      setStatus(serviceStatus);

      // Get pending settlements
      const pending = await bettingService.getPendingSettlements();
      setPendingSettlements(pending);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Toggle auto-settlement service
  const toggleService = () => {
    if (status?.isRunning) {
      settlementService.stop();
    } else {
      settlementService.start();
    }

    // Update status
    const newStatus = settlementService.getStatus();
    setStatus(newStatus);
  };

  // Update configuration
  const updateConfig = (newConfig: Partial<AutoSettlementConfig>) => {
    settlementService.updateConfig(newConfig);
    const updatedStatus = settlementService.getStatus();
    setStatus(updatedStatus);
  };

  // Run manual settlement batch
  const runManualBatch = async () => {
    try {
      setLoading(true);
      setError(null);

      const reports = await settlementService.runSettlementBatch();
      setRecentReports(prev => [...reports, ...prev].slice(0, 10)); // Keep last 10 reports

      // Refresh pending settlements
      await loadData();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run settlement batch');
    } finally {
      setLoading(false);
    }
  };

  // Settle specific game
  const settleSpecificGame = async (gameId: number) => {
    try {
      setSettlingGame(gameId);
      setError(null);

      const report = await settlementService.settleGame(gameId);

      if (report) {
        setRecentReports(prev => [report, ...prev].slice(0, 10));
      }

      // Refresh data
      await loadData();

    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to settle game ${gameId}`);
    } finally {
      setSettlingGame(null);
    }
  };

  // Group pending settlements by game
  const groupedPendingSettlements = pendingSettlements.reduce((groups, bet) => {
    const gameId = bet.gameBetId || bet.matchupBetId || 0;
    const gameKey = `${gameId}_${bet.gameInfo || bet.description || 'Unknown Game'}`;

    if (!groups[gameKey]) {
      groups[gameKey] = {
        gameId,
        gameInfo: bet.gameInfo || bet.description || 'Unknown Game',
        bets: []
      };
    }
    groups[gameKey].bets.push(bet);

    return groups;
  }, {} as Record<string, { gameId: number; gameInfo: string; bets: any[] }>);

  type GroupedGame = { gameId: number; gameInfo: string; bets: any[] };

  if (loading && !status) {
    return <div className={`settlement-manager ${className || ''}`}>
      <div className="loading">Loading settlement data...</div>
    </div>;
  }

  return (
    <div className={`settlement-manager ${className || ''}`}>
      <div className="settlement-header">
        <h3>Bet Settlement Management</h3>
        <div className="settlement-actions">
          <button
            className={`service-toggle-btn ${status?.isRunning ? 'running' : 'stopped'}`}
            onClick={toggleService}
          >
            {status?.isRunning ? '⏸️ Stop Auto-Settlement' : '▶️ Start Auto-Settlement'}
          </button>
          <button
            className="manual-batch-btn"
            onClick={runManualBatch}
            disabled={loading}
          >
            🔄 Run Manual Batch
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Service Status */}
      <div className="service-status">
        <div className="status-card">
          <h4>Service Status</h4>
          <div className={`status-indicator ${status?.isRunning ? 'running' : 'stopped'}`}>
            <span className="status-dot"></span>
            {status?.isRunning ? 'Running' : 'Stopped'}
          </div>
          {status?.isRunning && (
            <p>Next run in ~{status.config.intervalMinutes} minutes</p>
          )}
        </div>

        <div className="config-card">
          <h4>Configuration</h4>
          <div className="config-item">
            <label>
              Interval (minutes):
              <input
                type="number"
                value={status?.config.intervalMinutes || 15}
                onChange={(e) => updateConfig({ intervalMinutes: parseInt(e.target.value) })}
                min="1"
                max="120"
              />
            </label>
          </div>
          <div className="config-item">
            <label>
              Max bets per run:
              <input
                type="number"
                value={status?.config.maxBetsPerRun || 100}
                onChange={(e) => updateConfig({ maxBetsPerRun: parseInt(e.target.value) })}
                min="1"
                max="1000"
              />
            </label>
          </div>
          <div className="config-item">
            <label>
              <input
                type="checkbox"
                checked={status?.config.enabled || false}
                onChange={(e) => updateConfig({ enabled: e.target.checked })}
              />
              Auto-settlement enabled
            </label>
          </div>
        </div>
      </div>

      {/* Pending Settlements */}
      <div className="pending-settlements">
        <h4>Pending Settlements ({pendingSettlements.length} bets)</h4>
        {Object.keys(groupedPendingSettlements).length === 0 ? (
          <div className="no-pending">No pending settlements</div>
        ) : (
          <div className="pending-games">
            {(Object.values(groupedPendingSettlements) as GroupedGame[]).map((game) => (
              <div key={`${game.gameId}_${game.gameInfo}`} className="pending-game">
                <div className="game-header">
                  <div className="game-info">
                    <strong>{game.gameInfo}</strong>
                    <span className="bet-count">{game.bets.length} bets</span>
                  </div>
                  <button
                    className="settle-game-btn"
                    onClick={() => settleSpecificGame(game.gameId)}
                    disabled={settlingGame === game.gameId}
                  >
                    {settlingGame === game.gameId ? '⏳ Settling...' : '⚡ Settle Now'}
                  </button>
                </div>
                <div className="game-bets">
                  {game.bets.slice(0, 5).map((bet) => (
                    <div key={bet.id} className="pending-bet">
                      <span className="bet-description">{bet.description}</span>
                      <span className="bet-amount">${bet.amount}</span>
                      <span className="bet-type">{bet.betType}</span>
                    </div>
                  ))}
                  {game.bets.length > 5 && (
                    <div className="more-bets">
                      +{game.bets.length - 5} more bets
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Settlement Reports */}
      <div className="recent-reports">
        <h4>Recent Settlement Reports</h4>
        {recentReports.length === 0 ? (
          <div className="no-reports">No recent settlements</div>
        ) : (
          <div className="reports-list">
            {recentReports.map((report, index) => (
              <div key={`${report.gameId}_${index}`} className="settlement-report">
                <div className="report-header">
                  <div className="report-game">
                    <strong>{report.gameInfo}</strong>
                    <span className="report-time">
                      {new Date(report.settlementResults[0]?.settledAt || '').toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="report-summary">
                    {report.totalBetsSettled} bets settled
                  </div>
                </div>
                <div className="report-stats">
                  <div className="stat-item won">
                    <span className="stat-label">Won:</span>
                    <span className="stat-value">{report.winnersCount}</span>
                  </div>
                  <div className="stat-item lost">
                    <span className="stat-label">Lost:</span>
                    <span className="stat-value">{report.losersCount}</span>
                  </div>
                  <div className="stat-item pushed">
                    <span className="stat-label">Pushed:</span>
                    <span className="stat-value">{report.pushesCount}</span>
                  </div>
                  <div className="stat-item payout">
                    <span className="stat-label">Payouts:</span>
                    <span className="stat-value">${report.totalPayouts.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};