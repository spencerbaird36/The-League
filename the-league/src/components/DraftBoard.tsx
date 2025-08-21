import React from 'react';
import { DraftSlot } from '../hooks/useDraftProgress';
import './DraftBoard.css';

interface DraftBoardProps {
  board: DraftSlot[][];
  onSlotClick?: (slot: DraftSlot) => void;
  className?: string;
}

const DraftBoard: React.FC<DraftBoardProps> = ({ 
  board, 
  onSlotClick,
  className = ''
}) => {
  if (board.length === 0) {
    return (
      <div className={`draft-board empty ${className}`}>
        <p>Draft board will appear here when draft begins</p>
      </div>
    );
  }

  return (
    <div className={`draft-board ${className}`}>
      <div className="board-header">
        <h3>Draft Board</h3>
        <div className="board-legend">
          <div className="legend-item">
            <div className="legend-color current-pick"></div>
            <span>Current Pick</span>
          </div>
          <div className="legend-item">
            <div className="legend-color your-picks"></div>
            <span>Your Picks</span>
          </div>
          <div className="legend-item">
            <div className="legend-color filled-pick"></div>
            <span>Completed</span>
          </div>
        </div>
      </div>
      
      <div className="board-container">
        <div className="board-grid">
          {/* Round headers */}
          <div className="round-headers">
            <div className="corner-cell">Round</div>
            {board[0]?.map((_, index) => (
              <div key={index} className="team-header">
                Team {index + 1}
              </div>
            ))}
          </div>
          
          {/* Draft rounds */}
          {board.map((round, roundIndex) => (
            <div key={roundIndex} className="draft-round">
              <div className="round-number">{roundIndex + 1}</div>
              {round.map((slot, slotIndex) => (
                <div
                  key={`${roundIndex}-${slotIndex}`}
                  className={`draft-slot ${
                    slot.isCurrentPick ? 'current-pick' : ''
                  } ${
                    slot.isUserPick ? 'your-pick' : ''
                  } ${
                    slot.player ? 'filled' : 'empty'
                  }`}
                  onClick={() => onSlotClick?.(slot)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSlotClick?.(slot);
                    }
                  }}
                >
                  <div className="slot-number">{slot.pickNumber}</div>
                  {slot.player ? (
                    <div className="slot-player">
                      <div className="player-name">{slot.player.name}</div>
                      <div className="player-info">
                        {slot.player.position} - {slot.player.team}
                      </div>
                      <div className={`league-badge ${slot.player.league.toLowerCase()}`}>
                        {slot.player.league}
                      </div>
                    </div>
                  ) : (
                    <div className="slot-empty">
                      {slot.isCurrentPick ? (
                        <div className="current-pick-indicator">
                          <div className="pulse-dot"></div>
                          <span>On Clock</span>
                        </div>
                      ) : (
                        <span>--</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DraftBoard;