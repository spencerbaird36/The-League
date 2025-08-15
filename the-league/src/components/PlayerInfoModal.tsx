import React, { useState, useEffect } from 'react';
import { Player } from '../types/Player';
import { apiRequest } from '../config/api';
import Modal from './Modal';
import PlayerCard from './PlayerCard';
import './PlayerInfoModal.css';

interface PlayerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

const PlayerInfoModal: React.FC<PlayerInfoModalProps> = ({ isOpen, onClose, player }) => {
  const [playerWithStats, setPlayerWithStats] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && player) {
      fetchPlayerStats();
    }
  }, [isOpen, player]);

  const fetchPlayerStats = async () => {
    if (!player) return;

    setIsLoading(true);
    setError(null);

    try {
      // First, try to get or create the player to get the database ID
      const getOrCreateResponse = await apiRequest('/api/player/get-or-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: player.name,
          position: player.position,
          team: player.team,
          league: player.league
        })
      });
      
      if (getOrCreateResponse.ok) {
        const playerData = await getOrCreateResponse.json();
        setPlayerWithStats({
          id: playerData.id,
          name: playerData.name,
          position: playerData.position,
          team: playerData.team,
          league: playerData.league as 'NFL' | 'MLB' | 'NBA',
          stats: playerData.stats
        });
      } else {
        // Fallback to original player data if API fails
        console.warn('Failed to fetch player stats, using original player data');
        setPlayerWithStats(player);
      }
    } catch (err) {
      console.error('Error fetching player stats:', err);
      setError('Failed to load player statistics');
      // Fallback to original player data
      setPlayerWithStats(player);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPlayerWithStats(null);
    setError(null);
    onClose();
  };

  if (!player) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${player.name} - Player Information`}
    >
      <div className="player-info-modal-content">
        {isLoading ? (
          <div className="player-loading">
            <div className="loading-spinner"></div>
            <p>Loading player statistics...</p>
          </div>
        ) : error ? (
          <div className="player-error">
            <p style={{ color: '#ff6b6b', marginBottom: '16px' }}>{error}</p>
            <PlayerCard player={player} />
          </div>
        ) : (
          <PlayerCard player={playerWithStats || player} />
        )}
      </div>
    </Modal>
  );
};

export default PlayerInfoModal;