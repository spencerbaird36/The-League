import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/Chat';
import signalRService from '../services/signalRService';

export interface DraftChatMessage extends ChatMessage {
  // Enhanced draft-specific fields
  type: 'message' | 'pick_reaction' | 'system' | 'celebration' | 'voice_note';
  timestamp: string; // Override for consistency in component
  replyTo?: number; // Reference to another message
  reactions?: ChatReaction[];
  mentions?: number[]; // User IDs mentioned in message
  pickReference?: {
    playerName: string;
    position: string;
    team: string;
    round: number;
    pickNumber: number;
  };
  voiceNote?: {
    url: string;
    duration: number; // in seconds
    waveform?: number[]; // Audio visualization data
  };
  isEdited?: boolean;
  editedAt?: string;
}

export interface ChatReaction {
  emoji: string;
  users: number[]; // User IDs who reacted
  count: number;
}

export interface TypingUser {
  userId: number;
  username: string;
  timestamp: Date;
}

export interface DraftChatState {
  messages: DraftChatMessage[];
  isConnected: boolean;
  isExpanded: boolean;
  unreadCount: number;
  typingUsers: TypingUser[];
  replyingTo: DraftChatMessage | null;
  isRecordingVoice: boolean;
}

export interface DraftChatActions {
  // Message actions
  sendMessage: (message: string, mentions?: number[]) => void;
  sendPickReaction: (playerName: string, reaction: string, pickNumber: number) => void;
  sendCelebration: (type: 'draft_complete' | 'great_pick' | 'steal' | 'reach') => void;
  replyToMessage: (messageId: number, reply: string) => void;
  editMessage: (messageId: number, newContent: string) => void;
  deleteMessage: (messageId: number) => void;
  
  // Voice messages
  startVoiceRecording: () => void;
  stopVoiceRecording: () => void;
  sendVoiceNote: (audioBlob: Blob) => void;
  
  // Reactions
  addReaction: (messageId: number, emoji: string) => void;
  removeReaction: (messageId: number, emoji: string) => void;
  
  // UI actions
  setExpanded: (expanded: boolean) => void;
  markAsRead: () => void;
  setReplyingTo: (message: DraftChatMessage | null) => void;
  
  // Typing indicators
  startTyping: () => void;
  stopTyping: () => void;
}

export interface UseDraftChatProps {
  leagueId?: number;
  userId?: number;
  username?: string;
  isEnabled?: boolean;
}

// Quick reactions for draft picks
export const DRAFT_REACTIONS = {
  FIRE: '🔥',
  STEAL: '💎', 
  REACH: '🤔',
  SAFE: '👍',
  RISKY: '😬',
  LOVE: '❤️',
  SURPRISE: '😲',
  THUMBS_UP: '👍',
  THUMBS_DOWN: '👎',
  LAUGH: '😂'
};

// Celebration types
export const CELEBRATIONS = {
  DRAFT_COMPLETE: {
    emoji: '🎉',
    message: 'Draft complete! Great job everyone!',
    animation: 'confetti'
  },
  GREAT_PICK: {
    emoji: '🎯',
    message: 'Fantastic pick!',
    animation: 'sparkle'
  },
  STEAL: {
    emoji: '💎',
    message: 'What a steal!',
    animation: 'diamond'
  },
  REACH: {
    emoji: '🤨',
    message: 'Interesting choice...',
    animation: 'question'
  }
};

