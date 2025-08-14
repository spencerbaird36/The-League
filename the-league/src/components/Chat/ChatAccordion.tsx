import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatState } from '../../types/Chat';
import chatService from '../../services/chatService';
import signalRService from '../../services/signalRService';
import './ChatAccordion.css';

interface ChatAccordionProps {
  leagueId: number;
  userId: number;
  username: string;
}

const ChatAccordion: React.FC<ChatAccordionProps> = ({ leagueId, userId, username }) => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isConnected: false,
    unreadCount: 0,
    isExpanded: false,
  });
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);

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
        // Try SignalR first
        await signalRService.sendMessage(leagueId, userId, messageText);
      } else {
        // Fallback to HTTP API
        console.log('SignalR not connected, using HTTP API fallback');
        const message = await chatService.sendMessage(leagueId, userId, { message: messageText });
        
        // Add the message to local state since we won't get it via SignalR
        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, message]
        }));
        
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the message text if it failed
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
      // Opening chat - load messages and mark as read
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
        // Mark new message as read if chat is open
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

  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Set up message listener first
        signalRService.onMessage(handleNewMessage);
        
        // Try to connect to SignalR
        await signalRService.connect();
        
        // Wait a bit for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (signalRService.isConnected()) {
          await signalRService.joinLeague(leagueId, userId);
          setChatState(prev => ({ ...prev, isConnected: true }));
          console.log('SignalR chat initialized successfully');
        } else {
          throw new Error('SignalR connection failed');
        }
        
        // Load initial unread count
        await loadUnreadCount();
      } catch (error) {
        console.error('SignalR initialization failed, will use HTTP API fallback:', error);
        setChatState(prev => ({ ...prev, isConnected: false }));
        
        // Still load unread count even if SignalR fails
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`chat-accordion ${chatState.isExpanded ? 'expanded' : 'collapsed'}`}>
      <button 
        className="chat-tab" 
        onClick={handleToggleExpanded}
        title={chatState.isExpanded ? 'Close Chat' : 'Open Chat'}
      >
        <span className="chat-icon">💬</span>
        <span className="chat-label">Chat</span>
        {chatState.unreadCount > 0 && (
          <span className="unread-badge">{chatState.unreadCount}</span>
        )}
        <span className={`expand-icon ${chatState.isExpanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {chatState.isExpanded && (
        <div className="chat-container">
          <div className="chat-header">
            <h3>League Chat</h3>
            <div className="connection-status">
              <span className={`status-dot ${chatState.isConnected ? 'connected' : 'disconnected'}`}></span>
              {chatState.isConnected ? 'Live Chat' : 'Basic Chat'}
            </div>
          </div>

          <div className="chat-body" ref={chatBodyRef}>
            {chatState.isLoading ? (
              <div className="loading-messages">Loading messages...</div>
            ) : chatState.messages.length === 0 ? (
              <div className="no-messages">No messages yet. Start the conversation!</div>
            ) : (
              <div className="messages-list">
                {chatState.messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`message ${message.userId === userId ? 'own-message' : 'other-message'}`}
                  >
                    <div className="message-header">
                      <span className="message-username">{message.username}</span>
                      <span className="message-time">{formatTime(message.createdAt)}</span>
                    </div>
                    <div className="message-content">{message.message}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={chatState.isConnected ? "Type a message..." : "Type a message (basic mode)..."}
              className="chat-input"
              maxLength={1000}
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={!newMessage.trim()}
              title={chatState.isConnected ? "Send message (live)" : "Send message"}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatAccordion;