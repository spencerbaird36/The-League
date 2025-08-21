import React, { useState, useCallback, useEffect } from 'react';
import { Player } from '../types/Player';
import { DraftPick } from '../hooks/useDraftState';
import { useAIDraftAssistant, AIPickRecommendation, AIInsight, AIStrategy } from '../hooks/useAIDraftAssistant';
import './AIDraftAssistant.css';

interface AIDraftAssistantProps {
  availablePlayers: Player[];
  currentPicks: DraftPick[];
  draftOrder: number[];
  userId?: number;
  isVisible: boolean;
  onToggle: () => void;
  onPlayerRecommend: (player: Player) => void;
  className?: string;
}

interface AIRecommendationCardProps {
  recommendation: AIPickRecommendation;
  onSelect: (player: Player) => void;
  rank: number;
}

interface AIInsightCardProps {
  insight: AIInsight;
  onDismiss: (id: string) => void;
}

interface AIStrategyPanelProps {
  strategy: AIStrategy | null;
  onRequestNew: () => void;
}

const ConfidenceMeter: React.FC<{ confidence: number; size?: 'small' | 'medium' | 'large' }> = ({ 
  confidence, 
  size = 'medium' 
}) => {
  const getColor = (conf: number) => {
    if (conf >= 85) return '#10b981'; // Green
    if (conf >= 70) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };
  
  return (
    <div className={`confidence-meter confidence-meter--${size}`}>
      <div className="confidence-meter__label">Confidence</div>
      <div className="confidence-meter__bar">
        <div 
          className="confidence-meter__fill"
          style={{ 
            width: `${confidence}%`,
            backgroundColor: getColor(confidence)
          }}
        />
      </div>
      <div className="confidence-meter__value">{confidence}%</div>
    </div>
  );
};

const RiskIndicator: React.FC<{ level: 'low' | 'medium' | 'high'; factors?: string[] }> = ({ 
  level, 
  factors = [] 
}) => (
  <div className={`risk-indicator risk-indicator--${level}`}>
    <span className="risk-indicator__icon">
      {level === 'low' ? '🟢' : level === 'medium' ? '🟡' : '🔴'}
    </span>
    <span className="risk-indicator__text">
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </span>
    {factors.length > 0 && (
      <div className="risk-factors">
        {factors.map((factor, index) => (
          <span key={index} className="risk-factor">{factor}</span>
        ))}
      </div>
    )}
  </div>
);

