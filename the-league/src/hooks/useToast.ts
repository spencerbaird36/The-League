import { useState, useCallback } from 'react';
import { ToastData } from '../components/Toast';

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((
    message: string, 
    type: 'success' | 'info' | 'warning' | 'error' = 'info',
    duration?: number
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastData = {
      id,
      message,
      type,
      duration: duration || 4000
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const addDraftToast = useCallback((
    playerName: string,
    playerPosition: string,
    playerTeam: string,
    isAutoDraft: boolean = false
  ) => {
    console.log('🎯 Adding draft toast:', { playerName, playerPosition, playerTeam, isAutoDraft });
    
    const message = isAutoDraft 
      ? `Auto-drafted: ${playerName} (${playerPosition}, ${playerTeam})`
      : `Drafted: ${playerName} (${playerPosition}, ${playerTeam})`;
    
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastData = {
      id,
      message,
      type: 'success',
      duration: 5000
    };

    console.log('🎯 Toast created:', newToast);
    setToasts(prev => {
      console.log('🎯 Current toasts:', prev);
      const newToasts = [...prev, newToast];
      console.log('🎯 Updated toasts:', newToasts);
      return newToasts;
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    addDraftToast,
    removeToast,
    clearAllToasts
  };
};