import React from 'react';
import { Player } from '../types/Player';
import './PlayerCard.css';

interface PlayerCardProps {
  player: Player;
  onClick?: () => void;
  disabled?: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick, disabled }) => {
  const renderStats = () => {
    if (!player.stats) {
      return <p className="no-stats">No stats available</p>;
    }

    const stats = Object.entries(player.stats);
    return (
      <div className="stats-grid">
        {stats.map(([key, value]) => (
          <div key={key} className="stat-item">
            <span className="stat-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
            <span className="stat-value">{value}</span>
          </div>
        ))}
      </div>
    );
  };

  const getPositionColor = () => {
    switch (player.position) {
      case 'QB': return '#4CAF50';
      case 'RB': return '#FF9800';
      case 'WR': return '#2196F3';
      case 'TE': return '#9C27B0';
      case 'PG': case 'SG': return '#E91E63';
      case 'SF': case 'PF': return '#3F51B5';
      case 'C': return '#FF5722';
      case 'SP': case 'CP': return '#8BC34A';
      case '1B': case '2B': case '3B': case 'SS': return '#FFC107';
      case 'RF': case 'CF': case 'LF': return '#00BCD4';
      case 'DH': return '#795548';
      default: return '#9E9E9E';
    }
  };

  return (
    <div 
      className={`player-card ${disabled ? 'disabled' : ''} ${onClick ? 'clickable' : ''}`}
      onClick={onClick && !disabled ? onClick : undefined}
    >
      <div className="player-header">
        <div className="player-info">
          <h2 className="player-name">{player.name}</h2>
          <div className="player-details">
            <span className="player-team">{player.team}</span>
            <span 
              className="player-position" 
              style={{ backgroundColor: getPositionColor() }}
            >
              {player.position}
            </span>
          </div>
        </div>
        <div className={`league-badge ${player.league.toLowerCase()}`}>
          {player.league}
        </div>
      </div>
      
      <div className="player-stats">
        <h3>2024 Season Stats</h3>
        {renderStats()}
      </div>
    </div>
  );
};

export default PlayerCard;