export const useDraftChat = ({ 
  leagueId, 
  userId, 
  username,
  isEnabled = true 
}: UseDraftChatProps) => {
  const [chatState, setChatState] = useState<DraftChatState>({
    messages: [],
    isConnected: false,
    isExpanded: false,
    unreadCount: 0,
    typingUsers: [],
    replyingTo: null,
    isRecordingVoice: false
  });
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messageEndRef.current && chatState.isExpanded) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatState.messages, chatState.isExpanded]);
  
  // SignalR connection setup
  useEffect(() => {
    if (!isEnabled || !leagueId) return;
    
    const handleChatMessage = (message: ChatMessage) => {
      // Convert ChatMessage to DraftChatMessage
      const draftMessage: DraftChatMessage = {
        ...message,
        type: 'message',
        timestamp: message.createdAt,
        reactions: []
      };
      
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, draftMessage],
        unreadCount: prev.isExpanded ? prev.unreadCount : prev.unreadCount + 1
      }));
    };
    
    const handleUserTyping = (typingUser: TypingUser) => {
      setChatState(prev => ({
        ...prev,
        typingUsers: [
          ...prev.typingUsers.filter(u => u.userId !== typingUser.userId),
          typingUser
        ]
      }));
      
      // Remove typing indicator after 3 seconds
      setTimeout(() => {
        setChatState(prev => ({
          ...prev,
          typingUsers: prev.typingUsers.filter(u => u.userId !== typingUser.userId)
        }));
      }, 3000);
    };
    
    const handleReactionAdded = (messageId: number, reaction: ChatReaction) => {
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === messageId 
            ? {
                ...msg,
                reactions: [
                  ...(msg.reactions || []).filter(r => r.emoji !== reaction.emoji),
                  reaction
                ]
              }
            : msg
        )
      }));
    };
    
    // Setup SignalR listeners
    signalRService.onMessage(handleChatMessage);
    // Additional SignalR event handlers would go here
    
    return () => {
      // Cleanup SignalR listeners
      signalRService.offMessage(handleChatMessage);
    };
  }, [isEnabled, leagueId]);
  
  const sendMessage = useCallback(async (message: string, mentions: number[] = []) => {
    if (!message.trim() || !leagueId || !userId) return;
    
    try {
      const chatMessage: Omit<DraftChatMessage, 'id' | 'timestamp'> = {
        leagueId,
        userId,
        username: username || 'Unknown',
        message: message.trim(),
        createdAt: new Date().toISOString(),
        type: 'message',
        mentions,
        reactions: []
      };
      
      // Send via SignalR
      await signalRService.sendMessage(leagueId, userId, message.trim());
      
      // Clear reply state
      setChatState(prev => ({ ...prev, replyingTo: null }));
      
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [leagueId, userId, username]);
  
  const sendPickReaction = useCallback(async (
    playerName: string, 
    reaction: string, 
    pickNumber: number
  ) => {
    if (!leagueId || !userId) return;
    
    try {
      const reactionMessage: Omit<DraftChatMessage, 'id' | 'timestamp'> = {
        leagueId,
        userId,
        username: username || 'Unknown',
        message: `${reaction} ${playerName}`,
        createdAt: new Date().toISOString(),
        type: 'pick_reaction',
        pickReference: {
          playerName,
          position: '', // Would be filled from context
          team: '', // Would be filled from context
          round: Math.ceil(pickNumber / 12), // Assuming 12-team league
          pickNumber
        },
        reactions: []
      };
      
      await signalRService.sendMessage(leagueId, userId, reactionMessage.message);
      
    } catch (error) {
      console.error('Failed to send pick reaction:', error);
    }
  }, [leagueId, userId, username]);
  
  const sendCelebration = useCallback(async (
    type: 'draft_complete' | 'great_pick' | 'steal' | 'reach'
  ) => {
    const celebration = CELEBRATIONS[type.toUpperCase() as keyof typeof CELEBRATIONS];
    if (!celebration || !leagueId || !userId) return;
    
    try {
      const celebrationMessage: Omit<DraftChatMessage, 'id' | 'timestamp'> = {
        leagueId,
        userId,
        username: username || 'Unknown',
        message: `${celebration.emoji} ${celebration.message}`,
        createdAt: new Date().toISOString(),
        type: 'celebration',
        reactions: []
      };
      
      await signalRService.sendMessage(leagueId, userId, celebrationMessage.message);
      
    } catch (error) {
      console.error('Failed to send celebration:', error);
    }
  }, [leagueId, userId, username]);
  
  const addReaction = useCallback(async (messageId: number, emoji: string) => {
    if (!userId) return;
    
    try {
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => {
          if (msg.id !== messageId) return msg;
          
          const existingReaction = msg.reactions?.find(r => r.emoji === emoji);
          if (existingReaction) {
            // Add user to existing reaction
            if (!existingReaction.users.includes(userId)) {
              existingReaction.users.push(userId);
              existingReaction.count++;
            }
          } else {
            // Create new reaction
            const newReaction: ChatReaction = {
              emoji,
              users: [userId],
              count: 1
            };
            msg.reactions = [...(msg.reactions || []), newReaction];
          }
          
          return msg;
        })
      }));
      
      // Would send to SignalR here
      // await signalRService.addReaction(messageId, emoji);
      
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  }, [userId]);
  
  const removeReaction = useCallback(async (messageId: number, emoji: string) => {
    if (!userId) return;
    
    try {
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => {
          if (msg.id !== messageId) return msg;
          
          const reactions = msg.reactions?.map(r => {
            if (r.emoji === emoji) {
              return {
                ...r,
                users: r.users.filter(uid => uid !== userId),
                count: r.count - 1
              };
            }
            return r;
          }).filter(r => r.count > 0) || [];
          
          return { ...msg, reactions };
        })
      }));
      
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  }, [userId]);
  
  const startVoiceRecording = useCallback(async () => {
    try {
      setChatState(prev => ({ ...prev, isRecordingVoice: true }));
      
      // Would implement WebRTC voice recording here
      console.log('Starting voice recording...');
      
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      setChatState(prev => ({ ...prev, isRecordingVoice: false }));
    }
  }, []);
  
  const stopVoiceRecording = useCallback(() => {
    setChatState(prev => ({ ...prev, isRecordingVoice: false }));
    console.log('Stopping voice recording...');
  }, []);
  
  const sendVoiceNote = useCallback(async (audioBlob: Blob) => {
    if (!leagueId || !userId) return;
    
    try {
      // Would upload audio blob and get URL
      const voiceUrl = URL.createObjectURL(audioBlob);
      
      const voiceMessage: Omit<DraftChatMessage, 'id' | 'timestamp'> = {
        leagueId,
        userId,
        username: username || 'Unknown',
        message: '🎤 Voice message',
        createdAt: new Date().toISOString(),
        type: 'voice_note',
        voiceNote: {
          url: voiceUrl,
          duration: 5, // Would be calculated from blob
          waveform: [] // Would be generated
        },
        reactions: []
      };
      
      await signalRService.sendMessage(leagueId, userId, voiceMessage.message);
      
    } catch (error) {
      console.error('Failed to send voice note:', error);
    }
  }, [leagueId, userId, username]);
  
  const startTyping = useCallback(() => {
    if (!leagueId || !userId) return;
    
    // Throttle typing indicators
    if (typingTimeoutRef.current) return;
    
    // Would send typing indicator via SignalR
    console.log('User started typing...');
    
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 1000);
  }, [leagueId, userId]);
  
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    // Would send stop typing via SignalR
    console.log('User stopped typing...');
  }, []);
  
  const setExpanded = useCallback((expanded: boolean) => {
    setChatState(prev => ({
      ...prev,
      isExpanded: expanded,
      unreadCount: expanded ? 0 : prev.unreadCount
    }));
  }, []);
  
  const markAsRead = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      unreadCount: 0
    }));
  }, []);
  
  const setReplyingTo = useCallback((message: DraftChatMessage | null) => {
    setChatState(prev => ({ ...prev, replyingTo: message }));
  }, []);
  
  const replyToMessage = useCallback(async (messageId: number, reply: string) => {
    const originalMessage = chatState.messages.find(m => m.id === messageId);
    if (!originalMessage) return;
    
    const replyText = `@${originalMessage.username} ${reply}`;
    await sendMessage(replyText, [originalMessage.userId]);
  }, [chatState.messages, sendMessage]);
  
  const editMessage = useCallback(async (messageId: number, newContent: string) => {
    // Would implement message editing
    console.log('Editing message:', messageId, newContent);
  }, []);
  
  const deleteMessage = useCallback(async (messageId: number) => {
    // Would implement message deletion
    console.log('Deleting message:', messageId);
  }, []);
  
  const actions: DraftChatActions = {
    sendMessage,
    sendPickReaction,
    sendCelebration,
    replyToMessage,
    editMessage,
    deleteMessage,
    startVoiceRecording,
    stopVoiceRecording,
    sendVoiceNote,
    addReaction,
    removeReaction,
    setExpanded,
    markAsRead,
    setReplyingTo,
    startTyping,
    stopTyping
  };
  
  return {
    chatState,
    actions,
    messageEndRef
  };
};