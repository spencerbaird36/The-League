import { useState, useCallback, useRef, useEffect } from 'react';

export interface DraftTimerState {
  timeRemaining: number;
  isActive: boolean;
  isPaused: boolean;
  totalTime: number;
}

export interface DraftTimerActions {
  startTimer: (duration?: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: (duration?: number) => void;
  setTimeRemaining: (time: number) => void;
}

interface UseDraftTimerProps {
  defaultDuration?: number;
  onTimerExpired?: () => void;
  onTimerTick?: (timeRemaining: number) => void;
}

const DEFAULT_TIMER_DURATION = 10; // 10 seconds for testing

export const useDraftTimer = ({
  defaultDuration = DEFAULT_TIMER_DURATION,
  onTimerExpired,
  onTimerTick
}: UseDraftTimerProps = {}): [DraftTimerState, DraftTimerActions] => {
  
  const [state, setState] = useState<DraftTimerState>({
    timeRemaining: defaultDuration,
    isActive: false,
    isPaused: false,
    totalTime: defaultDuration
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbacksRef = useRef({ onTimerExpired, onTimerTick });
  
  // Keep callbacks current
  callbacksRef.current = { onTimerExpired, onTimerTick };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const clearExistingInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback((duration: number = defaultDuration) => {
    console.log('⏰ Starting draft timer with duration:', duration);
    
    clearExistingInterval();
    
    setState(prev => ({
      ...prev,
      timeRemaining: duration,
      totalTime: duration,
      isActive: true,
      isPaused: false
    }));

    intervalRef.current = setInterval(() => {
      setState(currentState => {
        const newTime = currentState.timeRemaining - 1;
        
        console.log('⏰ Timer tick:', newTime);
        
        // Call the tick callback
        if (callbacksRef.current.onTimerTick) {
          callbacksRef.current.onTimerTick(newTime);
        }
        
        if (newTime <= 0) {
          console.log('⏰ Timer expired!');
          
          // Clear the interval
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          
          // Call the expiration callback
          if (callbacksRef.current.onTimerExpired) {
            callbacksRef.current.onTimerExpired();
          }
          
          return {
            ...currentState,
            timeRemaining: 0,
            isActive: false,
            isPaused: false
          };
        }
        
        return {
          ...currentState,
          timeRemaining: newTime
        };
      });
    }, 1000);
  }, [defaultDuration, clearExistingInterval]);

  const pauseTimer = useCallback(() => {
    console.log('⏸️ Pausing draft timer');
    
    clearExistingInterval();
    
    setState(prev => ({
      ...prev,
      isActive: false,
      isPaused: true
    }));
  }, [clearExistingInterval]);

  const resumeTimer = useCallback(() => {
    console.log('▶️ Resuming draft timer');
    
    if (!state.isPaused) {
      console.warn('Timer is not paused, cannot resume');
      return;
    }
    
    setState(prev => ({
      ...prev,
      isActive: true,
      isPaused: false
    }));

    intervalRef.current = setInterval(() => {
      setState(currentState => {
        const newTime = currentState.timeRemaining - 1;
        
        console.log('⏰ Timer tick (resumed):', newTime);
        
        // Call the tick callback
        if (callbacksRef.current.onTimerTick) {
          callbacksRef.current.onTimerTick(newTime);
        }
        
        if (newTime <= 0) {
          console.log('⏰ Timer expired (after resume)!');
          
          // Clear the interval
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          
          // Call the expiration callback
          if (callbacksRef.current.onTimerExpired) {
            callbacksRef.current.onTimerExpired();
          }
          
          return {
            ...currentState,
            timeRemaining: 0,
            isActive: false,
            isPaused: false
          };
        }
        
        return {
          ...currentState,
          timeRemaining: newTime
        };
      });
    }, 1000);
  }, [state.isPaused]);

  const stopTimer = useCallback(() => {
    console.log('⏹️ Stopping draft timer');
    
    clearExistingInterval();
    
    setState(prev => ({
      ...prev,
      isActive: false,
      isPaused: false
    }));
  }, [clearExistingInterval]);

  const resetTimer = useCallback((duration: number = defaultDuration) => {
    console.log('🔄 Resetting draft timer to:', duration);
    
    clearExistingInterval();
    
    setState(prev => ({
      ...prev,
      timeRemaining: duration,
      totalTime: duration,
      isActive: false,
      isPaused: false
    }));
  }, [defaultDuration, clearExistingInterval]);

  const setTimeRemaining = useCallback((time: number) => {
    console.log('⏰ Setting time remaining to:', time);
    
    setState(prev => ({
      ...prev,
      timeRemaining: time
    }));
  }, []);

  const actions: DraftTimerActions = {
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    setTimeRemaining
  };

  return [state, actions];
};