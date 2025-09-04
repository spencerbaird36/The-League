import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Player } from '../types/Player';
import { apiRequest } from '../config/api';
import Pagination from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import './FreeAgents.css';

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

interface FreeAgentsNewProps {
  user: User | null;
}

function FreeAgentsNew({ user }: FreeAgentsNewProps) {
  // Filter states
  const [selectedLeague, setSelectedLeague] = useState<'ALL' | 'NFL' | 'MLB' | 'NBA'>('ALL');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // UI states
  const [pickupMessage, setPickupMessage] = useState<string>('');
  const [localPickedUpPlayers, setLocalPickedUpPlayers] = useState<Set<string>>(new Set());
  
  // Backend data states
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDraftCompleted, setIsDraftCompleted] = useState<boolean>(false);

  // Fetch draft status and available players from backend
  useEffect(() => {
    const fetchDataForFreeAgents = async () => {
      if (!user?.league?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch draft status first
        console.log('Fetching draft status for league:', user.league.id);
        const draftStatusResponse = await apiRequest(`/api/draft/league/${user.league.id}`);
        
        if (draftStatusResponse.ok) {
          const draftData = await draftStatusResponse.json();
          console.log('Draft status received:', draftData);
          setIsDraftCompleted(draftData.IsCompleted || false);
        }
        
        // Fetch available players
        console.log('Fetching available players for league:', user.league.id);
        const playersResponse = await apiRequest(`/api/draft/league/${user.league.id}/available-players`);
        
        if (playersResponse.ok) {
          const responseData = await playersResponse.json();
          console.log('Available players response received:', responseData);
          
          // Extract the Players array from the response
          const playersArray = responseData.Players || responseData.players || [];
          console.log('Players array:', playersArray);
          
          // Transform backend data to match frontend Player interface
          const transformedPlayers: Player[] = playersArray.map((player: any) => ({
            id: player.id || player.Id,
            name: player.name || player.Name,
            position: player.position || player.Position,
            team: player.team || player.Team,
            league: player.league || player.League,
            stats: player.stats || player.Stats
          }));
          
          console.log('Transformed players:', transformedPlayers);
          setAllPlayers(transformedPlayers);
        } else {
          console.error('Failed to fetch available players:', playersResponse.status, playersResponse.statusText);
          setError('Failed to load available players');
        }
      } catch (err) {
        console.error('Error fetching data for free agents:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataForFreeAgents();
  }, [user?.league?.id]);

  // Get available (undrafted) players - now using backend data
  const availablePlayers = useMemo(() => {
    return allPlayers.filter((player: Player) => 
      !localPickedUpPlayers.has(player.id)
    );
  }, [allPlayers, localPickedUpPlayers]);

  // Apply filters to available players
  const filteredPlayers = useMemo(() => {
    let filtered = availablePlayers;

    // League filter
    if (selectedLeague !== 'ALL') {
      filtered = filtered.filter((player: Player) => player.league === selectedLeague);
    }

    // Position filter
    if (selectedPosition !== 'ALL') {
      filtered = filtered.filter((player: Player) => player.position === selectedPosition);
    }

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((player: Player) => 
        player.name.toLowerCase().includes(search) ||
        player.team.toLowerCase().includes(search) ||
        player.position.toLowerCase().includes(search)
      );
    }

    // Sort by name for consistent ordering
    return filtered.sort((a: Player, b: Player) => a.name.localeCompare(b.name));
  }, [availablePlayers, selectedLeague, selectedPosition, searchTerm]);

  // Pagination for filtered players
  const {
    currentData: paginatedPlayers,
    currentPage,
    totalPages,
    goToPage,
  } = usePagination({
    data: filteredPlayers,
    itemsPerPage: 20,
  });

  // Get unique positions for the selected league
  const availablePositions = useMemo(() => {
    const positions = new Set<string>();
    const playersForPositions = selectedLeague === 'ALL' 
      ? availablePlayers 
      : availablePlayers.filter((p: Player) => p.league === selectedLeague);
    
    playersForPositions.forEach((player: Player) => positions.add(player.position));
    return Array.from(positions).sort();
  }, [availablePlayers, selectedLeague]);

  // Draft completion status is now managed in local state

  // Handle player pickup - simplified version
  const handlePickupPlayer = useCallback(async (player: Player) => {
    if (!user?.league?.id || !user?.id) {
      setPickupMessage('Error: User or league not found');
      return;
    }

    if (!isDraftCompleted) {
      setPickupMessage('Free agent pickups are only available after the draft is completed');
      return;
    }

    setPickupMessage(`Attempting to pick up ${player.name}...`);

    try {
      // For now, just simulate the pickup
      setPickupMessage(`Successfully picked up ${player.name}!`);
      setLocalPickedUpPlayers(prev => {
        const newSet = new Set(prev);
        newSet.add(player.id);
        return newSet;
      });
      setTimeout(() => setPickupMessage(''), 3000);
    } catch (error) {
      console.error('Error picking up player:', error);
      setPickupMessage(`Error picking up ${player.name}. Please try again.`);
    }
  }, [user, isDraftCompleted]);

  // Early return if no user or league
  if (!user?.league) {
    return (
      <div className="free-agents-container">
        <div className="free-agents-error">
          <h2>Free Agents Unavailable</h2>
          <p>You must be logged in and part of a league to view free agents.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="free-agents-container">
        <div className="free-agents-loading">
          <h2>Loading Available Players...</h2>
          <p>Fetching the latest player data from your league.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="free-agents-container">
        <div className="free-agents-error">
          <h2>Error Loading Players</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="free-agents-container">
      <header className="page-header free-agents-header">
        <h1 className="page-title">Free Agents</h1>
        <p className="page-subtitle">Pick up available players to strengthen your team</p>
        
        {!isDraftCompleted && (
          <div className="pickup-message error">
            <strong>Draft in Progress:</strong> Free agent pickups will be available after the draft is completed.
          </div>
        )}
        
        {pickupMessage && (
          <div className={`pickup-message ${pickupMessage.includes('Successfully') ? 'success' : 'error'}`}>
            {pickupMessage}
          </div>
        )}
      </header>

      {/* Filters Section */}
      <section className="filters-section">
        <div className="filters-content">
          {/* League Filter */}
          <div className="league-filter">
            <h4>League:</h4>
            <div className="league-buttons">
              {(['ALL', 'NFL', 'MLB', 'NBA'] as const).map((league) => (
                <button
                  key={league}
                  className={selectedLeague === league ? 'active' : ''}
                  onClick={() => setSelectedLeague(league)}
                >
                  {league === 'ALL' ? 'All' : league}
                </button>
              ))}
            </div>
          </div>

          {/* Position Filter */}
          <div className="position-filter">
            <h4>Position:</h4>
            <div className="position-tabs">
              <button
                className={selectedPosition === 'ALL' ? 'active' : ''}
                onClick={() => setSelectedPosition('ALL')}
              >
                All
              </button>
              {availablePositions.map((position) => (
                <button
                  key={position}
                  className={selectedPosition === position ? 'active' : ''}
                  onClick={() => setSelectedPosition(position)}
                >
                  {position}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="search-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search players by name, team, or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </section>

      {/* Players Section */}
      <section className="players-section">
        <div className="section-header">
          <h2 className="section-title">
            Available Players ({filteredPlayers.length})
          </h2>
        </div>

        <div className="players-container">
          {filteredPlayers.length === 0 ? (
            <div className="no-players">
              <div className="no-players-icon">🚫</div>
              <h3 className="no-players-title">No Players Available</h3>
              <p className="no-players-description">
                {searchTerm.trim() 
                  ? `No players match your search "${searchTerm}"` 
                  : filteredPlayers.length === 0 
                    ? "All players have been drafted!" 
                    : "Try adjusting your filters to see more players."
                }
              </p>
            </div>
          ) : (
            <div className="players-table">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Position</th>
                    <th>Team</th>
                    <th>League</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(paginatedPlayers as Player[]).map((player: Player) => (
                    <tr key={player.id}>
                      <td data-label="Player">
                        <span className="player-name clickable-player-name">
                          {player.name}
                        </span>
                      </td>
                      <td data-label="Position">
                        <span className="position">{player.position}</span>
                      </td>
                      <td data-label="Team">
                        <span className="team">{player.team}</span>
                      </td>
                      <td data-label="League">
                        <span className={`league-badge ${player.league.toLowerCase()}`}>
                          {player.league}
                        </span>
                      </td>
                      <td data-label="Action">
                        <button
                          className={`pickup-btn ${!isDraftCompleted ? 'disabled' : ''}`}
                          onClick={() => handlePickupPlayer(player)}
                          disabled={!isDraftCompleted}
                          title={!isDraftCompleted ? 'Free agency is only available after the draft is completed' : undefined}
                        >
                          {!isDraftCompleted ? 'Draft In Progress' : 'Pick Up'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                />
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default FreeAgentsNew;