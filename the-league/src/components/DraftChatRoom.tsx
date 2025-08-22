import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDraftChat, DraftChatMessage, DRAFT_REACTIONS, ChatReaction } from '../hooks/useDraftChat';
import chatService from '../services/chatService';
import './DraftChatRoom.css';

interface DraftChatRoomProps {
  leagueId?: number;
  userId?: number;
  username?: string;
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
}

interface MessageProps {
  message: DraftChatMessage;
  isOwn: boolean;
  onReact: (messageId: number, emoji: string) => void;
  onReply: (message: DraftChatMessage) => void;
  userId?: number;
}

const EmojiPicker: React.FC<{
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isOpen: boolean;
}> = ({ onSelect, onClose, isOpen }) => {
  if (!isOpen) return null;
  
  const commonEmojis = ['😀', '😂', '❤️', '👍', '👎', '😮', '😢', '😡', '🎉', '🔥', '💎', '🤔', '👏', '🙌'];
  const draftEmojis = Object.values(DRAFT_REACTIONS);
  
  return (
    <div className="emoji-picker" onClick={e => e.stopPropagation()}>
      <div className="emoji-picker__header">
        <span>Draft Reactions</span>
        <button onClick={onClose} className="emoji-picker__close">✖</button>
      </div>
      
      <div className="emoji-section">
        <h4>Draft Picks</h4>
        <div className="emoji-grid">
          {draftEmojis.map(emoji => (
            <button
              key={emoji}
              className="emoji-button"
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      
      <div className="emoji-section">
        <h4>Common</h4>
        <div className="emoji-grid">
          {commonEmojis.map(emoji => (
            <button
              key={emoji}
              className="emoji-button"
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ReactionBar: React.FC<{
  reactions: ChatReaction[];
  onReact: (emoji: string) => void;
  onRemoveReact: (emoji: string) => void;
  userId?: number;
}> = ({ reactions, onReact, onRemoveReact, userId }) => {
  if (!reactions || reactions.length === 0) return null;
  
  return (
    <div className="reaction-bar">
      {reactions.map(reaction => {
        const hasReacted = userId && reaction.users.includes(userId);
        
        return (
          <button
            key={reaction.emoji}
            className={`reaction-button ${hasReacted ? 'reaction-button--active' : ''}`}
            onClick={() => hasReacted ? onRemoveReact(reaction.emoji) : onReact(reaction.emoji)}
            title={`${reaction.count} reaction${reaction.count !== 1 ? 's' : ''}`}
          >
            {reaction.emoji} {reaction.count}
          </button>
        );
      })}
    </div>
  );
};

const VoiceMessagePlayer: React.FC<{
  voiceNote: { url: string; duration: number; waveform?: number[] };
}> = ({ voiceNote }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);
  
  return (
    <div className="voice-message">
      <audio
        ref={audioRef}
        src={voiceNote.url}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
      />
      
      <button className="voice-play-button" onClick={togglePlay}>
        {isPlaying ? '⏸️' : '▶️'}
      </button>
      
      <div className="voice-waveform">
        {voiceNote.waveform && voiceNote.waveform.length > 0 ? (
          voiceNote.waveform.map((amplitude, index) => (
            <div
              key={index}
              className="waveform-bar"
              style={{ 
                height: `${amplitude * 100}%`,
                opacity: (index / voiceNote.waveform!.length) < (currentTime / voiceNote.duration) ? 1 : 0.3
              }}
            />
          ))
        ) : (
          <div className="waveform-placeholder">🎤 Voice message</div>
        )}
      </div>
      
      <span className="voice-duration">
        {Math.floor(currentTime)}s / {Math.floor(voiceNote.duration)}s
      </span>
    </div>
  );
};

const Message: React.FC<MessageProps> = ({ 
  message, 
  isOwn, 
  onReact, 
  onReply, 
  userId 
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };
  
  const renderMessageContent = () => {
    switch (message.type) {
      case 'voice_note':
        return message.voiceNote ? (
          <VoiceMessagePlayer voiceNote={message.voiceNote} />
        ) : (
          <span>🎤 Voice message</span>
        );
      
      case 'pick_reaction':
        return (
          <div className="pick-reaction">
            <span className="reaction-content">{message.message}</span>
            {message.pickReference && (
              <div className="pick-reference">
                Round {message.pickReference.round}, Pick {message.pickReference.pickNumber}
              </div>
            )}
          </div>
        );
      
      case 'celebration':
        return (
          <div className="celebration-message">
            <span className="celebration-content">{message.message}</span>
          </div>
        );
      
      case 'system':
        return <span className="system-message">{message.message}</span>;
      
      default:
        return (
          <span className="message-text">
            {message.message}
            {message.isEdited && <span className="edited-indicator">(edited)</span>}
          </span>
        );
    }
  };
  
  return (
    <div 
      className={`chat-message ${isOwn ? 'chat-message--own' : ''} chat-message--${message.type}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="message-header">
        <span className="message-username">{message.username}</span>
        <span className="message-timestamp">{formatTime(message.timestamp)}</span>
      </div>
      
      <div className="message-content">
        {renderMessageContent()}
      </div>
      
      {message.reactions && (
        <ReactionBar
          reactions={message.reactions}
          onReact={(emoji) => onReact(message.id, emoji)}
          onRemoveReact={(emoji) => onReact(message.id, emoji)}
          userId={userId}
        />
      )}
      
      {showActions && (
        <div className="message-actions">
          <button
            className="action-button"
            onClick={() => setShowEmojiPicker(true)}
            title="Add reaction"
          >
            😀
          </button>
          <button
            className="action-button"
            onClick={() => onReply(message)}
            title="Reply"
          >
            ↩️
          </button>
        </div>
      )}
      
      <EmojiPicker
        isOpen={showEmojiPicker}
        onSelect={(emoji) => onReact(message.id, emoji)}
        onClose={() => setShowEmojiPicker(false)}
      />
    </div>
  );
};

const TypingIndicator: React.FC<{
  typingUsers: Array<{ userId: number; username: string }>;
}> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;
  
  const getUsersText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].username} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].username} and ${typingUsers[1].username} are typing`;
    } else {
      return `${typingUsers.length} people are typing`;
    }
  };
  
  return (
    <div className="typing-indicator">
      <span className="typing-text">{getUsersText()}</span>
      <div className="typing-animation">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
};

const VoiceRecorder: React.FC<{
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  onSend: (blob: Blob) => void;
}> = ({ isRecording, onStart, onStop, onSend }) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRecordingTime(0);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording]);
  
  const handleToggleRecording = () => {
    if (isRecording) {
      onStop();
      // Simulate audio blob creation
      const blob = new Blob(['fake audio data'], { type: 'audio/wav' });
      onSend(blob);
    } else {
      onStart();
    }
  };
  
  return (
    <button
      className={`voice-recorder ${isRecording ? 'voice-recorder--recording' : ''}`}
      onClick={handleToggleRecording}
      title={isRecording ? `Recording (${recordingTime}s)` : 'Record voice message'}
    >
      {isRecording ? (
        <>
          🔴 {recordingTime}s
        </>
      ) : (
        '🎤'
      )}
    </button>
  );
};

const DraftChatRoom: React.FC<DraftChatRoomProps> = ({
  leagueId,
  userId,
  username,
  isVisible,
  onToggle,
  className = ''
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { chatState, actions, messageEndRef } = useDraftChat({
    leagueId,
    userId,
    username,
    isEnabled: true
  });
  
  // Auto-focus input when chat expands
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);
  
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) return;
    
    actions.sendMessage(inputMessage);
    setInputMessage('');
    actions.stopTyping();
  }, [inputMessage, actions]);
  
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    
    if (e.target.value.length === 1) {
      actions.startTyping();
    } else if (e.target.value.length === 0) {
      actions.stopTyping();
    }
  }, [actions]);
  
  const handleQuickReaction = useCallback((emoji: string) => {
    actions.sendPickReaction('Latest Pick', emoji, 1);
    setShowQuickReactions(false);
  }, [actions]);

  const handleClearMessages = useCallback(async () => {
    if (!leagueId || !userId) return;
    
    setIsClearing(true);
    try {
      await chatService.clearAllMessages(leagueId, userId);
      // Note: The draft chat uses a different state management system
      // We'll need to implement clearing in the useDraftChat hook as well
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing draft messages:', error);
      alert('Failed to clear messages. Please try again.');
    } finally {
      setIsClearing(false);
    }
  }, [leagueId, userId]);
  
  if (!isVisible) {
    return (
      <div className="draft-chat-room draft-chat-room--collapsed">
        <button 
          className="chat-toggle"
          onClick={onToggle}
          title="Open Draft Chat"
        >
          💬
          {chatState.unreadCount > 0 && (
            <span className="unread-badge">{chatState.unreadCount}</span>
          )}
        </button>
      </div>
    );
  }
  
  return (
    <div className={`draft-chat-room draft-chat-room--expanded ${className}`}>
      <div className="chat-header">
        <div className="chat-title">
          <h3>Draft Chat</h3>
          <span className="connection-status">
            {chatState.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
        
        <div className="chat-controls">
          <button
            className="clear-btn"
            onClick={() => setShowClearConfirm(true)}
            disabled={chatState.messages.length === 0 || isClearing}
            title="Clear Messages"
          >
            🗑️
          </button>
          
          <button
            className={`quick-reactions-btn ${showQuickReactions ? 'active' : ''}`}
            onClick={() => setShowQuickReactions(!showQuickReactions)}
            title="Quick Reactions"
          >
            🎯
          </button>
          
          <button 
            className="chat-toggle"
            onClick={onToggle}
            title="Close Chat"
          >
            ✖
          </button>
        </div>
      </div>
      
      {showQuickReactions && (
        <div className="quick-reactions">
          <h4>Quick Pick Reactions</h4>
          <div className="quick-reactions-grid">
            {Object.entries(DRAFT_REACTIONS).map(([key, emoji]) => (
              <button
                key={key}
                className="quick-reaction-btn"
                onClick={() => handleQuickReaction(emoji)}
                title={key.replace('_', ' ')}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="chat-messages">
        {chatState.messages.map(message => (
          <Message
            key={message.id}
            message={message}
            isOwn={message.userId === userId}
            onReact={actions.addReaction}
            onReply={actions.setReplyingTo}
            userId={userId}
          />
        ))}
        
        <TypingIndicator typingUsers={chatState.typingUsers} />
        
        <div ref={messageEndRef} />
      </div>
      
      {chatState.replyingTo && (
        <div className="reply-preview">
          <div className="reply-info">
            Replying to <strong>{chatState.replyingTo.username}</strong>
          </div>
          <button
            className="cancel-reply"
            onClick={() => actions.setReplyingTo(null)}
          >
            ✖
          </button>
        </div>
      )}
      
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={inputMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="chat-input"
            maxLength={500}
          />
          
          <div className="input-actions">
            <VoiceRecorder
              isRecording={chatState.isRecordingVoice}
              onStart={actions.startVoiceRecording}
              onStop={actions.stopVoiceRecording}
              onSend={actions.sendVoiceNote}
            />
            
            <button
              className="send-button"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
            >
              📤
            </button>
          </div>
        </div>
      </div>
      
      {/* Clear Messages Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Clear Draft Chat</h3>
              <button 
                className="modal-close"
                onClick={() => setShowClearConfirm(false)}
              >
                ✖
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to clear all draft chat messages?</p>
              <p className="warning-text">This will remove all messages from the draft chat for all users.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn modal-btn-cancel"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
              >
                Cancel
              </button>
              <button 
                className="modal-btn modal-btn-danger"
                onClick={handleClearMessages}
                disabled={isClearing}
              >
                {isClearing ? 'Clearing...' : 'Clear Messages'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftChatRoom;