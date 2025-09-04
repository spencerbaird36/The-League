import React, { useState, useEffect } from 'react';
import { Player } from '../types/Player';
import { 
  TradeStep, 
  TradeModalState, 
  LeagueTeam, 
  TradePlayer,
  CreateTradeProposalRequest 
} from '../types/Trade';
import { tradeProposalService } from '../services/tradeProposalService';
import './TradeProposalModal.css';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  league?: {
    id: number;
    name: string;
    joinCode: string;
  };
}

interface TradeProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  userRoster: Player[];
  onTradeProposed?: () => void;
}

const TradeProposalModal: React.FC<TradeProposalModalProps> = ({
  isOpen,
  onClose,
  user,
  userRoster,
  onTradeProposed
}) => {
  const [state, setState] = useState<TradeModalState>({
    currentStep: TradeStep.SELECT_TEAM,
    selectedTeam: null,
    selectedTheirPlayers: [],
    selectedMyPlayers: [],
    message: '',
    isLoading: false,
    error: null
  });

  const [leagueTeams, setLeagueTeams] = useState<LeagueTeam[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState({
        currentStep: TradeStep.SELECT_TEAM,
        selectedTeam: null,
        selectedTheirPlayers: [],
        selectedMyPlayers: [],
        message: '',
        isLoading: false,
        error: null
      });
      loadLeagueTeams();
    }
  }, [isOpen]);

  const loadLeagueTeams = async () => {
    if (!user.league?.id) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const teams = await tradeProposalService.getLeagueTeams(user.league.id);
      // Filter out the current user's team
      const otherTeams = teams.filter(team => team.userId !== user.id);
      setLeagueTeams(otherTeams);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to load league teams: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Convert Player to TradePlayer format
  const convertToTradePlayer = (player: Player): TradePlayer => ({
    id: parseInt(player.id),
    playerName: player.name,
    playerPosition: player.position,
    playerTeam: player.team,
    playerLeague: player.league,
    pickNumber: 0, // This would need to be populated from roster data
    round: 0 // This would need to be populated from roster data
  });

  const handleTeamSelect = (team: LeagueTeam) => {
    setState(prev => ({
      ...prev,
      selectedTeam: team,
      currentStep: TradeStep.SELECT_THEIR_PLAYERS,
      selectedTheirPlayers: [],
      selectedMyPlayers: []
    }));
  };

  const handleTheirPlayerToggle = (player: TradePlayer | Player) => {
    // Ensure we're working with a TradePlayer
    const tradePlayer = 'playerName' in player ? player : convertToTradePlayer(player);
    setState(prev => ({
      ...prev,
      selectedTheirPlayers: prev.selectedTheirPlayers.some(p => p.id === tradePlayer.id)
        ? prev.selectedTheirPlayers.filter(p => p.id !== tradePlayer.id)
        : [...prev.selectedTheirPlayers, tradePlayer]
    }));
  };

  const handleMyPlayerToggle = (player: TradePlayer | Player) => {
    // Convert to TradePlayer format for consistency
    const tradePlayer = 'playerName' in player ? player : convertToTradePlayer(player);
    setState(prev => ({
      ...prev,
      selectedMyPlayers: prev.selectedMyPlayers.some(p => p.id === tradePlayer.id)
        ? prev.selectedMyPlayers.filter(p => p.id !== tradePlayer.id)
        : [...prev.selectedMyPlayers, tradePlayer]
    }));
  };

  const handleNextStep = () => {
    switch (state.currentStep) {
      case TradeStep.SELECT_THEIR_PLAYERS:
        if (state.selectedTheirPlayers.length > 0) {
          setState(prev => ({ ...prev, currentStep: TradeStep.SELECT_MY_PLAYERS }));
        }
        break;
      case TradeStep.SELECT_MY_PLAYERS:
        if (state.selectedMyPlayers.length > 0) {
          setState(prev => ({ ...prev, currentStep: TradeStep.REVIEW_TRADE }));
        }
        break;
    }
  };

  const handlePrevStep = () => {
    switch (state.currentStep) {
      case TradeStep.SELECT_THEIR_PLAYERS:
        setState(prev => ({ 
          ...prev, 
          currentStep: TradeStep.SELECT_TEAM,
          selectedTeam: null,
          selectedTheirPlayers: [],
          selectedMyPlayers: []
        }));
        break;
      case TradeStep.SELECT_MY_PLAYERS:
        setState(prev => ({ 
          ...prev, 
          currentStep: TradeStep.SELECT_THEIR_PLAYERS,
          selectedMyPlayers: []
        }));
        break;
      case TradeStep.REVIEW_TRADE:
        setState(prev => ({ ...prev, currentStep: TradeStep.SELECT_MY_PLAYERS }));
        break;
    }
  };

  const handleSendTrade = async () => {
    if (!user.league?.id || !state.selectedTeam || 
        state.selectedTheirPlayers.length === 0 || 
        state.selectedMyPlayers.length === 0) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const request: CreateTradeProposalRequest = {
        leagueId: user.league.id,
        proposingUserId: user.id,
        targetUserId: state.selectedTeam.userId,
        proposingPlayerIds: state.selectedMyPlayers.map(p => p.id),
        targetPlayerIds: state.selectedTheirPlayers.map(p => p.id),
        message: state.message.trim() || undefined
      };

      await tradeProposalService.createTradeProposal(request);
      setState(prev => ({ 
        ...prev, 
        currentStep: TradeStep.TRADE_SENT,
        isLoading: false 
      }));
      
      // Notify parent component that a trade was proposed so it can refresh notifications
      onTradeProposed?.();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to send trade proposal: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false
      }));
    }
  };

  const getStepTitle = () => {
    switch (state.currentStep) {
      case TradeStep.SELECT_TEAM:
        return 'Select Team to Trade With';
      case TradeStep.SELECT_THEIR_PLAYERS:
        return `Select Players from ${state.selectedTeam?.username || 'Team'}`;
      case TradeStep.SELECT_MY_PLAYERS:
        return 'Select Your Players to Trade';
      case TradeStep.REVIEW_TRADE:
        return 'Review Trade Proposal';
      case TradeStep.TRADE_SENT:
        return 'Trade Proposal Sent!';
      default:
        return 'Propose Trade';
    }
  };

  const renderTeamSelection = () => (
    <div className="team-selection">
      <p className="step-description">Choose which team you'd like to propose a trade with:</p>
      {state.isLoading ? (
        <div className="loading">Loading teams...</div>
      ) : (
        <div className="teams-list">
          {leagueTeams.map(team => (
            <div 
              key={team.userId}
              className="team-card"
              onClick={() => handleTeamSelect(team)}
            >
              <div className="team-info">
                <h3>{team.username}</h3>
                <p className="team-name">{team.firstName} {team.lastName}</p>
                <p className="roster-count">{team.roster.length} players</p>
              </div>
              <div className="select-arrow">→</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPlayerSelection = (
    players: (TradePlayer | Player)[], 
    selectedPlayers: (TradePlayer | Player)[], 
    onToggle: (player: TradePlayer | Player) => void,
    isTheirPlayers: boolean = false
  ) => (
    <div className="player-selection">
      <p className="step-description">
        {isTheirPlayers 
          ? `Select the players you want from ${state.selectedTeam?.username}:`
          : 'Select the players you want to trade away:'}
      </p>
      <div className="players-grid">
        {players.map(player => {
          // Type guards to safely access properties
          const isTradePlayer = 'playerName' in player;
          const playerId = isTradePlayer ? player.id : parseInt(player.id);
          const playerName = isTradePlayer ? player.playerName : player.name;
          const playerPosition = isTradePlayer ? player.playerPosition : player.position;
          const playerTeam = isTradePlayer ? player.playerTeam : player.team;
          
          const isSelected = selectedPlayers.some(p => {
            const selectedId = 'playerName' in p ? p.id : parseInt(p.id);
            return selectedId === playerId;
          });

          return (
            <div 
              key={playerId}
              className={`player-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggle(player)}
            >
              <div className="player-info">
                <h4>{playerName}</h4>
                <div className="player-details">
                  <span className="position">{playerPosition}</span>
                  <span className="team">{playerTeam}</span>
                </div>
              </div>
              {isSelected && <div className="selection-indicator">✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderReviewTrade = () => (
    <div className="trade-review">
      <div className="trade-summary">
        <div className="trade-side">
          <h3>You Give</h3>
          <div className="players-list">
            {state.selectedMyPlayers.map(player => (
              <div key={player.id} className="review-player">
                <span className="name">{player.playerName}</span>
                <span className="position">{player.playerPosition}</span>
                <span className="team">{player.playerTeam}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="trade-arrow">⇄</div>
        
        <div className="trade-side">
          <h3>You Receive</h3>
          <div className="players-list">
            {state.selectedTheirPlayers.map(player => (
              <div key={player.id} className="review-player">
                <span className="name">{player.playerName}</span>
                <span className="position">{player.playerPosition}</span>
                <span className="team">{player.playerTeam}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="trade-message">
        <label htmlFor="tradeMessage">Optional Message:</label>
        <textarea
          id="tradeMessage"
          value={state.message}
          onChange={(e) => setState(prev => ({ ...prev, message: e.target.value }))}
          placeholder="Add a message to your trade proposal..."
          maxLength={500}
        />
      </div>
    </div>
  );

  const renderTradeSent = () => (
    <div className="trade-sent">
      <div className="success-icon">✅</div>
      <h3>Trade Proposal Sent!</h3>
      <p>Your trade proposal has been sent to {state.selectedTeam?.username}.</p>
      <p>They will be notified and can accept or decline your offer.</p>
      <button 
        className="close-btn"
        onClick={onClose}
      >
        Close
      </button>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="trade-proposal-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{getStepTitle()}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {state.error && (
            <div className="error-message">{state.error}</div>
          )}

          {state.currentStep === TradeStep.SELECT_TEAM && renderTeamSelection()}
          
          {state.currentStep === TradeStep.SELECT_THEIR_PLAYERS && state.selectedTeam &&
            renderPlayerSelection(
              state.selectedTeam.roster, 
              state.selectedTheirPlayers, 
              handleTheirPlayerToggle,
              true
            )}
          
          {state.currentStep === TradeStep.SELECT_MY_PLAYERS &&
            renderPlayerSelection(
              userRoster, 
              state.selectedMyPlayers, 
              handleMyPlayerToggle,
              false
            )}
          
          {state.currentStep === TradeStep.REVIEW_TRADE && renderReviewTrade()}
          
          {state.currentStep === TradeStep.TRADE_SENT && renderTradeSent()}
        </div>

        {state.currentStep !== TradeStep.TRADE_SENT && (
          <div className="modal-footer">
            <div className="step-buttons">
              {state.currentStep !== TradeStep.SELECT_TEAM && (
                <button 
                  className="back-btn"
                  onClick={handlePrevStep}
                  disabled={state.isLoading}
                >
                  ← Back
                </button>
              )}
              
              <div className="progress-indicator">
                Step {Object.values(TradeStep).indexOf(state.currentStep) + 1} of 4
              </div>
              
              {state.currentStep === TradeStep.SELECT_THEIR_PLAYERS && (
                <button 
                  className="next-btn"
                  onClick={handleNextStep}
                  disabled={state.selectedTheirPlayers.length === 0}
                >
                  Next →
                </button>
              )}
              
              {state.currentStep === TradeStep.SELECT_MY_PLAYERS && (
                <button 
                  className="next-btn"
                  onClick={handleNextStep}
                  disabled={state.selectedMyPlayers.length === 0}
                >
                  Review →
                </button>
              )}
              
              {state.currentStep === TradeStep.REVIEW_TRADE && (
                <button 
                  className="send-btn"
                  onClick={handleSendTrade}
                  disabled={state.isLoading}
                >
                  {state.isLoading ? 'Sending...' : '🤝 Send Trade Proposal'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeProposalModal;