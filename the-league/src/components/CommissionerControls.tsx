import React, { useState, useCallback } from 'react';
import { Player } from '../types/Player';
import { DraftPick } from '../hooks/useDraftState';
import './CommissionerControls.css';

interface CommissionerControlsProps {
  isCommissioner: boolean;
  draftState: any;
  picks: DraftPick[];
  draftOrder: number[];
  availablePlayers: Player[];
  isVisible: boolean;
  onToggle: () => void;
  onDraftAction: (action: DraftAction) => void;
}

export interface DraftAction {
  type: 'pause' | 'resume' | 'reset_timer' | 'skip_pick' | 'undo_pick' | 
        'force_pick' | 'change_order' | 'extend_timer' | 'emergency_stop' |
        'backup_draft' | 'restore_draft' | 'send_announcement';
  data?: any;
}

interface TimerControlsProps {
  currentTime: number;
  isActive: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onExtend: (seconds: number) => void;
}

interface PickManagementProps {
  currentPick: number;
  currentPlayer: number;
  totalPicks: number;
  onSkip: () => void;
  onUndo: () => void;
  onForcePick: (player: Player) => void;
  availablePlayers: Player[];
}

interface DraftOrderProps {
  draftOrder: number[];
  onReorder: (newOrder: number[]) => void;
}

interface EmergencyControlsProps {
  onEmergencyStop: () => void;
  onBackup: () => void;
  onRestore: () => void;
  onAnnouncement: (message: string) => void;
}

