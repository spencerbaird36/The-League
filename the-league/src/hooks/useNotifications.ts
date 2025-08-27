import { useState, useCallback, useRef } from 'react';
import { cleanPlayerName } from '../utils/playerNameUtils';

export interface DraftNotification {
  id: string;
  type: 'pick' | 'turn' | 'pause' | 'resume' | 'complete' | 'error';
  title: string;
  message: string;
  playerName?: string;
  playerPosition?: string;
  playerTeam?: string;
  isAutoDraft?: boolean;
  timestamp: Date;
  duration?: number; // Auto-dismiss time in ms
}

export interface NotificationActions {
  addNotification: (notification: Omit<DraftNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Convenience methods for common notifications
  notifyPlayerPicked: (playerName: string, position: string, team: string, isAutoDraft?: boolean, drafterName?: string) => void;
  notifyYourTurn: () => void;
  notifyDraftStarted: () => void;
  notifyDraftPaused: () => void;
  notifyDraftResumed: () => void;
  notifyDraftCompleted: () => void;
  notifyError: (message: string) => void;
}

interface UseNotificationsProps {
  maxNotifications?: number;
  defaultDuration?: number;
  enableSounds?: boolean;
}

export const useNotifications = ({
  maxNotifications = 5,
  defaultDuration = 5000,
  enableSounds = true
}: UseNotificationsProps = {}): [DraftNotification[], NotificationActions] => {
  
  const [notifications, setNotifications] = useState<DraftNotification[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Sound utility functions
  const playNotificationSound = useCallback((type: DraftNotification['type']) => {
    if (!enableSounds) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const frequencies = {
        pick: [523.25, 659.25], // C5, E5 - pleasant pick sound
        turn: [523.25, 659.25, 783.99], // C5, E5, G5 - your turn chord
        pause: [392], // G4 - neutral pause
        resume: [523.25], // C5 - positive resume
        complete: [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6 - celebration
        error: [233.08, 207.65] // Bb3, Ab3 - dissonant error
      };
      
      const freqs = frequencies[type] || frequencies.pick;
      
      freqs.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + index * 0.1);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + index * 0.1);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + index * 0.1 + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.3);
        
        oscillator.start(audioContext.currentTime + index * 0.1);
        oscillator.stop(audioContext.currentTime + index * 0.1 + 0.3);
      });
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }, [enableSounds]);

  const addNotification = useCallback((notification: Omit<DraftNotification, 'id' | 'timestamp'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullNotification: DraftNotification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration || defaultDuration
    };

    console.log('🔔 Adding notification:', fullNotification);
    
    setNotifications(prev => {
      const newNotifications = [fullNotification, ...prev];
      
      // Limit the number of notifications
      if (newNotifications.length > maxNotifications) {
        const removedNotifications = newNotifications.slice(maxNotifications);
        removedNotifications.forEach(notif => {
          const timeoutId = timeoutRefs.current.get(notif.id);
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutRefs.current.delete(notif.id);
          }
        });
        return newNotifications.slice(0, maxNotifications);
      }
      
      return newNotifications;
    });

    // Play sound
    playNotificationSound(notification.type);

    // Auto-dismiss after duration
    if (fullNotification.duration && fullNotification.duration > 0) {
      const timeoutId = setTimeout(() => {
        removeNotification(id);
      }, fullNotification.duration);
      
      timeoutRefs.current.set(id, timeoutId);
    }

    return id;
  }, [defaultDuration, maxNotifications, playNotificationSound]);

  const removeNotification = useCallback((id: string) => {
    console.log('🗑️ Removing notification:', id);
    
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    
    // Clear timeout if exists
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    console.log('🧹 Clearing all notifications');
    
    setNotifications([]);
    
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
  }, []);

  // Convenience notification methods
  const notifyPlayerPicked = useCallback((
    playerName: string, 
    position: string, 
    team: string, 
    isAutoDraft: boolean = false,
    drafterName?: string
  ) => {
    const cleanName = cleanPlayerName(playerName);
    const message = drafterName 
      ? `${drafterName} drafted ${cleanName} (${position} - ${team})`
      : `${cleanName} (${position} - ${team})`;
      
    addNotification({
      type: 'pick',
      title: isAutoDraft ? 'Auto-Draft Pick' : 'Player Drafted',
      message,
      playerName: cleanName,
      playerPosition: position,
      playerTeam: team,
      isAutoDraft,
      duration: 4000
    });
  }, [addNotification]);

  const notifyYourTurn = useCallback(() => {
    addNotification({
      type: 'turn',
      title: 'Your Turn!',
      message: 'It\'s your turn to make a draft pick',
      duration: 0 // Don't auto-dismiss - important notification
    });
  }, [addNotification]);

  const notifyDraftStarted = useCallback(() => {
    addNotification({
      type: 'turn',
      title: 'Draft Started',
      message: 'The draft has begun! Good luck!',
      duration: 3000
    });
  }, [addNotification]);

  const notifyDraftPaused = useCallback(() => {
    addNotification({
      type: 'pause',
      title: 'Draft Paused',
      message: 'The draft has been paused',
      duration: 3000
    });
  }, [addNotification]);

  const notifyDraftResumed = useCallback(() => {
    addNotification({
      type: 'resume',
      title: 'Draft Resumed',
      message: 'The draft has been resumed',
      duration: 3000
    });
  }, [addNotification]);

  const notifyDraftCompleted = useCallback(() => {
    addNotification({
      type: 'complete',
      title: 'Draft Complete!',
      message: 'The draft has been completed. Good luck this season!',
      duration: 8000
    });
  }, [addNotification]);

  const notifyError = useCallback((message: string) => {
    addNotification({
      type: 'error',
      title: 'Error',
      message,
      duration: 6000
    });
  }, [addNotification]);

  const actions: NotificationActions = {
    addNotification,
    removeNotification,
    clearAllNotifications,
    notifyPlayerPicked,
    notifyYourTurn,
    notifyDraftStarted,
    notifyDraftPaused,
    notifyDraftResumed,
    notifyDraftCompleted,
    notifyError
  };

  return [notifications, actions];
};