const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({ 
  recommendation, 
  onSelect, 
  rank 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className={`ai-recommendation-card ${rank === 1 ? 'ai-recommendation-card--primary' : ''}`}>
      <div className="recommendation-header">
        <div className="recommendation-rank">#{rank}</div>
        <div className="player-info">
          <div className="player-name">{recommendation.player.name}</div>
          <div className="player-details">
            {recommendation.player.position} - {recommendation.player.team}
          </div>
        </div>
        <div className="recommendation-metrics">
          <ConfidenceMeter confidence={recommendation.confidence} size="small" />
          <div className="strategy-fit">
            <span className="strategy-fit__label">Strategy Fit</span>
            <span className="strategy-fit__value">{recommendation.strategyFit}%</span>
          </div>
        </div>
      </div>
      
      <div className="recommendation-body">
        <div className="key-reasoning">
          {recommendation.reasoning.slice(0, 2).map((reason, index) => (
            <div key={index} className="reasoning-item">
              <span className="reasoning-icon">💡</span>
              <span className="reasoning-text">{reason}</span>
            </div>
          ))}
        </div>
        
        <div className="recommendation-indicators">
          <RiskIndicator 
            level={recommendation.riskAssessment.level}
            factors={recommendation.riskAssessment.factors}
          />
          
          <div className="timing-indicator">
            {recommendation.timing.optimal ? (
              <span className="timing-optimal">⏰ Optimal Timing</span>
            ) : (
              <span className="timing-suboptimal">⚠️ Consider Waiting</span>
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="recommendation-details">
            <div className="impact-analysis">
              <h5>Impact Analysis</h5>
              <div className="impact-item">
                <strong>Short Term:</strong> {recommendation.impact.shortTerm}
              </div>
              <div className="impact-item">
                <strong>Long Term:</strong> {recommendation.impact.longTerm}
              </div>
              <div className="impact-item">
                <strong>Team Balance:</strong> {recommendation.impact.teamBalance}
              </div>
            </div>
            
            <div className="additional-reasoning">
              <h5>Additional Insights</h5>
              {recommendation.reasoning.slice(2).map((reason, index) => (
                <div key={index} className="reasoning-item">
                  <span className="reasoning-bullet">•</span>
                  <span className="reasoning-text">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="recommendation-actions">
        <button
          className="expand-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '⌄ Less Details' : '⌃ More Details'}
        </button>
        
        <button
          className="select-btn"
          onClick={() => onSelect(recommendation.player)}
        >
          🎯 Select Player
        </button>
      </div>
    </div>
  );
};

const AIInsightCard: React.FC<AIInsightCardProps> = ({ insight, onDismiss }) => (
  <div className={`ai-insight-card ai-insight-card--${insight.type} ai-insight-card--${insight.urgency}`}>
    <div className="insight-header">
      <div className="insight-type-icon">
        {insight.type === 'opportunity' ? '🚀' :
         insight.type === 'warning' ? '⚠️' :
         insight.type === 'strategy' ? '🎯' :
         insight.type === 'market' ? '📈' : '👁️'}
      </div>
      
      <div className="insight-title">{insight.title}</div>
      
      <div className="insight-controls">
        <ConfidenceMeter confidence={insight.confidence} size="small" />
        <button 
          className="dismiss-btn"
          onClick={() => onDismiss(insight.id)}
          title="Dismiss"
        >
          ✖
        </button>
      </div>
    </div>
    
    <div className="insight-message">{insight.message}</div>
    
    {insight.suggestedActions.length > 0 && (
      <div className="insight-actions">
        <h5>Suggested Actions:</h5>
        {insight.suggestedActions.map((action, index) => (
          <div key={index} className="action-item">
            <span className="action-bullet">→</span>
            <span className="action-text">{action}</span>
          </div>
        ))}
      </div>
    )}
    
    {insight.relevantPlayers.length > 0 && (
      <div className="relevant-players">
        <h5>Related Players:</h5>
        <div className="players-list">
          {insight.relevantPlayers.slice(0, 3).map(player => (
            <span key={player.id} className="player-chip">
              {player.name} ({player.position})
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
);

const AIStrategyPanel: React.FC<AIStrategyPanelProps> = ({ strategy, onRequestNew }) => {
  if (!strategy) {
    return (
      <div className="ai-strategy-panel ai-strategy-panel--empty">
        <div className="strategy-prompt">
          <h4>🤖 AI Strategy Assistant</h4>
          <p>Enable AI assistance to receive personalized draft strategy and recommendations</p>
          <button className="enable-strategy-btn" onClick={onRequestNew}>
            🚀 Generate AI Strategy
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="ai-strategy-panel">
      <div className="strategy-header">
        <div className="strategy-info">
          <h4>{strategy.name}</h4>
          <p className="strategy-description">{strategy.description}</p>
        </div>
        
        <div className="strategy-metrics">
          <ConfidenceMeter confidence={strategy.confidence} />
          <div className={`risk-level risk-level--${strategy.riskLevel}`}>
            Risk: {strategy.riskLevel}
          </div>
        </div>
      </div>
      
      <div className="strategy-details">
        <div className="expected-outcome">
          <h5>Expected Outcome</h5>
          <p>{strategy.expectedOutcome}</p>
        </div>
        
        <div className="position-priorities">
          <h5>Position Priorities</h5>
          {strategy.positionPriorities.map(priority => (
            <div key={priority.position} className="priority-item">
              <div className="priority-header">
                <span className="position-name">{priority.position}</span>
                <div className="priority-weight">
                  <div className="weight-bar">
                    <div 
                      className="weight-fill"
                      style={{ width: `${priority.weight * 100}%` }}
                    />
                  </div>
                  <span className="weight-value">{(priority.weight * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="priority-reasoning">{priority.reasoning}</div>
            </div>
          ))}
        </div>
        
        <div className="key-insights">
          <h5>Key Strategic Insights</h5>
          {strategy.keyInsights.map((insight, index) => (
            <div key={index} className="insight-item">
              <span className="insight-bullet">💡</span>
              <span className="insight-text">{insight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AIDraftAssistant: React.FC<AIDraftAssistantProps> = ({
  availablePlayers,
  currentPicks,
  draftOrder,
  userId,
  isVisible,
  onToggle,
  onPlayerRecommend,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'insights' | 'strategy' | 'performance'>('recommendations');
  const [isInitializing, setIsInitializing] = useState(false);
  
  const [assistantState, assistantActions] = useAIDraftAssistant(
    availablePlayers,
    currentPicks,
    draftOrder,
    userId
  );
  
  const handleEnableAssistant = useCallback(async () => {
    setIsInitializing(true);
    try {
      await assistantActions.enableAssistant();
    } finally {
      setIsInitializing(false);
    }
  }, [assistantActions]);
  
  // Auto-analyze when picks change
  useEffect(() => {
    if (assistantState.isEnabled) {
      assistantActions.analyzeCurrentSituation();
    }
  }, [currentPicks.length, assistantState.isEnabled, assistantActions]);
  
  if (!isVisible) {
    return (
      <div className="ai-draft-assistant ai-draft-assistant--collapsed">
        <button 
          className="ai-assistant-toggle"
          onClick={onToggle}
          title="AI Draft Assistant"
        >
          🤖
          {assistantState.isEnabled && assistantState.recommendations.length > 0 && (
            <span className="recommendation-badge">
              {assistantState.recommendations.length}
            </span>
          )}
        </button>
      </div>
    );
  }
  
  return (
    <div className={`ai-draft-assistant ai-draft-assistant--expanded ${className}`}>
      <div className="ai-assistant-header">
        <div className="assistant-title">
          <h3>🤖 AI Draft Assistant</h3>
          <div className="assistant-status">
            {assistantState.isEnabled ? (
              assistantState.isAnalyzing ? (
                <span className="status-analyzing">🔄 Analyzing...</span>
              ) : (
                <span className="status-active">✅ Active</span>
              )
            ) : (
              <span className="status-inactive">⭕ Disabled</span>
            )}
          </div>
        </div>
        
        <div className="assistant-controls">
          {!assistantState.isEnabled && (
            <button
              className="enable-ai-btn"
              onClick={handleEnableAssistant}
              disabled={isInitializing}
            >
              {isInitializing ? '🔄 Initializing...' : '🚀 Enable AI'}
            </button>
          )}
          
          <button 
            className="ai-assistant-toggle"
            onClick={onToggle}
            title="Close AI Assistant"
          >
            ✖
          </button>
        </div>
      </div>
      
      {assistantState.isEnabled && (
        <>
          <div className="ai-assistant-tabs">
            <button 
              className={`tab-button ${activeTab === 'recommendations' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('recommendations')}
            >
              🎯 Picks ({assistantState.recommendations.length})
            </button>
            <button 
              className={`tab-button ${activeTab === 'insights' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              💡 Insights ({assistantActions.getActiveInsights().length})
            </button>
            <button 
              className={`tab-button ${activeTab === 'strategy' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('strategy')}
            >
              📋 Strategy
            </button>
            <button 
              className={`tab-button ${activeTab === 'performance' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              📊 Performance
            </button>
          </div>
          
          <div className="ai-assistant-content">
            {activeTab === 'recommendations' && (
              <div className="recommendations-tab">
                {assistantState.recommendations.length > 0 ? (
                  <div className="recommendations-list">
                    {assistantState.recommendations.map((recommendation, index) => (
                      <AIRecommendationCard
                        key={recommendation.player.id}
                        recommendation={recommendation}
                        onSelect={onPlayerRecommend}
                        rank={index + 1}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-recommendations">
                    <div className="empty-icon">🎯</div>
                    <h4>No Recommendations Available</h4>
                    <p>AI is analyzing the current draft situation...</p>
                    {assistantState.isAnalyzing && (
                      <div className="analysis-spinner">🔄</div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'insights' && (
              <div className="insights-tab">
                {assistantActions.getActiveInsights().length > 0 ? (
                  <div className="insights-list">
                    {assistantActions.getActiveInsights().map(insight => (
                      <AIInsightCard
                        key={insight.id}
                        insight={insight}
                        onDismiss={assistantActions.dismissInsight}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-insights">
                    <div className="empty-icon">💡</div>
                    <h4>No Active Insights</h4>
                    <p>AI insights will appear here as opportunities arise during the draft.</p>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'strategy' && (
              <div className="strategy-tab">
                <AIStrategyPanel
                  strategy={assistantState.currentStrategy}
                  onRequestNew={() => assistantActions.generateStrategy({})}
                />
              </div>
            )}
            
            {activeTab === 'performance' && (
              <div className="performance-tab">
                <div className="performance-metrics">
                  <h4>AI Assistant Performance</h4>
                  
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div className="metric-value">
                        {assistantState.performanceMetrics.accuracy.toFixed(1)}%
                      </div>
                      <div className="metric-label">Prediction Accuracy</div>
                    </div>
                    
                    <div className="metric-card">
                      <div className="metric-value">
                        {assistantState.performanceMetrics.valueGenerated.toFixed(1)}
                      </div>
                      <div className="metric-label">Value Generated</div>
                    </div>
                    
                    <div className="metric-card">
                      <div className="metric-value">
                        {assistantState.performanceMetrics.decisionsInfluenced}
                      </div>
                      <div className="metric-label">Decisions Influenced</div>
                    </div>
                  </div>
                  
                  <div className="performance-insights">
                    <h5>Performance Insights</h5>
                    <div className="insight-item">
                      <span className="insight-bullet">📈</span>
                      <span className="insight-text">
                        AI recommendations have been accurate in {assistantState.performanceMetrics.accuracy}% of cases
                      </span>
                    </div>
                    <div className="insight-item">
                      <span className="insight-bullet">💎</span>
                      <span className="insight-text">
                        Following AI suggestions has generated an estimated {assistantState.performanceMetrics.valueGenerated} points of additional value
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AIDraftAssistant;