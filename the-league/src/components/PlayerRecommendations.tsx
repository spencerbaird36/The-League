import React from 'react';
import { Player } from '../types/Player';
import { TeamNeed } from '../hooks/useDraftAnalytics';
import './PlayerRecommendations.css';

interface PlayerRecommendationsProps {
  suggestions: Player[];
  teamNeeds: TeamNeed[];
  onPlayerClick: (player: Player) => void;
  onPlayerSelect: (player: Player) => void;
  className?: string;
}

const PlayerRecommendations: React.FC<PlayerRecommendationsProps> = ({
  suggestions,
  teamNeeds,
  onPlayerClick,
  onPlayerSelect,
  className = ''
}) => {
  const getRecommendationReason = (player: Player): string => {
    const need = teamNeeds.find(need => need.position === player.position);
    
    if (need) {
      if (need.priority === 'high') {
        return `High need at ${player.position}`;
      } else if (need.priority === 'medium') {
        return `Position need: ${player.position}`;
      } else {
        return `Depth at ${player.position}`;
      }
    }
    
    return 'Best available';
  };

  const getPriorityIcon = (player: Player): string => {
    const need = teamNeeds.find(need => need.position === player.position);
    
    if (need?.priority === 'high') return '🔥';
    if (need?.priority === 'medium') return '⭐';
    return '💡';
  };

  if (suggestions.length === 0) {
    return (
      <div className={`player-recommendations empty ${className}`}>
        <div className="recommendations-header">
          <h3>
            <span className="icon">💡</span>
            Recommendations
          </h3>
        </div>
        <div className="empty-state">
          <p>Recommendations will appear when it's your turn</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`player-recommendations ${className}`}>
      <div className="recommendations-header">
        <h3>
          <span className="icon">💡</span>
          Smart Picks for You
        </h3>
        <div className="header-subtitle">
          Based on your team needs
        </div>
      </div>

      <div className="recommendations-list">
        {suggestions.map((player, index) => (
          <div
            key={`${player.id}-${index}`}
            className="recommendation-card"
            onClick={() => onPlayerClick(player)}
          >
            <div className="recommendation-priority">
              <span className="priority-icon">{getPriorityIcon(player)}</span>
              <span className="recommendation-rank">#{index + 1}</span>
            </div>
            
            <div className="player-details">
              <div className="player-header">
                <span className="player-name">{player.name}</span>
                <span className={`league-badge ${player.league.toLowerCase()}`}>
                  {player.league}
                </span>
              </div>
              
              <div className="player-meta">
                <span className="player-position">{player.position}</span>
                <span className="player-team">{player.team}</span>
              </div>
              
              <div className="recommendation-reason">
                {getRecommendationReason(player)}
              </div>
            </div>
            
            <div className="recommendation-actions">
              <button
                className="quick-draft-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayerSelect(player);
                }}
                title="Quick draft this player"
              >
                <span className="btn-icon">⚡</span>
                Draft
              </button>
            </div>
          </div>
        ))}
      </div>

      {teamNeeds.length > 0 && (
        <div className="team-needs-summary">
          <h4>Your Team Needs</h4>
          <div className="needs-list">
            {teamNeeds.slice(0, 5).map((need, index) => (
              <div
                key={`${need.position}-${index}`}
                className={`need-item priority-${need.priority}`}
              >
                <span className="need-position">{need.position}</span>
                <span className="need-count">
                  {need.filled}/{need.count}
                </span>
                <div className="need-priority">
                  {need.priority === 'high' && '🔥'}
                  {need.priority === 'medium' && '⭐'}
                  {need.priority === 'low' && '💫'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerRecommendations;