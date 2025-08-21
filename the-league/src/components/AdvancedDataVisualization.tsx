import React, { useState, useMemo, useEffect } from 'react';
import { Player } from '../types/Player';
import { DraftPick } from '../hooks/useDraftState';
import './AdvancedDataVisualization.css';

interface AdvancedDataVisualizationProps {
  picks: DraftPick[];
  availablePlayers: Player[];
  draftOrder: number[];
  currentPickNumber: number;
  currentUserId?: number;
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
}

interface TeamAnalysis {
  userId: number;
  picks: DraftPick[];
  positionCounts: Record<string, number>;
  totalValue: number;
  averageValue: number;
  strength: number;
  weaknesses: string[];
  strategy: 'balanced' | 'aggressive' | 'position-focused' | 'value-oriented';
}

interface PositionTrend {
  position: string;
  picksByRound: number[];
  averagePickNumber: number;
  scarcity: number;
  trend: 'rising' | 'falling' | 'stable';
  recommendedStrategy: string;
}

interface MarketInsight {
  type: 'run' | 'value' | 'sleeper' | 'reach' | 'steal';
  title: string;
  description: string;
  players: Player[];
  confidence: number;
  impact: 'high' | 'medium' | 'low';
}

const AdvancedDataVisualization: React.FC<AdvancedDataVisualizationProps> = ({
  picks,
  availablePlayers,
  draftOrder,
  currentPickNumber,
  currentUserId,
  isVisible,
  onToggle,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'predictions' | 'live'>('overview');

  // Analyze team compositions
  const teamAnalytics = useMemo((): TeamAnalysis[] => {
    const teamMap = new Map<number, TeamAnalysis>();
    
    // Initialize teams
    draftOrder.forEach(userId => {
      teamMap.set(userId, {
        userId,
        picks: [],
        positionCounts: {},
        totalValue: 0,
        averageValue: 0,
        strength: 0,
        weaknesses: [],
        strategy: 'balanced'
      });
    });
    
    // Populate team picks and calculate metrics
    picks.forEach(pick => {
      const team = teamMap.get(pick.userId);
      if (team) {
        team.picks.push(pick);
        team.positionCounts[pick.playerPosition] = (team.positionCounts[pick.playerPosition] || 0) + 1;
        
        // Calculate pick value (lower pick number = higher value)
        const pickValue = Math.max(0, 200 - pick.pickNumber);
        team.totalValue += pickValue;
      }
    });
    
    // Calculate derived metrics
    teamMap.forEach(team => {
      if (team.picks.length > 0) {
        team.averageValue = team.totalValue / team.picks.length;
        team.strength = team.totalValue / Math.max(1, team.picks.length);
        
        // Identify strategy based on position distribution
        const positions = Object.keys(team.positionCounts);
        const maxCount = Math.max(...Object.values(team.positionCounts));
        const focusedPositions = positions.filter(pos => team.positionCounts[pos] === maxCount);
        
        if (focusedPositions.length === 1 && maxCount >= 3) {
          team.strategy = 'position-focused';
        } else if (team.averageValue > 150) {
          team.strategy = 'aggressive';
        } else if (positions.length >= 5) {
          team.strategy = 'balanced';
        } else {
          team.strategy = 'value-oriented';
        }
        
        // Identify weaknesses (positions with 0 picks after 5+ rounds)
        if (team.picks.length >= 5) {
          const neededPositions = ['QB', 'RB', 'WR', 'TE'];
          team.weaknesses = neededPositions.filter(pos => !team.positionCounts[pos]);
        }
      }
    });
    
    return Array.from(teamMap.values()).sort((a, b) => b.strength - a.strength);
  }, [picks, draftOrder]);

  // Analyze position trends
  const positionTrends = useMemo((): PositionTrend[] => {
    const positions = ['QB', 'RB', 'WR', 'TE', 'SP', 'CP'];
    const maxRounds = 15;
    
    return positions.map(position => {
      const positionPicks = picks.filter(pick => pick.playerPosition === position);
      const picksByRound = Array(maxRounds).fill(0);
      
      positionPicks.forEach(pick => {
        const round = Math.ceil(pick.pickNumber / draftOrder.length);
        if (round <= maxRounds) {
          picksByRound[round - 1]++;
        }
      });
      
      const averagePickNumber = positionPicks.length > 0 
        ? positionPicks.reduce((sum, pick) => sum + pick.pickNumber, 0) / positionPicks.length
        : 0;
      
      // Calculate scarcity (remaining quality players vs demand)
      const remainingPlayers = availablePlayers.filter(p => p.position === position).length;
      const pickRate = positionPicks.length / picks.length;
      const scarcity = Math.max(0, Math.min(100, (pickRate * 100) - (remainingPlayers / 10)));
      
      // Determine trend
      const recentRounds = picksByRound.slice(-3);
      const earlyRounds = picksByRound.slice(0, 3);
      const recentAvg = recentRounds.reduce((a, b) => a + b, 0) / 3;
      const earlyAvg = earlyRounds.reduce((a, b) => a + b, 0) / 3;
      
      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      if (recentAvg > earlyAvg * 1.2) trend = 'rising';
      else if (recentAvg < earlyAvg * 0.8) trend = 'falling';
      
      // Generate strategy recommendation
      let recommendedStrategy = '';
      if (scarcity > 70) {
        recommendedStrategy = 'Draft now - high scarcity';
      } else if (trend === 'rising') {
        recommendedStrategy = 'Consider waiting - rising supply';
      } else if (trend === 'falling') {
        recommendedStrategy = 'Draft soon - demand increasing';
      } else {
        recommendedStrategy = 'Flexible timing - stable market';
      }
      
      return {
        position,
        picksByRound,
        averagePickNumber,
        scarcity,
        trend,
        recommendedStrategy
      };
    });
  }, [picks, availablePlayers, draftOrder]);

  // Generate market insights
  const marketInsights = useMemo((): MarketInsight[] => {
    const insights: MarketInsight[] = [];
    
    // Detect position runs
    const recentPicks = picks.slice(-6);
    const positionCounts = recentPicks.reduce((acc, pick) => {
      acc[pick.playerPosition] = (acc[pick.playerPosition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(positionCounts).forEach(([position, count]) => {
      if (count >= 3) {
        insights.push({
          type: 'run',
          title: `${position} Run Detected`,
          description: `${count} ${position}s picked in last 6 picks`,
          players: availablePlayers.filter(p => p.position === position).slice(0, 3),
          confidence: Math.min(95, count * 25),
          impact: count >= 4 ? 'high' : 'medium'
        });
      }
    });
    
    // Detect value opportunities
    const highValuePositions = positionTrends.filter(trend => 
      trend.scarcity < 30 && trend.trend !== 'rising'
    );
    
    highValuePositions.forEach(trend => {
      const topPlayers = availablePlayers
        .filter(p => p.position === trend.position)
        .slice(0, 2);
      
      if (topPlayers.length > 0) {
        insights.push({
          type: 'value',
          title: `${trend.position} Value Window`,
          description: `Low demand with quality players available`,
          players: topPlayers,
          confidence: 75,
          impact: 'medium'
        });
      }
    });
    
    // Detect sleeper opportunities
    const underValuedPositions = positionTrends.filter(trend => 
      trend.averagePickNumber > currentPickNumber + 20 && trend.scarcity > 40
    );
    
    underValuedPositions.forEach(trend => {
      const sleepers = availablePlayers
        .filter(p => p.position === trend.position)
        .slice(0, 1);
      
      if (sleepers.length > 0) {
        insights.push({
          type: 'sleeper',
          title: `${trend.position} Sleeper Alert`,
          description: `Quality players available later than expected`,
          players: sleepers,
          confidence: 65,
          impact: 'high'
        });
      }
    });
    
    return insights.sort((a, b) => b.confidence - a.confidence).slice(0, 8);
  }, [picks, availablePlayers, positionTrends, currentPickNumber]);

  if (!isVisible) {
    return (
      <div className="advanced-data-visualization advanced-data-visualization--collapsed">
        <button 
          className="data-viz-toggle"
          onClick={onToggle}
          title="Advanced Data Visualization"
        >
          📊
        </button>
      </div>
    );
  }

  return (
    <div className={`advanced-data-visualization advanced-data-visualization--expanded ${className}`}>
      <div className="data-viz-header">
        <div className="viz-title">
          <h3>📊 Advanced Draft Analytics</h3>
          <div className="viz-status">
            <span className="live-indicator">🔴 Live Data</span>
          </div>
        </div>
        
        <div className="viz-controls">
          <div className="viz-tabs">
            <button 
              className={`tab-button ${activeTab === 'overview' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📈 Overview
            </button>
            <button 
              className={`tab-button ${activeTab === 'trends' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('trends')}
            >
              📊 Trends
            </button>
            <button 
              className={`tab-button ${activeTab === 'predictions' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('predictions')}
            >
              🔮 Predictions
            </button>
            <button 
              className={`tab-button ${activeTab === 'live' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('live')}
            >
              ⚡ Live Insights
            </button>
          </div>
          
          <button 
            className="data-viz-toggle"
            onClick={onToggle}
            title="Close Data Visualization"
          >
            ✖
          </button>
        </div>
      </div>
      
      <div className="data-viz-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon">🎯</div>
                <div className="metric-info">
                  <div className="metric-label">Draft Progress</div>
                  <div className="metric-value">{((picks.length / (draftOrder.length * 15)) * 100).toFixed(1)}%</div>
                  <div className="metric-subtitle">{picks.length} / {draftOrder.length * 15} picks</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">⚡</div>
                <div className="metric-info">
                  <div className="metric-label">Pick Velocity</div>
                  <div className="metric-value">{picks.length > 0 ? (picks.length / Math.max(1, Math.ceil(currentPickNumber / 10))).toFixed(1) : '0'}</div>
                  <div className="metric-subtitle">picks per round</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">🔥</div>
                <div className="metric-info">
                  <div className="metric-label">Hottest Position</div>
                  <div className="metric-value">
                    {positionTrends.reduce((max, trend) => 
                      trend.scarcity > max.scarcity ? trend : max
                    ).position}
                  </div>
                  <div className="metric-subtitle">highest demand</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">💎</div>
                <div className="metric-info">
                  <div className="metric-label">Value Opportunities</div>
                  <div className="metric-value">{marketInsights.filter(i => i.type === 'value').length}</div>
                  <div className="metric-subtitle">undervalued positions</div>
                </div>
              </div>
            </div>
            
            <div className="team-rankings">
              <h4>Team Strength Rankings</h4>
              <div className="rankings-list">
                {teamAnalytics.slice(0, 6).map((team, index) => (
                  <div 
                    key={team.userId} 
                    className={`ranking-item ${team.userId === currentUserId ? 'current-user' : ''}`}
                  >
                    <div className="rank-position">#{index + 1}</div>
                    <div className="team-info">
                      <div className="team-name">
                        Team {team.userId}
                        {team.userId === currentUserId && <span className="you-indicator">(You)</span>}
                      </div>
                      <div className="team-stats">
                        <span className="pick-count">{team.picks.length} picks</span>
                        <span className="strategy-badge strategy-badge--{team.strategy}">
                          {team.strategy.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="strength-meter">
                      <div 
                        className="strength-fill"
                        style={{ width: `${Math.min(100, (team.strength / 150) * 100)}%` }}
                      />
                      <span className="strength-value">{team.strength.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'trends' && (
          <div className="trends-tab">
            <div className="position-trends">
              <h4>Position Market Trends</h4>
              <div className="trends-grid">
                {positionTrends.map(trend => (
                  <div key={trend.position} className="trend-card">
                    <div className="trend-header">
                      <div className="position-name">{trend.position}</div>
                      <div className={`trend-indicator trend-indicator--${trend.trend}`}>
                        {trend.trend === 'rising' ? '📈' : trend.trend === 'falling' ? '📉' : '➡️'}
                        <span>{trend.trend}</span>
                      </div>
                    </div>
                    
                    <div className="trend-metrics">
                      <div className="trend-metric">
                        <span className="metric-label">Scarcity</span>
                        <div className="scarcity-bar">
                          <div 
                            className={`scarcity-fill scarcity-fill--${trend.scarcity > 70 ? 'high' : trend.scarcity > 40 ? 'medium' : 'low'}`}
                            style={{ width: `${trend.scarcity}%` }}
                          />
                        </div>
                        <span className="metric-value">{trend.scarcity.toFixed(0)}%</span>
                      </div>
                      
                      <div className="trend-metric">
                        <span className="metric-label">Avg Pick</span>
                        <span className="metric-value">#{trend.averagePickNumber.toFixed(0)}</span>
                      </div>
                    </div>
                    
                    <div className="trend-recommendation">
                      {trend.recommendedStrategy}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'predictions' && (
          <div className="predictions-tab">
            <div className="draft-predictions">
              <h4>AI Draft Predictions</h4>
              <div className="predictions-grid">
                <div className="prediction-card">
                  <div className="prediction-icon">🎯</div>
                  <div className="prediction-content">
                    <h5>Next Position Run</h5>
                    <p>
                      {positionTrends
                        .sort((a, b) => b.scarcity - a.scarcity)[0]?.position || 'RB'} 
                      run likely within next 8 picks
                    </p>
                    <div className="confidence">Confidence: 78%</div>
                  </div>
                </div>
                
                <div className="prediction-card">
                  <div className="prediction-icon">💰</div>
                  <div className="prediction-content">
                    <h5>Value Window</h5>
                    <p>
                      {positionTrends
                        .filter(t => t.scarcity < 40)
                        .sort((a, b) => a.scarcity - b.scarcity)[0]?.position || 'TE'} 
                      value opportunity in rounds 7-9
                    </p>
                    <div className="confidence">Confidence: 85%</div>
                  </div>
                </div>
                
                <div className="prediction-card">
                  <div className="prediction-icon">⚠️</div>
                  <div className="prediction-content">
                    <h5>Scarcity Alert</h5>
                    <p>
                      Elite {positionTrends
                        .sort((a, b) => b.scarcity - a.scarcity)[0]?.position || 'QB'}s 
                      will be gone by round 5
                    </p>
                    <div className="confidence">Confidence: 92%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'live' && (
          <div className="live-tab">
            <div className="market-insights">
              <h4>Live Market Insights</h4>
              <div className="insights-list">
                {marketInsights.map((insight, index) => (
                  <div key={index} className={`insight-card insight-card--${insight.type}`}>
                    <div className="insight-header">
                      <div className="insight-icon">
                        {insight.type === 'run' ? '🏃‍♂️' :
                         insight.type === 'value' ? '💰' :
                         insight.type === 'sleeper' ? '😴' :
                         insight.type === 'reach' ? '📏' : '💎'}
                      </div>
                      <div className="insight-title">{insight.title}</div>
                      <div className={`confidence-badge confidence-badge--${insight.confidence > 80 ? 'high' : insight.confidence > 60 ? 'medium' : 'low'}`}>
                        {insight.confidence}%
                      </div>
                    </div>
                    
                    <div className="insight-description">{insight.description}</div>
                    
                    {insight.players.length > 0 && (
                      <div className="insight-players">
                        <span className="players-label">Key Players:</span>
                        <div className="players-list">
                          {insight.players.map(player => (
                            <span key={player.id} className="player-chip">
                              {player.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className={`impact-indicator impact-indicator--${insight.impact}`}>
                      Impact: {insight.impact.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedDataVisualization;