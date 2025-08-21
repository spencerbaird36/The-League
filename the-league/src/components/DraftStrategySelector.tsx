import React, { useState, useCallback } from 'react';
import { Player } from '../types/Player';
import { DraftPick } from '../hooks/useDraftState';
import { useDraftStrategy, DraftStrategy, MockDraftResult } from '../hooks/useDraftStrategy';
import './DraftStrategySelector.css';

interface DraftStrategySelectorProps {
  availablePlayers: Player[];
  currentPicks: DraftPick[];
  draftOrder: number[];
  userId?: number;
  isVisible: boolean;
  onToggle: () => void;
  onStrategyRecommendation: (players: Player[]) => void;
}

interface StrategyCardProps {
  strategy: DraftStrategy;
  isActive: boolean;
  onSelect: () => void;
}

const StrategyCard: React.FC<StrategyCardProps> = ({ strategy, isActive, onSelect }) => (
  <div 
    className={`strategy-card ${isActive ? 'strategy-card--active' : ''}`}
    onClick={onSelect}
  >
    <div className="strategy-card__header">
      <h4 className="strategy-card__name">{strategy.name}</h4>
      <div className="strategy-card__flexibility">
        <span className="flexibility-label">Flexibility:</span>
        <div className="flexibility-bar">
          <div 
            className="flexibility-fill"
            style={{ width: `${strategy.flexibilityScore}%` }}
          />
        </div>
        <span className="flexibility-score">{strategy.flexibilityScore}%</span>
      </div>
    </div>
    
    <p className="strategy-card__description">{strategy.description}</p>
    
    <div className="strategy-card__priorities">
      <h5>Priority Positions:</h5>
      <div className="priorities-list">
        {strategy.priorities
          .sort((a, b) => b.priority - a.priority)
          .slice(0, 4)
          .map(priority => (
            <div key={priority.position} className="priority-item">
              <span className="priority-position">{priority.position}</span>
              <div className="priority-rounds">
                Rounds {priority.rounds.slice(0, 3).join(', ')}
                {priority.rounds.length > 3 && '...'}
              </div>
            </div>
          ))}
      </div>
    </div>
  </div>
);

interface MockDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunMock: (strategy: DraftStrategy, rounds: number) => void;
  strategy: DraftStrategy | null;
  result: MockDraftResult | null;
  isRunning: boolean;
}

