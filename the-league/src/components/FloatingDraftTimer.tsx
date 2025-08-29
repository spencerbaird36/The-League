import React from 'react';
import './FloatingDraftTimer.css';

interface FloatingDraftTimerProps {
  timeRemaining: number;
  isActive: boolean;
  isPaused: boolean;
  isMyTurn: boolean;
  currentPlayerName?: string;
  onExtendTime?: () => void;
  isVisible: boolean; // Control visibility based on scroll position
}

const FloatingDraftTimer: React.FC<FloatingDraftTimerProps> = ({
  timeRemaining,
  isActive,
  isPaused,
  isMyTurn,
  currentPlayerName,
  onExtendTime,
  isVisible
}) => {
  if (!isActive || !isVisible) {
    return null;
  }

  const isUrgent = timeRemaining <= 5;
  const timerPercent = Math.max(0, Math.min(100, (timeRemaining / 15) * 100));

  return (
    <div className={`floating-timer ${isMyTurn ? 'my-turn' : ''} ${isUrgent ? 'urgent' : ''} ${isPaused ? 'paused' : ''}`}>
      <div className="floating-timer-content">
        <div className="timer-info">
          <div className="timer-display">
            <span className="timer-number">{timeRemaining}</span>
            <span className="timer-unit">s</span>
          </div>
          <div className="timer-status">
            {isPaused ? (
              <span className="status-paused">⏸️ Paused</span>
            ) : isMyTurn ? (
              <span className="status-your-turn">🎯 Your Turn</span>
            ) : (
              <span className="status-waiting">
                ⏳ {currentPlayerName || 'Waiting'}...
              </span>
            )}
          </div>
        </div>
        
        <div className="timer-progress-ring">
          <svg className="progress-ring" width="60" height="60">
            <circle
              className="progress-ring-background"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="3"
              fill="transparent"
              r="26"
              cx="30"
              cy="30"
            />
            <circle
              className="progress-ring-progress"
              stroke={isUrgent ? '#ff4444' : isMyTurn ? '#F4D03F' : '#28a745'}
              strokeWidth="3"
              fill="transparent"
              r="26"
              cx="30"
              cy="30"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - timerPercent / 100)}`}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.5s ease',
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%'
              }}
            />
          </svg>
        </div>
      </div>

      {isMyTurn && onExtendTime && (
        <button 
          className="extend-time-btn"
          onClick={onExtendTime}
          title="Extend timer by 30 seconds"
        >
          +30s
        </button>
      )}
    </div>
  );
};

export default FloatingDraftTimer;