import React, { useState, useEffect, useRef } from 'react';
import './TimerDisplay.css';

interface TimerDisplayProps {
  isDrafting: boolean;
  isPaused: boolean;
  timeRemaining: number;
  timeoutMessage: string;
  startDraft?: () => void;
  togglePause: () => void;
  showStartButton?: boolean;
  timerStartTime?: number | null;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
  isDrafting,
  isPaused,
  timeRemaining,
  timeoutMessage,
  startDraft,
  togglePause,
  showStartButton = false,
  timerStartTime
}) => {
  const [displayTime, setDisplayTime] = useState(timeRemaining);
  const animationRef = useRef<number | undefined>(undefined);
  
  // Update display time smoothly using animation frame
  useEffect(() => {
    if (!isDrafting || isPaused || !timerStartTime) {
      setDisplayTime(timeRemaining);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }
    
    const updateTimer = () => {
      const elapsed = (Date.now() - timerStartTime) / 1000;
      const remaining = Math.max(0, 5 - elapsed); // TESTING: reduced from 15 to 5 seconds
      setDisplayTime(Math.ceil(remaining));
      
      if (remaining > 0) {
        animationRef.current = requestAnimationFrame(updateTimer);
      }
    };
    
    animationRef.current = requestAnimationFrame(updateTimer);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDrafting, isPaused, timerStartTime, timeRemaining]);
  if (!isDrafting && !showStartButton) {
    return null;
  }

  return (
    <div className="timer-display-section">
      {!isDrafting && showStartButton ? (
        <button className="begin-draft-btn" onClick={startDraft}>
          Begin Draft
        </button>
      ) : (
        <div className="timer-container">
          <div className="timer-display">
            <span className="timer-label">
              {isPaused ? 'Paused:' : 'Time Remaining:'}
            </span>
            <span className={`timer-value ${displayTime <= 10 && !isPaused ? 'urgent' : ''} ${isPaused ? 'paused' : ''}`}>
              {displayTime}s
            </span>
          </div>
          <div className="timer-bar-container">
            <div 
              className={`timer-bar ${displayTime <= 10 && !isPaused ? 'urgent' : ''} ${isPaused ? 'paused' : ''}`}
              style={{ width: `${(displayTime / 5) * 100}%` }} // TESTING: reduced from 15 to 5 seconds
            />
          </div>
          <button 
            className="pause-btn"
            onClick={togglePause}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
      )}
      
      {timeoutMessage && (
        <div className="timeout-message">
          {timeoutMessage}
        </div>
      )}
    </div>
  );
};

export default TimerDisplay;