const MockDraftModal: React.FC<MockDraftModalProps> = ({ 
  isOpen, 
  onClose, 
  onRunMock, 
  strategy, 
  result,
  isRunning
}) => {
  const [rounds, setRounds] = useState(15);
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="mock-draft-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Mock Draft Simulation</h3>
          <button className="modal-close" onClick={onClose}>✖</button>
        </div>
        
        <div className="modal-content">
          {!result && !isRunning && (
            <div className="mock-draft-setup">
              <p>Run a mock draft simulation using the <strong>{strategy?.name}</strong> strategy.</p>
              
              <div className="rounds-selector">
                <label htmlFor="rounds">Number of Rounds:</label>
                <select 
                  id="rounds"
                  value={rounds} 
                  onChange={(e) => setRounds(Number(e.target.value))}
                >
                  <option value={10}>10 Rounds</option>
                  <option value={15}>15 Rounds (Standard)</option>
                  <option value={20}>20 Rounds</option>
                </select>
              </div>
              
              <button 
                className="run-mock-btn"
                onClick={() => strategy && onRunMock(strategy, rounds)}
              >
                🎯 Run Mock Draft
              </button>
            </div>
          )}
          
          {isRunning && (
            <div className="mock-draft-loading">
              <div className="loading-spinner" />
              <p>Running mock draft simulation...</p>
            </div>
          )}
          
          {result && (
            <div className="mock-draft-results">
              <div className="results-header">
                <div className="grade-circle">
                  <span className={`grade-text grade-text--${result.grade.toLowerCase()}`}>
                    {result.grade}
                  </span>
                </div>
                <div className="score-details">
                  <h4>Draft Grade: {result.grade}</h4>
                  <p>Score: {result.score.toFixed(1)}/100</p>
                  <p>Projected Finish: #{result.estimatedFinish}</p>
                </div>
              </div>
              
              <div className="results-analysis">
                <div className="strengths">
                  <h5>✅ Strengths:</h5>
                  <ul>
                    {result.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                </div>
                
                {result.weaknesses.length > 0 && (
                  <div className="weaknesses">
                    <h5>⚠️ Areas for Improvement:</h5>
                    <ul>
                      {result.weaknesses.map((weakness, index) => (
                        <li key={index}>{weakness}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="your-team">
                <h5>Your Simulated Team:</h5>
                <div className="team-picks">
                  {result.yourTeam.slice(0, 10).map(pick => (
                    <div key={pick.pickNumber} className="team-pick">
                      <span className="pick-round">R{pick.round}</span>
                      <span className="pick-player">
                        {pick.playerName} ({pick.playerPosition})
                      </span>
                    </div>
                  ))}
                  {result.yourTeam.length > 10 && (
                    <div className="more-picks">
                      +{result.yourTeam.length - 10} more picks
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DraftStrategySelector: React.FC<DraftStrategySelectorProps> = ({
  availablePlayers,
  currentPicks,
  draftOrder,
  userId,
  isVisible,
  onToggle,
  onStrategyRecommendation
}) => {
  const [isMockModalOpen, setIsMockModalOpen] = useState(false);
  const [mockResult, setMockResult] = useState<MockDraftResult | null>(null);
  const [isRunningMock, setIsRunningMock] = useState(false);
  
  const strategyTools = useDraftStrategy(availablePlayers, currentPicks, draftOrder, userId);
  const strategies = strategyTools.getAvailableStrategies();
  const activeStrategy = strategyTools.getActiveStrategy();
  
  const handleStrategySelect = useCallback((strategyId: string) => {
    strategyTools.setActiveStrategy(strategyId);
    const strategy = strategies.find(s => s.id === strategyId);
    
    if (strategy) {
      // Get recommendations based on strategy
      const recommendations = strategyTools.getNextPickRecommendation(strategy, availablePlayers);
      onStrategyRecommendation(recommendations);
    }
  }, [strategyTools, strategies, availablePlayers, onStrategyRecommendation]);
  
  const handleRunMockDraft = useCallback(async (strategy: DraftStrategy, rounds: number) => {
    setIsRunningMock(true);
    setMockResult(null);
    
    try {
      const result = await strategyTools.runMockDraft(strategy, rounds);
      setMockResult(result);
    } catch (error) {
      console.error('Mock draft failed:', error);
    } finally {
      setIsRunningMock(false);
    }
  }, [strategyTools]);
  
  const handleGetRecommendations = useCallback(() => {
    if (activeStrategy) {
      const recommendations = strategyTools.getNextPickRecommendation(activeStrategy, availablePlayers);
      onStrategyRecommendation(recommendations);
    }
  }, [activeStrategy, strategyTools, availablePlayers, onStrategyRecommendation]);
  
  if (!isVisible) {
    return (
      <div className="strategy-selector strategy-selector--collapsed">
        <button 
          className="strategy-selector__toggle" 
          onClick={onToggle}
          title="Show Draft Strategy"
        >
          🎯
        </button>
      </div>
    );
  }
  
  return (
    <div className="strategy-selector strategy-selector--expanded">
      <div className="strategy-selector__header">
        <h3>Draft Strategy</h3>
        <button 
          className="strategy-selector__toggle" 
          onClick={onToggle}
          title="Hide Draft Strategy"
        >
          ✖
        </button>
      </div>
      
      <div className="strategy-selector__content">
        <div className="active-strategy-info">
          {activeStrategy ? (
            <div className="active-strategy">
              <div className="active-strategy__name">
                Active: <strong>{activeStrategy.name}</strong>
              </div>
              <div className="active-strategy__actions">
                <button 
                  className="strategy-action-btn strategy-action-btn--primary"
                  onClick={handleGetRecommendations}
                >
                  📋 Get Recommendations
                </button>
                <button 
                  className="strategy-action-btn strategy-action-btn--secondary"
                  onClick={() => setIsMockModalOpen(true)}
                >
                  🎮 Run Mock Draft
                </button>
              </div>
            </div>
          ) : (
            <div className="no-strategy">
              <p>Select a draft strategy to get personalized recommendations</p>
            </div>
          )}
        </div>
        
        <div className="strategies-grid">
          {strategies.map(strategy => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              isActive={activeStrategy?.id === strategy.id}
              onSelect={() => handleStrategySelect(strategy.id)}
            />
          ))}
        </div>
        
        <div className="strategy-tips">
          <h4>💡 Strategy Tips</h4>
          <ul>
            <li><strong>Robust RB:</strong> Best for standard scoring leagues</li>
            <li><strong>Zero RB:</strong> Great for PPR leagues with deep benches</li>
            <li><strong>Balanced:</strong> Safe approach for beginners</li>
            <li><strong>Pitcher Heavy:</strong> Dominate MLB categories early</li>
            <li><strong>Hitting First:</strong> Stream pitching, lock up hitting stats</li>
          </ul>
        </div>
      </div>
      
      <MockDraftModal
        isOpen={isMockModalOpen}
        onClose={() => {
          setIsMockModalOpen(false);
          setMockResult(null);
        }}
        onRunMock={handleRunMockDraft}
        strategy={activeStrategy}
        result={mockResult}
        isRunning={isRunningMock}
      />
    </div>
  );
};

export default DraftStrategySelector;