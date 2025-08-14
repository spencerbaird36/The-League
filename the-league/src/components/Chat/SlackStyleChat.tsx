import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatState } from '../../types/Chat';
import chatService from '../../services/chatService';
import signalRService from '../../services/signalRService';
import './SlackStyleChat.css';

interface OnlineUser {
  userId: number;
  username: string;
  connectedAt: string;
}

interface SlackStyleChatProps {
  leagueId: number;
  userId: number;
  username: string;
  leagueName?: string;
}

const SlackStyleChat: React.FC<SlackStyleChatProps> = ({ 
  leagueId, 
  userId, 
  username, 
  leagueName = 'League' 
}) => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isConnected: false,
    unreadCount: 0,
    isExpanded: false,
  });
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
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
    if (!newMessage.trim()) return;

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

  const handleToggleExpanded = async () => {
    const wasExpanded = chatState.isExpanded;
    setChatState(prev => ({ 
      ...prev, 
      isExpanded: !prev.isExpanded 
    }));

    if (!wasExpanded) {
      await loadMessages();
      if (chatState.messages.length > 0) {
        const lastMessage = chatState.messages[chatState.messages.length - 1];
        try {
          await chatService.markAsRead(leagueId, userId, lastMessage.id);
          setChatState(prev => ({ ...prev, unreadCount: 0 }));
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      }
    }
  };

  const handleNewMessage = (message: ChatMessage) => {
    if (message.leagueId === leagueId) {
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
        unreadCount: prev.isExpanded ? 0 : prev.unreadCount + 1
      }));

      if (chatState.isExpanded) {
        setTimeout(scrollToBottom, 100);
        setTimeout(async () => {
          try {
            await chatService.markAsRead(leagueId, userId, message.id);
          } catch (error) {
            console.error('Error marking message as read:', error);
          }
        }, 500);
      }
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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
          console.log('Slack-style chat initialized successfully');
        } else {
          throw new Error('SignalR connection failed');
        }
        
        await loadUnreadCount();
      } catch (error) {
        console.error('SignalR initialization failed, using HTTP fallback:', error);
        setChatState(prev => ({ ...prev, isConnected: false }));
        
        try {
          await loadUnreadCount();
        } catch (err) {
          console.error('Error loading unread count:', err);
        }
      }
    };

    initializeChat();

    return () => {
      signalRService.offMessage(handleNewMessage);
      signalRService.offUserOnline(handleUserOnline);
      signalRService.offUserOffline(handleUserOffline);
      signalRService.offOnlineUsers(handleOnlineUsers);
      signalRService.leaveLeague(leagueId).catch(err => 
        console.warn('Error leaving league on cleanup:', err)
      );
    };
  }, [leagueId, userId]);

  useEffect(() => {
    if (chatState.isExpanded && chatState.messages.length > 0) {
      scrollToBottom();
    }
  }, [chatState.messages, chatState.isExpanded]);

  const messageGroups = groupMessagesByUser(chatState.messages);

  return (
    <div className={`slack-chat ${chatState.isExpanded ? 'expanded' : 'collapsed'}`}>
      <button 
        className="chat-toggle" 
        onClick={handleToggleExpanded}
        title={chatState.isExpanded ? 'Close Chat' : 'Open Chat'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="chat-icon">💬</span>
          <span className="chat-label">Chat</span>
        </div>
        {chatState.unreadCount > 0 && (
          <span className="unread-badge">{chatState.unreadCount}</span>
        )}
        <span className={`expand-arrow ${chatState.isExpanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {chatState.isExpanded && (
        <div className="chat-workspace">
          <div className="chat-sidebar">
            <div className="sidebar-header">
              <div className="league-initial">
                {getInitials(leagueName)}
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
                </div>
              ))}
            </div>
          </div>

          <div className="chat-main">
            <div className="chat-header-main">
              <div className="chat-title">
                <span>#{leagueName.toLowerCase().replace(/\s+/g, '-')}</span>
                <span className={`status-indicator ${chatState.isConnected ? 'live' : 'basic'}`}></span>
              </div>
              <div className="chat-subtitle">
                {chatState.isConnected ? 'Live messaging' : 'Basic messaging'} • {onlineUsers.length} online
              </div>
            </div>

            <div className="messages-container" ref={messagesContainerRef}>
              {chatState.isLoading ? (
                <div className="loading-messages">Loading messages...</div>
              ) : messageGroups.length === 0 ? (
                <div className="no-messages">No messages yet. Start the conversation!</div>
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
      )}
    </div>
  );
};

export default SlackStyleChat;