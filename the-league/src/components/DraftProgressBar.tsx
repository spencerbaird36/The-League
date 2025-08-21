import React from 'react';
import './DraftProgressBar.css';

interface DraftProgressBarProps {
  completionPercentage: number;
  currentRound: number;
  totalRounds: number;
  currentPick: number;
  totalPicks: number;
  picksRemaining: number;
  className?: string;
}

const DraftProgressBar: React.FC<DraftProgressBarProps> = ({
  completionPercentage,
  currentRound,
  totalRounds,
  currentPick,
  totalPicks,
  picksRemaining,
  className = ''
}) => {
  const getProgressColor = (): string => {
    if (completionPercentage >= 90) return '#28a745'; // Green - almost done
    if (completionPercentage >= 60) return '#ffc107'; // Yellow - halfway
    if (completionPercentage >= 30) return '#fd7e14'; // Orange - getting started
    return '#6c757d'; // Gray - just beginning
  };

  const getProgressPhase = (): string => {
    if (completionPercentage >= 90) return 'Final Rounds';
    if (completionPercentage >= 75) return 'Late Rounds';
    if (completionPercentage >= 50) return 'Mid Draft';
    if (completionPercentage >= 25) return 'Early Rounds';
    return 'Draft Beginning';
  };

  return (
    <div className={`draft-progress-bar ${className}`}>
      <div className="progress-header">
        <div className="progress-stats">
          <div className="stat-item">
            <span className="stat-label">Round</span>
            <span className="stat-value">{currentRound} / {totalRounds}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Pick</span>
            <span className="stat-value">{currentPick} / {totalPicks}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Remaining</span>
            <span className="stat-value">{picksRemaining}</span>
          </div>
        </div>
        <div className="progress-phase">
          {getProgressPhase()}
        </div>
      </div>
      
      <div className="progress-container">
        <div className="progress-track">
          <div 
            className="progress-fill"
            style={{ 
              width: `${Math.max(2, completionPercentage)}%`,
              background: `linear-gradient(90deg, ${getProgressColor()}, ${getProgressColor()}aa)`
            }}
          >
            <div className="progress-shimmer"></div>
          </div>
          
          {/* Round markers */}
          <div className="round-markers">
            {Array.from({ length: totalRounds }, (_, index) => {
              const roundProgress = ((index + 1) / totalRounds) * 100;
              const isPastRound = currentRound > index + 1;
              const isCurrentRound = currentRound === index + 1;
              
              return (
                <div
                  key={index}
                  className={`round-marker ${isPastRound ? 'completed' : ''} ${isCurrentRound ? 'current' : ''}`}
                  style={{ left: `${roundProgress}%` }}
                  title={`Round ${index + 1}`}
                >
                  <div className="marker-dot"></div>
                  {(index + 1) % 5 === 0 && ( // Show number every 5 rounds
                    <div className="marker-label">{index + 1}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="progress-percentage">
          {Math.round(completionPercentage)}% Complete
        </div>
      </div>
    </div>
  );
};

export default DraftProgressBar;