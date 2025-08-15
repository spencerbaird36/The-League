import React from 'react';
import { Player } from '../types/Player';
import Modal from './Modal';
import './DraftConfirmationModal.css';

interface DraftConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  player: Player | null;
  isProcessing?: boolean;
}

const DraftConfirmationModal: React.FC<DraftConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  player, 
  isProcessing = false 
}) => {
  if (!player) return null;

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
      case 'OF': return '#00BCD4';
      case 'DH': return '#795548';
      default: return '#9E9E9E';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Draft Pick"
    >
      <div className="draft-confirmation-content">
        <div className="confirmation-player-summary">
          <div className="player-summary-header">
            <h3 className="confirmation-player-name">{player.name}</h3>
            <div className="player-summary-details">
              <span className="confirmation-player-team">{player.team}</span>
              <span 
                className="confirmation-player-position" 
                style={{ backgroundColor: getPositionColor() }}
              >
                {player.position}
              </span>
              <span className={`confirmation-league-badge ${player.league.toLowerCase()}`}>
                {player.league}
              </span>
            </div>
          </div>
        </div>
        
        <div className="confirmation-message">
          <p>Do you want to draft <strong>{player.name}</strong>?</p>
          <p className="confirmation-subtitle">This action cannot be undone.</p>
        </div>
        
        <div className="confirmation-actions">
          <button 
            onClick={onClose} 
            className="confirmation-btn cancel"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="confirmation-btn confirm"
            disabled={isProcessing}
          >
            {isProcessing ? 'Drafting...' : 'Confirm Draft'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DraftConfirmationModal;