const TimerControls: React.FC<TimerControlsProps> = ({
  currentTime,
  isActive,
  onPause,
  onResume,
  onReset,
  onExtend
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timer-controls">
      <h4>Draft Timer</h4>
      
      <div className="timer-display">
        <span className={`time-value ${currentTime <= 10 ? 'time-critical' : ''}`}>
          {formatTime(currentTime)}
        </span>
        <span className={`timer-status ${isActive ? 'active' : 'paused'}`}>
          {isActive ? '⏸️ Running' : '▶️ Paused'}
        </span>
      </div>
      
      <div className="timer-buttons">
        <button
          className="control-btn control-btn--primary"
          onClick={isActive ? onPause : onResume}
        >
          {isActive ? '⏸️ Pause' : '▶️ Resume'}
        </button>
        
        <button
          className="control-btn control-btn--secondary"
          onClick={onReset}
        >
          🔄 Reset
        </button>
      </div>
      
      <div className="timer-extensions">
        <span className="extension-label">Extend Timer:</span>
        <div className="extension-buttons">
          {[30, 60, 120].map(seconds => (
            <button
              key={seconds}
              className="extension-btn"
              onClick={() => onExtend(seconds)}
            >
              +{seconds}s
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const PickManagement: React.FC<PickManagementProps> = ({
  currentPick,
  currentPlayer,
  totalPicks,
  onSkip,
  onUndo,
  onForcePick,
  availablePlayers
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredPlayers = availablePlayers
    .filter(player => 
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.position.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 10);

  const handleForcePick = () => {
    if (selectedPlayer) {
      onForcePick(selectedPlayer);
      setSelectedPlayer(null);
      setShowPlayerSearch(false);
      setSearchQuery('');
    }
  };

  return (
    <div className="pick-management">
      <h4>Pick Management</h4>
      
      <div className="pick-status">
        <div className="current-pick">
          <span className="pick-number">Pick {currentPick} of {totalPicks}</span>
          <span className="current-player">Player {currentPlayer} on the clock</span>
        </div>
      </div>
      
      <div className="pick-actions">
        <button
          className="control-btn control-btn--warning"
          onClick={onSkip}
        >
          ⏭️ Skip Pick
        </button>
        
        <button
          className="control-btn control-btn--danger"
          onClick={onUndo}
        >
          ↩️ Undo Last Pick
        </button>
        
        <button
          className="control-btn control-btn--primary"
          onClick={() => setShowPlayerSearch(!showPlayerSearch)}
        >
          🎯 Force Pick
        </button>
      </div>
      
      {showPlayerSearch && (
        <div className="force-pick-panel">
          <div className="player-search">
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="player-list">
            {filteredPlayers.map(player => (
              <div
                key={player.id}
                className={`player-item ${selectedPlayer?.id === player.id ? 'selected' : ''}`}
                onClick={() => setSelectedPlayer(player)}
              >
                <span className="player-name">{player.name}</span>
                <span className="player-details">{player.position} - {player.team}</span>
              </div>
            ))}
          </div>
          
          <div className="force-pick-actions">
            <button
              className="control-btn control-btn--success"
              onClick={handleForcePick}
              disabled={!selectedPlayer}
            >
              ✅ Force Pick: {selectedPlayer?.name || 'Select Player'}
            </button>
            <button
              className="control-btn control-btn--secondary"
              onClick={() => {
                setShowPlayerSearch(false);
                setSelectedPlayer(null);
                setSearchQuery('');
              }}
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DraftOrderManager: React.FC<DraftOrderProps> = ({ draftOrder, onReorder }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editOrder, setEditOrder] = useState(draftOrder);

  const handleSaveOrder = () => {
    onReorder(editOrder);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditOrder(draftOrder);
    setIsEditing(false);
  };

  const movePlayer = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...editOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      setEditOrder(newOrder);
    }
  };

  return (
    <div className="draft-order-manager">
      <h4>Draft Order</h4>
      
      <div className="order-controls">
        {!isEditing ? (
          <button
            className="control-btn control-btn--primary"
            onClick={() => setIsEditing(true)}
          >
            ✏️ Edit Order
          </button>
        ) : (
          <div className="edit-controls">
            <button
              className="control-btn control-btn--success"
              onClick={handleSaveOrder}
            >
              ✅ Save
            </button>
            <button
              className="control-btn control-btn--secondary"
              onClick={handleCancelEdit}
            >
              ❌ Cancel
            </button>
          </div>
        )}
      </div>
      
      <div className="order-list">
        {(isEditing ? editOrder : draftOrder).map((playerId, index) => (
          <div key={`${playerId}-${index}`} className="order-item">
            <span className="order-position">{index + 1}</span>
            <span className="player-id">Team {playerId}</span>
            
            {isEditing && (
              <div className="order-actions">
                <button
                  className="move-btn"
                  onClick={() => movePlayer(index, 'up')}
                  disabled={index === 0}
                >
                  ▲
                </button>
                <button
                  className="move-btn"
                  onClick={() => movePlayer(index, 'down')}
                  disabled={index === editOrder.length - 1}
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const EmergencyControls: React.FC<EmergencyControlsProps> = ({
  onEmergencyStop,
  onBackup,
  onRestore,
  onAnnouncement
}) => {
  const [announcement, setAnnouncement] = useState('');
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  const handleEmergencyAction = (action: string) => {
    if (showConfirm === action) {
      switch (action) {
        case 'stop':
          onEmergencyStop();
          break;
        case 'restore':
          onRestore();
          break;
      }
      setShowConfirm(null);
    } else {
      setShowConfirm(action);
      setTimeout(() => setShowConfirm(null), 5000);
    }
  };

  const handleSendAnnouncement = () => {
    if (announcement.trim()) {
      onAnnouncement(announcement);
      setAnnouncement('');
    }
  };

  return (
    <div className="emergency-controls">
      <h4>Emergency & Communication</h4>
      
      <div className="backup-controls">
        <button
          className="control-btn control-btn--secondary"
          onClick={onBackup}
        >
          💾 Backup Draft
        </button>
        
        <button
          className={`control-btn control-btn--warning ${showConfirm === 'restore' ? 'confirm-needed' : ''}`}
          onClick={() => handleEmergencyAction('restore')}
        >
          {showConfirm === 'restore' ? '⚠️ Confirm Restore' : '🔄 Restore Backup'}
        </button>
      </div>
      
      <div className="emergency-stop">
        <button
          className={`control-btn control-btn--danger ${showConfirm === 'stop' ? 'confirm-needed' : ''}`}
          onClick={() => handleEmergencyAction('stop')}
        >
          {showConfirm === 'stop' ? '🚨 Confirm Emergency Stop' : '🛑 Emergency Stop'}
        </button>
      </div>
      
      <div className="announcement-panel">
        <h5>Send Announcement</h5>
        <div className="announcement-input">
          <textarea
            placeholder="Type announcement to all participants..."
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            className="announcement-textarea"
            maxLength={200}
          />
          <button
            className="control-btn control-btn--primary"
            onClick={handleSendAnnouncement}
            disabled={!announcement.trim()}
          >
            📢 Send
          </button>
        </div>
      </div>
    </div>
  );
};

const CommissionerControls: React.FC<CommissionerControlsProps> = ({
  isCommissioner,
  draftState,
  picks,
  draftOrder,
  availablePlayers,
  isVisible,
  onToggle,
  onDraftAction
}) => {
  const [activeTab, setActiveTab] = useState<'timer' | 'picks' | 'order' | 'emergency'>('timer');

  const handleTimerAction = useCallback((action: string, data?: any) => {
    onDraftAction({ type: action as any, data });
  }, [onDraftAction]);

  if (!isCommissioner) {
    return null;
  }

  if (!isVisible) {
    return (
      <div className="commissioner-controls commissioner-controls--collapsed">
        <button 
          className="commissioner-toggle"
          onClick={onToggle}
          title="Commissioner Controls"
        >
          ⚙️
        </button>
      </div>
    );
  }

  return (
    <div className="commissioner-controls commissioner-controls--expanded">
      <div className="commissioner-header">
        <div className="commissioner-title">
          <h3>Commissioner Controls</h3>
          <span className="commissioner-badge">ADMIN</span>
        </div>
        <button 
          className="commissioner-toggle"
          onClick={onToggle}
          title="Close Commissioner Controls"
        >
          ✖
        </button>
      </div>
      
      <div className="commissioner-tabs">
        <button 
          className={`tab-button ${activeTab === 'timer' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('timer')}
        >
          ⏱️ Timer
        </button>
        <button 
          className={`tab-button ${activeTab === 'picks' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('picks')}
        >
          🎯 Picks
        </button>
        <button 
          className={`tab-button ${activeTab === 'order' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('order')}
        >
          📋 Order
        </button>
        <button 
          className={`tab-button ${activeTab === 'emergency' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('emergency')}
        >
          🚨 Emergency
        </button>
      </div>
      
      <div className="commissioner-content">
        {activeTab === 'timer' && (
          <TimerControls
            currentTime={draftState?.timeRemaining || 0}
            isActive={draftState?.isTimerActive || false}
            onPause={() => handleTimerAction('pause')}
            onResume={() => handleTimerAction('resume')}
            onReset={() => handleTimerAction('reset_timer')}
            onExtend={(seconds) => handleTimerAction('extend_timer', { seconds })}
          />
        )}
        
        {activeTab === 'picks' && (
          <PickManagement
            currentPick={(draftState?.currentPickNumber || 0) + 1}
            currentPlayer={draftState?.currentPlayerId || 0}
            totalPicks={draftOrder.length * 15}
            onSkip={() => handleTimerAction('skip_pick')}
            onUndo={() => handleTimerAction('undo_pick')}
            onForcePick={(player) => handleTimerAction('force_pick', { player })}
            availablePlayers={availablePlayers}
          />
        )}
        
        {activeTab === 'order' && (
          <DraftOrderManager
            draftOrder={draftOrder}
            onReorder={(newOrder) => handleTimerAction('change_order', { order: newOrder })}
          />
        )}
        
        {activeTab === 'emergency' && (
          <EmergencyControls
            onEmergencyStop={() => handleTimerAction('emergency_stop')}
            onBackup={() => handleTimerAction('backup_draft')}
            onRestore={() => handleTimerAction('restore_draft')}
            onAnnouncement={(message) => handleTimerAction('send_announcement', { message })}
          />
        )}
      </div>
    </div>
  );
};

export default CommissionerControls;