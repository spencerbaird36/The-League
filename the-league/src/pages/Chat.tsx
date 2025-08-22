import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatState } from '../types/Chat';
import chatService from '../services/chatService';
import signalRService from '../services/signalRService';
import './Chat.css';

interface OnlineUser {
  userId: number;
  username: string;
  connectedAt: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastLoginAt?: string;
  league?: {
    id: number;
    name: string;
    joinCode: string;
  };
}

interface ChatProps {
  user: User | null;
}

const Chat: React.FC<ChatProps> = ({ user }) => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isConnected: false,
    unreadCount: 0,
    isExpanded: true, // Always expanded on the dedicated page
  });
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Get league info or set defaults
  const leagueId = user?.league?.id || 0;
  const userId = user?.id || 0;
  const username = user?.username || '';
  const leagueName = user?.league?.name || '';

  // Early return if no user or league - but after all hooks
  const shouldShowError = !user?.league;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!leagueId) return;
    
    setChatState(prev => ({ ...prev, isLoading: true }));
    try {
      const messages = await chatService.getMessages(leagueId);
      setChatState(prev => ({ 
        ...prev, 
        messages,
        isLoading: false 
      }));
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      setChatState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const loadUnreadCount = async () => {
    if (!leagueId || !userId) return;
    
    try {
      const readStatus = await chatService.getUnreadCount(leagueId, userId);
      setChatState(prev => ({ 
        ...prev, 
        unreadCount: readStatus.unreadCount 
      }));
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !leagueId || !userId) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      if (chatState.isConnected) {
        await signalRService.sendMessage(leagueId, userId, messageText);
      } else {
        const message = await chatService.sendMessage(leagueId, userId, { message: messageText });
        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, message]
        }));
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
    }
  };

  const handleNewMessage = (message: ChatMessage) => {
    if (message.leagueId === leagueId) {
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
        unreadCount: 0 // Always mark as read on the chat page
      }));

      setTimeout(scrollToBottom, 100);
      // Mark new message as read since we're on the chat page
      setTimeout(async () => {
        try {
          await chatService.markAsRead(leagueId, userId, message.id);
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      }, 500);
    }
  };

  const handleUserOnline = (user: OnlineUser) => {
    setOnlineUsers(prev => {
      const existing = prev.find(u => u.userId === user.userId);
      if (existing) return prev;
      return [...prev, user];
    });
  };

  const handleUserOffline = (user: { userId: number }) => {
    setOnlineUsers(prev => prev.filter(u => u.userId !== user.userId));
  };

  const handleOnlineUsers = (users: OnlineUser[]) => {
    setOnlineUsers(users);
  };

  const handleClearMessages = async () => {
    if (!leagueId || !userId) return;
    
    setIsClearing(true);
    try {
      await chatService.clearAllMessages(leagueId, userId);
      setChatState(prev => ({ 
        ...prev, 
        messages: [],
        unreadCount: 0
      }));
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing messages:', error);
      alert('Failed to clear messages. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 2) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays <= 7) {
      return date.toLocaleDateString([], { weekday: 'long' }) + ` at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  const groupMessagesByUser = (messages: ChatMessage[]) => {
    const groups: ChatMessage[][] = [];
    let currentGroup: ChatMessage[] = [];

    messages.forEach((message, index) => {
      const prevMessage = messages[index - 1];
      const shouldGroup = prevMessage && 
        prevMessage.userId === message.userId &&
        new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 5 * 60 * 1000; // 5 minutes

      if (shouldGroup) {
        currentGroup.push(message);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [message];
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  };

  useEffect(() => {
    if (!leagueId || !userId) {
      return; // Don't initialize chat if no league or user
    }

    const initializeChat = async () => {
      try {
        signalRService.onMessage(handleNewMessage);
        signalRService.onUserOnline(handleUserOnline);
        signalRService.onUserOffline(handleUserOffline);
        signalRService.onOnlineUsers(handleOnlineUsers);
        
        await signalRService.connect();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (signalRService.isConnected()) {
          await signalRService.joinLeague(leagueId, userId);
          setChatState(prev => ({ ...prev, isConnected: true }));
          console.log('Chat page initialized successfully');
        } else {
          throw new Error('SignalR connection failed');
        }
        
        await loadUnreadCount();
        await loadMessages();
      } catch (error) {
        console.error('SignalR initialization failed, using HTTP fallback:', error);
        setChatState(prev => ({ ...prev, isConnected: false }));
        
        try {
          await loadUnreadCount();
          await loadMessages();
        } catch (err) {
          console.error('Error loading chat data:', err);
        }
      }
    };

    initializeChat();

    return () => {
      signalRService.offMessage(handleNewMessage);
      signalRService.offUserOnline(handleUserOnline);
      signalRService.offUserOffline(handleUserOffline);
      signalRService.offOnlineUsers(handleOnlineUsers);
      if (leagueId) {
        signalRService.leaveLeague(leagueId).catch(err => 
          console.warn('Error leaving league on cleanup:', err)
        );
      }
    };
  }, [leagueId, userId]);

  useEffect(() => {
    if (chatState.messages.length > 0) {
      scrollToBottom();
    }
  }, [chatState.messages]);

  const messageGroups = groupMessagesByUser(chatState.messages);

  // Show error state if no user or league
  if (shouldShowError) {
    return (
      <div className="chat-page">
        <div className="chat-error">
          <h2>Chat Unavailable</h2>
          <p>You must be logged in and part of a league to access chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-workspace">
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <div className="league-initial">
              {getInitials(leagueName)}
            </div>
            <div className="league-name">
              {leagueName}
            </div>
          </div>
          
          <div className="online-users">
            <div className="online-users-title">
              Online ({onlineUsers.length})
            </div>
            {onlineUsers.map((user) => (
              <div key={user.userId} className="user-avatar-container">
                <div 
                  className={`user-avatar ${user.userId === userId ? 'current-user' : ''}`}
                  title={user.username}
                >
                  {getInitials(user.username)}
                  <div className="online-indicator"></div>
                </div>
                <span className="user-name">{user.username}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chat-main">
          <div className="chat-header-main">
            <div className="chat-title-section">
              <div className="chat-title">
                <span>#{leagueName.toLowerCase().replace(/\s+/g, '-')}</span>
                <span className={`status-indicator ${chatState.isConnected ? 'live' : 'basic'}`}></span>
              </div>
              <div className="chat-controls">
                <button 
                  className="clear-chat-btn"
                  onClick={() => setShowClearConfirm(true)}
                  disabled={chatState.messages.length === 0 || isClearing}
                  title="Clear all messages"
                >
                  🗑️ Clear Chat
                </button>
              </div>
            </div>
            <div className="chat-subtitle">
              {chatState.isConnected ? 'Live messaging' : 'Basic messaging'} • {onlineUsers.length} online
            </div>
          </div>

          <div className="messages-container" ref={messagesContainerRef}>
            {chatState.isLoading ? (
              <div className="loading-messages">Loading messages...</div>
            ) : messageGroups.length === 0 ? (
              <div className="no-messages">
                <div className="no-messages-icon">💬</div>
                <h3>Welcome to #{leagueName.toLowerCase().replace(/\s+/g, '-')}</h3>
                <p>This is the beginning of your league chat. Start the conversation!</p>
              </div>
            ) : (
              <div className="messages-list">
                {messageGroups.map((group, groupIndex) => (
                  <div 
                    key={groupIndex} 
                    className={`message-group ${group[0].userId === userId ? 'current-user' : ''}`}
                  >
                    <div className="message-header">
                      <div className="message-avatar">
                        {getInitials(group[0].username)}
                      </div>
                      <span className={`message-username ${group[0].userId === userId ? 'current-user' : ''}`}>
                        {group[0].username}
                      </span>
                      <span className="message-time">
                        {formatTime(group[0].createdAt)}
                      </span>
                    </div>
                    
                    {group.map((message) => (
                      <div key={message.id} className="message-content">
                        {message.message}
                      </div>
                    ))}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="input-container">
            <form className="message-form" onSubmit={handleSendMessage}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message #${leagueName.toLowerCase().replace(/\s+/g, '-')}...`}
                className="message-input"
                maxLength={1000}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button 
                type="submit" 
                className="send-button"
                disabled={!newMessage.trim()}
                title="Send message"
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Clear Messages Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Clear All Messages</h3>
              <button 
                className="modal-close"
                onClick={() => setShowClearConfirm(false)}
              >
                ✖
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to clear all chat messages?</p>
              <p className="warning-text">This action cannot be undone and will remove all messages for all users in this league.</p>
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
                {isClearing ? 'Clearing...' : 'Clear All Messages'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;