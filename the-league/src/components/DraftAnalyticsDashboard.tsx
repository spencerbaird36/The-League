import React, { useState, useMemo } from 'react';
import { Player } from '../types/Player';
import { DraftPick } from '../hooks/useDraftState';
import { useDraftTrends } from '../hooks/useDraftTrends';
import './DraftAnalyticsDashboard.css';

interface DraftAnalyticsDashboardProps {
  picks: DraftPick[];
  availablePlayers: Player[];
  draftOrder: number[];
  currentPickNumber: number;
  currentUserId?: number;
  isVisible: boolean;
  onToggle: () => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'green' | 'red' | 'yellow' | 'blue';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  color = 'blue' 
}) => (
  <div className={`metric-card metric-card--${color}`}>
    <div className="metric-card__header">
      <span className="metric-card__title">{title}</span>
      {trend && (
        <span className={`metric-card__trend metric-card__trend--${trend}`}>
          {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
        </span>
      )}
    </div>
    <div className="metric-card__value">{value}</div>
    {subtitle && <div className="metric-card__subtitle">{subtitle}</div>}
  </div>
);

const PositionScarcityChart: React.FC<{
  trends: ReturnType<typeof useDraftTrends>['getPositionTrends']
}> = ({ trends }) => {
  const positionTrends = trends();
  
  return (
    <div className="position-scarcity-chart">
      <h3>Position Scarcity Analysis</h3>
      <div className="scarcity-bars">
        {positionTrends.slice(0, 8).map(trend => (
          <div key={trend.position} className="scarcity-bar">
            <div className="scarcity-bar__label">
              <span className="position-name">{trend.position}</span>
              <span className="scarcity-score">{trend.scarcityScore.toFixed(1)}%</span>
            </div>
            <div className="scarcity-bar__container">
              <div 
                className={`scarcity-bar__fill scarcity-bar__fill--${
                  trend.scarcityScore > 70 ? 'high' : 
                  trend.scarcityScore > 40 ? 'medium' : 'low'
                }`}
                style={{ width: `${trend.scarcityScore}%` }}
              />
            </div>
            <div className="scarcity-bar__info">
              <span>Drafted: {trend.totalDrafted}</span>
              <span className={`run-risk run-risk--${trend.runRisk}`}>
                {trend.runRisk} run risk
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LiveTrendsPanel: React.FC<{
  trends: ReturnType<typeof useDraftTrends>['getDraftTrends']
}> = ({ trends }) => {
  const draftTrends = trends().slice(0, 6);
  
  return (
    <div className="live-trends-panel">
      <h3>Live Draft Trends</h3>
      <div className="trends-list">
        {draftTrends.map((trend, index) => (
          <div key={`${trend.timestamp}-${index}`} className={`trend-item trend-item--${trend.severity}`}>
            <div className="trend-item__icon">
              {trend.event === 'pick' ? '🎯' : 
               trend.event === 'tier_break' ? '📉' :
               trend.event === 'position_run' ? '🏃' :
               trend.event === 'value_pick' ? '💎' : '⚠️'}
            </div>
            <div className="trend-item__content">
              <div className="trend-item__description">{trend.description}</div>
              <div className="trend-item__meta">
                <span className="trend-item__time">
                  {new Date(trend.timestamp).toLocaleTimeString()}
                </span>
                <span className={`trend-item__impact impact--${
                  trend.impact > 70 ? 'high' : trend.impact > 40 ? 'medium' : 'low'
                }`}>
                  Impact: {trend.impact}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DraftEfficiencyRankings: React.FC<{
  getEfficiencyRankings: () => ReturnType<typeof useDraftTrends>['getLeagueEfficiencyRankings']
}> = ({ getEfficiencyRankings }) => {
  const rankings = getEfficiencyRankings()();
  
  return (
    <div className="draft-efficiency-rankings">
      <h3>Draft Efficiency Rankings</h3>
      <div className="rankings-list">
        {rankings.map((efficiency, index) => (
          <div key={efficiency.userId} className="ranking-item">
            <div className="ranking-item__position">
              #{index + 1}
            </div>
            <div className="ranking-item__content">
              <div className="ranking-item__name">Team {efficiency.userId}</div>
              <div className="ranking-item__metrics">
                <span className="efficiency-score">
                  {efficiency.efficiency.toFixed(1)}% efficient
                </span>
                <span className="value-over">
                  {efficiency.valueOver > 0 ? '+' : ''}{efficiency.valueOver.toFixed(1)} value
                </span>
              </div>
              <div className="ranking-item__details">
                <span className="steals">💎 {efficiency.stealCount} steals</span>
                <span className="reaches">🚨 {efficiency.reachCount} reaches</span>
              </div>
            </div>
            <div className={`ranking-item__grade grade--${
              efficiency.efficiency > 80 ? 'a' : 
              efficiency.efficiency > 70 ? 'b' :
              efficiency.efficiency > 60 ? 'c' : 'd'
            }`}>
              {efficiency.efficiency > 80 ? 'A' : 
               efficiency.efficiency > 70 ? 'B' :
               efficiency.efficiency > 60 ? 'C' : 'D'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PickPredictions: React.FC<{
  predictNextPicks: (count: number) => { player: Player; likelihood: number }[]
}> = ({ predictNextPicks }) => {
  const predictions = predictNextPicks(5);
  
  return (
    <div className="pick-predictions">
      <h3>Next Pick Predictions</h3>
      <div className="predictions-list">
        {predictions.map(prediction => (
          <div key={prediction.player.id} className="prediction-item">
            <div className="prediction-item__player">
              <span className="player-name">{prediction.player.name}</span>
              <span className="player-details">
                {prediction.player.position} - {prediction.player.team}
              </span>
            </div>
            <div className="prediction-item__likelihood">
              <div className="likelihood-bar">
                <div 
                  className="likelihood-fill"
                  style={{ width: `${prediction.likelihood}%` }}
                />
              </div>
              <span className="likelihood-text">
                {prediction.likelihood.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DraftAnalyticsDashboard: React.FC<DraftAnalyticsDashboardProps> = ({
  picks,
  availablePlayers,
  draftOrder,
  currentPickNumber,
  currentUserId,
  isVisible,
  onToggle
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'efficiency' | 'predictions'>('overview');
  
  const trendAnalytics = useDraftTrends(picks, availablePlayers, draftOrder, currentPickNumber);
  
  const overviewMetrics = useMemo(() => {
    const positionTrends = trendAnalytics.getPositionTrends();
    const valueTrends = trendAnalytics.getValueTrends();
    const userEfficiency = currentUserId ? trendAnalytics.getDraftEfficiency(currentUserId) : null;
    
    const highScarcityPositions = positionTrends.filter(t => t.scarcityScore > 60).length;
    const averageRoundValue = valueTrends.length > 0 
      ? valueTrends.reduce((sum, t) => sum + t.averageValue, 0) / valueTrends.length 
      : 0;
    
    return {
      totalPicks: picks.length,
      highScarcityPositions,
      averageRoundValue: averageRoundValue.toFixed(1),
      userEfficiency: userEfficiency?.efficiency.toFixed(1) || 'N/A',
      userGrade: userEfficiency ? 
        (userEfficiency.efficiency > 80 ? 'A' : 
         userEfficiency.efficiency > 70 ? 'B' :
         userEfficiency.efficiency > 60 ? 'C' : 'D') : 'N/A'
    };
  }, [picks, trendAnalytics, currentUserId]);
  
  if (!isVisible) {
    return (
      <div className="analytics-dashboard analytics-dashboard--collapsed">
        <button 
          className="analytics-dashboard__toggle" 
          onClick={onToggle}
          title="Show Analytics Dashboard"
        >
          📊
        </button>
      </div>
    );
  }
  
  return (
    <div className="analytics-dashboard analytics-dashboard--expanded">
      <div className="analytics-dashboard__header">
        <h2>Draft Analytics Dashboard</h2>
        <button 
          className="analytics-dashboard__toggle" 
          onClick={onToggle}
          title="Hide Analytics Dashboard"
        >
          ✖
        </button>
      </div>
      
      <div className="analytics-dashboard__tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'trends' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          Trends
        </button>
        <button 
          className={`tab-button ${activeTab === 'efficiency' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('efficiency')}
        >
          Efficiency
        </button>
        <button 
          className={`tab-button ${activeTab === 'predictions' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('predictions')}
        >
          Predictions
        </button>
      </div>
      
      <div className="analytics-dashboard__content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="metrics-grid">
              <MetricCard 
                title="Total Picks" 
                value={overviewMetrics.totalPicks}
                subtitle={`of ${draftOrder.length * 15} total`}
              />
              <MetricCard 
                title="Scarce Positions" 
                value={overviewMetrics.highScarcityPositions}
                subtitle="High scarcity (>60%)"
                color="red"
              />
              <MetricCard 
                title="Avg Round Value" 
                value={overviewMetrics.averageRoundValue}
                subtitle="Value per round"
                color="green"
              />
              <MetricCard 
                title="Your Efficiency" 
                value={`${overviewMetrics.userEfficiency}%`}
                subtitle={`Grade: ${overviewMetrics.userGrade}`}
                color={overviewMetrics.userGrade === 'A' || overviewMetrics.userGrade === 'B' ? 'green' : 'yellow'}
              />
            </div>
            
            <div className="overview-charts">
              <PositionScarcityChart trends={trendAnalytics.getPositionTrends} />
              <LiveTrendsPanel trends={trendAnalytics.getDraftTrends} />
            </div>
          </div>
        )}
        
        {activeTab === 'trends' && (
          <div className="trends-tab">
            <PositionScarcityChart trends={trendAnalytics.getPositionTrends} />
            <LiveTrendsPanel trends={trendAnalytics.getDraftTrends} />
          </div>
        )}
        
        {activeTab === 'efficiency' && (
          <div className="efficiency-tab">
            <DraftEfficiencyRankings getEfficiencyRankings={() => trendAnalytics.getLeagueEfficiencyRankings} />
          </div>
        )}
        
        {activeTab === 'predictions' && (
          <div className="predictions-tab">
            <PickPredictions predictNextPicks={trendAnalytics.predictNextPicks} />
            
            <div className="strategy-suggestions">
              <h3>Strategy Suggestions</h3>
              <div className="suggestions-list">
                {trendAnalytics.suggestCounterStrategy([]).map((suggestion, index) => (
                  <div key={index} className="suggestion-item">
                    <span className="suggestion-icon">💡</span>
                    <span className="suggestion-text">{suggestion}</span>
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

export default DraftAnalyticsDashboard;