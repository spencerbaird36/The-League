import React, { useState, useEffect, useRef, useCallback } from 'react';
import FreeAgentsComponent from './pages/FreeAgentsNew';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import { DraftProvider } from './context/DraftContext';
import { Player } from './types/Player';
import { players } from './data/players';
import signalRService from './services/signalRService';
import './App.css';
import { apiRequest } from './config/api';
import { useToast } from './hooks/useToast';

// Import all components directly to avoid lazy loading issues
import Home from './pages/Home';
import Draft from './pages/Draft';
import MyTeam from './pages/MyTeam';
import Standings from './pages/Standings';
import Schedule from './pages/Schedule';
import TeamPage from './pages/TeamPage';
import Chat from './pages/Chat';
import LeagueSettings from './pages/LeagueSettings';
import AdminDashboard from './pages/AdminDashboard';
import GamesAccordion from './components/Games/GamesAccordion';
import BetSlip from './components/BetSlip/BetSlip';

interface League {
  id: number;
  name: string;
  joinCode: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastLoginAt?: string;
  league?: League;
}

// AppContent component that uses useNavigate
const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const { addDraftToast } = useToast();
  
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Shared drafted player state
  const [draftedNFL, setDraftedNFL] = useState<Player[]>([]);
  const [draftedMLB, setDraftedMLB] = useState<Player[]>([]);
  const [draftedNBA, setDraftedNBA] = useState<Player[]>([]);

  // Shared draft timer state
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(15);
  const [timeoutMessage, setTimeoutMessage] = useState<string>('');
  const [hasWarned, setHasWarned] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerStartRef = useRef<number | null>(null);

  // Auto Draft state
  const [isAutoDrafting, setIsAutoDrafting] = useState<boolean>(false);
  const autoDraftTimerRef = useRef<NodeJS.Timeout | null>(null);


  const allDraftedPlayers = [...draftedNFL, ...draftedMLB, ...draftedNBA];
  const availablePlayers = players.filter(player => 
    !allDraftedPlayers.find(drafted => drafted.id === player.id)
  );

  // Create audio warning sound
  const createWarningSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  // Create success sound for player selection
  const createSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (frequency: number, startTime: number, duration: number, volume: number = 0.2) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
        
        oscillator.start(audioContext.currentTime + startTime);
        oscillator.stop(audioContext.currentTime + startTime + duration);
      };
      
      playTone(523.25, 0, 0.15, 0.15);
      playTone(659.25, 0.1, 0.25, 0.12);
      
    } catch (error) {
      console.warn('Could not play success sound:', error);
    }
  };

  // Timer effect DISABLED to prevent re-rendering
  // useEffect(() => {
  //   console.log('Timer useEffect triggered:', { isDrafting, isPaused });
  //   if (isDrafting && !isPaused) {
  //     const startTime = Date.now();
  //     timerStartRef.current = startTime;
      
  //     // Set warning timer for 5 seconds remaining (2 seconds after start) - TESTING: reduced timer
  //     if (!hasWarned) {
  //       warningTimerRef.current = setTimeout(() => {
  //         try {
  //           createWarningSound();
  //           setHasWarned(true);
  //         } catch (error) {
  //           console.warn('Could not play warning sound:', error);
  //         }
  //       }, 2000); // TESTING: 5 - 3 = 2 seconds for warning
  //     }
      
  //     // Set timeout timer for 0 seconds remaining (5 seconds after start) - TESTING: reduced timer
  //     console.log('Setting up 5-second timeout timer...');
  //     timerRef.current = setTimeout(() => {
  //       console.log('=== TIMER EXPIRED IN APP.TSX ===');
  //       console.log('isDrafting:', isDrafting);
  //       console.log('isPaused:', isPaused);
  //       console.log('Current time:', new Date().toLocaleTimeString());
  //       setTimeRemaining(0);
  //       handleTimeExpired();
  //     }, 5000); // TESTING: reduced from 15000 to 5000
  //     console.log('Timer set with ID:', timerRef.current);
  //   }

  //   return () => {
  //     if (timerRef.current) {
  //       clearTimeout(timerRef.current);
  //     }
  //     if (warningTimerRef.current) {
  //       clearTimeout(warningTimerRef.current);
  //     }
  //   };
  // }, [isDrafting, isPaused]); // Only timer state dependencies

  // Start draft timer
  const startDraft = () => {
    setIsDrafting(true);
    setIsPaused(false);
    setTimeRemaining(5); // TESTING: reduced from 15 to 5 seconds
    setHasWarned(false);
    setTimeoutMessage('');
    timerStartRef.current = Date.now();
  };

  // Pause/Resume timer
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  // Reset timer
  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    setTimeRemaining(15);
    setHasWarned(false);
    setIsDrafting(false); // Stop drafting to prevent infinite loop
    setIsPaused(false);
    timerStartRef.current = null;
  };

  // Function to get needed positions for smart auto-drafting
  const getNeededPositions = () => {
    const neededPositions: string[] = [];
    
    // Only return needed positions if we haven't hit roster limits
    const maxNFL = 7 + 5; // 7 starters + 5 bench
    const maxMLB = 9 + 5; // 9 starters + 5 bench  
    const maxNBA = 5 + 3; // 5 starters + 3 bench
    
    // MLB roster positions (only if under limit)
    if (draftedMLB.length < maxMLB) {
      const mlbRosterPositions = ['SP', 'CL', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF'];
      const mlbPositionsCount: {[key: string]: number} = {};
      
      // Count current MLB players by position
      draftedMLB.forEach(player => {
        const pos = player.position === 'CP' ? 'CL' : player.position; // Map CP to CL
        mlbPositionsCount[pos] = (mlbPositionsCount[pos] || 0) + 1;
      });
      
      // Add missing MLB positions
      mlbRosterPositions.forEach(pos => {
        if (!mlbPositionsCount[pos]) {
          if (pos === 'CL') {
            neededPositions.push('CP'); // We need CP players for CL positions
          } else {
            neededPositions.push(pos);
          }
        }
      });
    }

    // NFL roster positions (only if under limit)
    if (draftedNFL.length < maxNFL) {
      const nflPositionsCount: {[key: string]: number} = {};
      
      // Count current NFL players by position
      draftedNFL.forEach(player => {
        nflPositionsCount[player.position] = (nflPositionsCount[player.position] || 0) + 1;
      });
      
      // Add missing NFL positions (prioritize single positions, then multiples)
      if (!nflPositionsCount['QB']) neededPositions.push('QB');
      if (!nflPositionsCount['TE']) neededPositions.push('TE');
      if ((nflPositionsCount['RB'] || 0) < 2) neededPositions.push('RB');
      if ((nflPositionsCount['WR'] || 0) < 3) neededPositions.push('WR');
    }

    // NBA roster positions (only if under limit)
    if (draftedNBA.length < maxNBA) {
      const nbaRosterPositions = ['PG', 'SG', 'SF', 'PF', 'C'];
      const nbaPositionsCount: {[key: string]: number} = {};
      
      // Count current NBA players by position
      draftedNBA.forEach(player => {
        nbaPositionsCount[player.position] = (nbaPositionsCount[player.position] || 0) + 1;
      });
      
      // Add missing NBA positions
      nbaRosterPositions.forEach(pos => {
        if (!nbaPositionsCount[pos]) {
          neededPositions.push(pos);
        }
      });
    }

    return neededPositions;
  };

  // WebSocket-aware auto-draft handler
  const handleWebSocketAutoDraft = useCallback(async (userId: number, leagueId: number): Promise<void> => {
    console.log('=== WEBSOCKET AUTO-DRAFT TRIGGERED ===');
    console.log('User ID:', userId, 'League ID:', leagueId);
    
    try {
      const neededPositions = getNeededPositions();
      let playerToSelect;

      if (neededPositions.length > 0) {
        const playersForNeededPositions = availablePlayers.filter(player =>
          neededPositions.includes(player.position)
        );
        
        if (playersForNeededPositions.length > 0) {
          const nonRBWRPlayers = playersForNeededPositions.filter(player => 
            !['RB', 'WR'].includes(player.position)
          );
          
          if (nonRBWRPlayers.length > 0) {
            playerToSelect = nonRBWRPlayers[Math.floor(Math.random() * nonRBWRPlayers.length)];
          } else {
            playerToSelect = playersForNeededPositions[Math.floor(Math.random() * playersForNeededPositions.length)];
          }
        }
      }

      if (!playerToSelect && availablePlayers.length > 0) {
        playerToSelect = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
      }

      if (playerToSelect && signalRService.isConnected()) {
        console.log('🎯 Auto-drafting via WebSocket:', {
          player: playerToSelect.name,
          position: playerToSelect.position,
          team: playerToSelect.team,
          league: playerToSelect.league,
          playerId: playerToSelect.id
        });
        await signalRService.makeDraftPick(
          leagueId,
          playerToSelect.id,
          playerToSelect.name,
          playerToSelect.position,
          playerToSelect.team,
          playerToSelect.league,
          true  // isAutoDraft = true
        );
        console.log('✅ WebSocket auto-draft call completed, awaiting PlayerDrafted event for toast notification');
      } else {
        console.warn('❌ Auto-draft failed: playerToSelect or SignalR not available', {
          playerToSelect: !!playerToSelect,
          signalRConnected: signalRService.isConnected()
        });
      }
    } catch (error) {
      console.error('WebSocket auto-draft failed:', error);
    }
  }, [availablePlayers, getNeededPositions]);

  // WebSocket handler - re-enabled for auto-draft functionality
  useEffect(() => {
    (window as any).webSocketAutoDraftHandler = handleWebSocketAutoDraft;
    return () => {
      delete (window as any).webSocketAutoDraftHandler;
    };
  }, [handleWebSocketAutoDraft]);

  // Handle time expired with smart auto-drafting
  const handleTimeExpired = () => {
    console.log('=== HANDLE TIME EXPIRED CALLED ===');
    console.log('Current isDrafting state:', isDrafting);
    console.log('Current isPaused state:', isPaused);
    console.log('Current path:', window.location.pathname);
    console.log('Window object keys related to draft:', Object.keys(window).filter(key => key.includes('draft')));
    
    // Check if Draft component has provided a timeout handler (for backend integration)
    const draftTimeoutHandler = (window as any).draftTimeoutHandler;
    console.log('Draft timeout handler exists:', !!draftTimeoutHandler);
    console.log('Draft timeout handler type:', typeof draftTimeoutHandler);
    console.log('Draft timeout handler value:', draftTimeoutHandler);
    
    if (draftTimeoutHandler && typeof draftTimeoutHandler === 'function') {
      // Use the Draft component's backend-powered timeout handler
      console.log('App.tsx: Calling draft timeout handler');
      try {
        draftTimeoutHandler();
        console.log('App.tsx: Draft timeout handler called successfully');
      } catch (error) {
        console.error('App.tsx: Error calling draft timeout handler:', error);
      }
      // The Draft component will handle timer reset after successful pick
      return;
    }
    
    console.log('App.tsx: No draft timeout handler found, using fallback logic');

    // Fallback to old local-state logic (for non-draft pages or if backend fails)
    const neededPositions = getNeededPositions();
    let playerToSelect;

    if (neededPositions.length > 0) {
      // Try to find a player for the most needed positions
      const playersForNeededPositions = availablePlayers.filter(player =>
        neededPositions.includes(player.position)
      );
      
      if (playersForNeededPositions.length > 0) {
        // Prioritize positions that aren't RB or WR (unless they're the only options)
        const nonRBWRPlayers = playersForNeededPositions.filter(player => 
          !['RB', 'WR'].includes(player.position)
        );
        
        if (nonRBWRPlayers.length > 0) {
          playerToSelect = nonRBWRPlayers[Math.floor(Math.random() * nonRBWRPlayers.length)];
        } else {
          playerToSelect = playersForNeededPositions[Math.floor(Math.random() * playersForNeededPositions.length)];
        }
      }
    }

    // Fallback to random player if no specific need identified
    if (!playerToSelect && availablePlayers.length > 0) {
      playerToSelect = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
    }

    if (playerToSelect) {
      // Note: Toast will be handled by Draft component via WebSocket events
      draftPlayer(playerToSelect, true);
    }
    // Stop drafting to prevent timer restart loop
    setIsDrafting(false);
    setIsPaused(false);
    setTimeRemaining(15);
    setHasWarned(false);
    
    setTimeout(() => setTimeoutMessage(''), 5000);
  };

  const draftPlayer = (player: Player, isAutoDraft: boolean = false) => {
    console.log('⚽ draftPlayer called:', { player: player.name, isAutoDraft });
    
    switch (player.league) {
      case 'NFL':
        setDraftedNFL(prev => [...prev, player]);
        break;
      case 'MLB':
        setDraftedMLB(prev => [...prev, player]);
        break;
      case 'NBA':
        setDraftedNBA(prev => [...prev, player]);
        break;
    }
    
    // Note: Toast notifications are now handled by the Draft component to avoid duplicates
    console.log('⚽ Player drafted, skipping toast (handled by Draft component)');
    
    createSuccessSound();
    
    if (isDrafting) {
      resetTimer();
    }
  };

  // Clear all rosters
  const clearRosters = () => {
    setDraftedNFL([]);
    setDraftedMLB([]);
    setDraftedNBA([]);
  };

  // Check if auto draft is complete
  const isAutoDraftComplete = () => {
    const maxNFL = 7 + 5; // 7 starters + 5 bench
    const maxMLB = 9 + 5; // 9 starters + 5 bench  
    const maxNBA = 5 + 3; // 5 starters + 3 bench

    return draftedNFL.length >= maxNFL && 
           draftedMLB.length >= maxMLB && 
           draftedNBA.length >= maxNBA;
  };

  // Auto draft logic
  const performAutoDraft = () => {
    if (isAutoDraftComplete()) {
      setIsAutoDrafting(false);
      setTimeoutMessage('Auto Draft Complete! All rosters filled.');
      setTimeout(() => setTimeoutMessage(''), 5000);
      return;
    }

    const neededPositions = getNeededPositions();
    let playerToSelect;

    if (neededPositions.length > 0) {
      // Try to find a player for needed positions (prioritize filling starting lineup)
      const playersForNeededPositions = availablePlayers.filter(player =>
        neededPositions.includes(player.position)
      );
      
      if (playersForNeededPositions.length > 0) {
        const nonRBWRPlayers = playersForNeededPositions.filter(player => 
          !['RB', 'WR'].includes(player.position)
        );
        
        if (nonRBWRPlayers.length > 0) {
          playerToSelect = nonRBWRPlayers[Math.floor(Math.random() * nonRBWRPlayers.length)];
        } else {
          playerToSelect = playersForNeededPositions[Math.floor(Math.random() * playersForNeededPositions.length)];
        }
      }
    } else {
      // Starting lineups are complete, fill bench spots
      const eligibleForBench = availablePlayers.filter(player => {
        const maxPlayers = player.league === 'NBA' ? 8 : 14; // NBA: 5+3, NFL/MLB: 7+5 or 9+5
        const currentCount = player.league === 'NBA' ? draftedNBA.length :
                           player.league === 'NFL' ? draftedNFL.length : draftedMLB.length;
        
        return currentCount < maxPlayers;
      });

      if (eligibleForBench.length > 0) {
        playerToSelect = eligibleForBench[Math.floor(Math.random() * eligibleForBench.length)];
      }
    }

    if (playerToSelect) {
      // Note: Toast will be handled by Draft component via WebSocket events
      draftPlayer(playerToSelect, true);
    }
  };

  // Auto draft effect disabled to prevent re-rendering
  // useEffect(() => {
  //   if (isAutoDrafting && !isAutoDraftComplete()) {
  //     autoDraftTimerRef.current = setTimeout(() => {
  //       performAutoDraft();
  //     }, 3000);
  //   }

  //   return () => {
  //     if (autoDraftTimerRef.current) {
  //       clearTimeout(autoDraftTimerRef.current);
  //     }
  //   };
  // }, [isAutoDrafting, draftedNFL, draftedMLB, draftedNBA, isAutoDraftComplete, performAutoDraft]);

  // Start/Stop Auto Draft
  const toggleAutoDraft = () => {
    if (isAutoDrafting) {
      setIsAutoDrafting(false);
      if (autoDraftTimerRef.current) {
        clearTimeout(autoDraftTimerRef.current);
      }
      setTimeoutMessage('Auto Draft stopped');
    } else {
      setIsAutoDrafting(true);
      performAutoDraft(); // Start immediately
      setTimeoutMessage('Auto Draft started');
    }
    setTimeout(() => setTimeoutMessage(''), 3000);
  };

  // Authentication functions
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiRequest('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // User successfully logged in - they can navigate manually
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    navigate('/');
  };

  const registerAndLogin = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // User registered and logged in - they can navigate manually
  };

  const updateLeagueName = (newName: string) => {
    if (user?.league) {
      const updatedUser = {
        ...user,
        league: {
          ...user.league,
          name: newName
        }
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  // Check for stored user on app start
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setIsAuthenticated(true);
      
      // Users with leagues can stay on homepage to see league dashboard
    }
  }, [navigate]);


  return (
    <div className="App">
      <Navigation
        isAuthenticated={isAuthenticated}
        user={user}
        login={login}
        logout={logout}
        onUserUpdate={registerAndLogin}
      />
      {isAuthenticated && (
        <>
          <GamesAccordion onBetPlaced={() => {
            // Force refresh of BetSlip when a bet is placed
            window.dispatchEvent(new CustomEvent('betPlaced'));
          }} />
          <BetSlip />
        </>
      )}
        <Routes>
          <Route path="/" element={
            <Home 
              registerAndLogin={registerAndLogin} 
              isAuthenticated={isAuthenticated}
              user={user}
              isDrafting={isDrafting}
              isPaused={isPaused}
              timeRemaining={timeRemaining}
              timeoutMessage={timeoutMessage}
              togglePause={togglePause}
              timerStartTime={timerStartRef.current}
            />
          } />
          <Route 
            path="/draft" 
            element={
              isAuthenticated && user?.league ? (
                <Draft 
                  draftPlayer={draftPlayer}
                  addDraftToast={addDraftToast}
                  isDrafting={isDrafting}
                  isPaused={isPaused}
                  timeRemaining={timeRemaining}
                  timeoutMessage={timeoutMessage}
                  startDraft={startDraft}
                  togglePause={togglePause}
                  user={user}
                  clearRosters={clearRosters}
                  onTimeExpired={handleTimeExpired}
                  timerStartTime={timerStartRef.current}
                />
              ) : !isAuthenticated ? (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please log in to access the draft.</div>
              ) : (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please join or create a league to access the draft.</div>
              )
            } 
          />
          <Route 
            path="/my-team" 
            element={
              isAuthenticated && user?.league ? (
                <MyTeam 
                  isDrafting={isDrafting}
                  isPaused={isPaused}
                  timeRemaining={timeRemaining}
                  timeoutMessage={timeoutMessage}
                  togglePause={togglePause}
                  user={user}
                  timerStartTime={timerStartRef.current}
                />
              ) : !isAuthenticated ? (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please log in to view your team.</div>
              ) : (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please join or create a league to view your team.</div>
              )
            } 
          />
          <Route 
            path="/free-agents" 
            element={
              isAuthenticated && user?.league ? (
                <FreeAgentsComponent user={user} />
              ) : !isAuthenticated ? (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please log in to view free agents.</div>
              ) : (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please join or create a league to view free agents.</div>
              )
            } 
          />
          <Route 
            path="/standings" 
            element={
              isAuthenticated && user?.league ? (
                <Standings user={user} />
              ) : !isAuthenticated ? (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please log in to view standings.</div>
              ) : (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please join or create a league to view standings.</div>
              )
            } 
          />
          <Route 
            path="/schedule" 
            element={
              isAuthenticated && user?.league ? (
                <Schedule user={user} />
              ) : !isAuthenticated ? (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please log in to view schedule.</div>
              ) : (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please join or create a league to view schedule.</div>
              )
            } 
          />
          <Route 
            path="/chat" 
            element={
              isAuthenticated && user?.league ? (
                <Chat user={user} />
              ) : !isAuthenticated ? (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please log in to view chat.</div>
              ) : (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please join or create a league to view chat.</div>
              )
            } 
          />
          <Route 
            path="/team/:userId" 
            element={
              isAuthenticated && user?.league ? (
                <TeamPage 
                  currentUser={user}
                  isDrafting={isDrafting}
                  isPaused={isPaused}
                  timeRemaining={timeRemaining}
                  timeoutMessage={timeoutMessage}
                  togglePause={togglePause}
                  timerStartTime={timerStartRef.current}
                />
              ) : !isAuthenticated ? (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please log in to view teams.</div>
              ) : (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please join or create a league to view teams.</div>
              )
            } 
          />
          <Route 
            path="/league-settings" 
            element={
              isAuthenticated && user?.league ? (
                <LeagueSettings user={user} onLeagueNameUpdate={updateLeagueName} />
              ) : !isAuthenticated ? (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please log in to access league settings.</div>
              ) : (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please join or create a league to access league settings.</div>
              )
            } 
          />
          <Route 
            path="/admin-dashboard" 
            element={
              isAuthenticated && user ? (
                <AdminDashboard user={user} />
              ) : (
                <div style={{padding: '50px', textAlign: 'center', color: 'white'}}>Please log in to access the admin dashboard.</div>
              )
            } 
          />
        </Routes>
      
    </div>
  );
};

// Main App component that wraps AppContent in Router and DraftProvider
function App() {
  return (
    <Router>
      <DraftProvider>
        <AppContent />
      </DraftProvider>
    </Router>
  );
}

export default App;