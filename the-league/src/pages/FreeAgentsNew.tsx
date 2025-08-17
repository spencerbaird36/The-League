import React, { useState, useMemo, useCallback } from 'react';
import { Player } from '../types/Player';
import { players } from '../data/players';
import Pagination from '../components/Pagination';
import { useDraftOperations } from '../hooks/useDraftOperations';
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
  const draftOperations = useDraftOperations(user);
  
  // Filter states
  const [selectedLeague, setSelectedLeague] = useState<'ALL' | 'NFL' | 'MLB' | 'NBA'>('ALL');
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // UI states
  const [pickupMessage, setPickupMessage] = useState<string>('');
  const [localPickedUpPlayers, setLocalPickedUpPlayers] = useState<Set<string>>(new Set());

  // Get available (undrafted) players - optimized with memoization
  const availablePlayers = useMemo(() => {
    const draftedPlayers = draftOperations?.allDraftedPlayers || [];
    
    return players.filter((player: Player) => 
      !draftedPlayers?.some((drafted: Player) => drafted.id === player.id) &&
      !localPickedUpPlayers.has(player.id)
    );
  }, [draftOperations.allDraftedPlayers, localPickedUpPlayers]);

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
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
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
      : availablePlayers.filter(p => p.league === selectedLeague);
    
    playersForPositions.forEach(player => positions.add(player.position));
    return Array.from(positions).sort();
  }, [availablePlayers, selectedLeague]);

  // Check if draft is completed (free agency is only available after draft completion)
  const isDraftCompleted = draftOperations.draftState?.isCompleted ?? false;

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
        <div className="filters-container">
          {/* Search Bar */}
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search players by name, team, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* League Filter */}
          <div className="league-filter">
            <h4>League</h4>
            <div className="league-buttons">
              <button
                className={selectedLeague === 'ALL' ? 'active' : ''}
                onClick={() => {
                  setSelectedLeague('ALL');
                  setSelectedPosition('ALL'); // Reset position when changing league
                }}
              >
                All Leagues
              </button>
              <button
                className={selectedLeague === 'NFL' ? 'active' : ''}
                onClick={() => {
                  setSelectedLeague('NFL');
                  setSelectedPosition('ALL');
                }}
              >
                NFL
              </button>
              <button
                className={selectedLeague === 'MLB' ? 'active' : ''}
                onClick={() => {
                  setSelectedLeague('MLB');
                  setSelectedPosition('ALL');
                }}
              >
                MLB
              </button>
              <button
                className={selectedLeague === 'NBA' ? 'active' : ''}
                onClick={() => {
                  setSelectedLeague('NBA');
                  setSelectedPosition('ALL');
                }}
              >
                NBA
              </button>
            </div>
          </div>

          {/* Position Filter */}
          <div className="position-filter">
            <h4>Position</h4>
            <div className="position-buttons">
              <button
                className={selectedPosition === 'ALL' ? 'active' : ''}
                onClick={() => setSelectedPosition('ALL')}
              >
                All Positions
              </button>
              {availablePositions.map(position => (
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

      {/* Players Section */}
      <section className="players-section">
        <div className="section-header">
          <h2>
            Available Free Agents ({filteredPlayers.length})
            {totalPages > 1 && (
              <span style={{ fontSize: '0.8em', fontWeight: 400, color: 'var(--text-gray)' }}>
                {' '}• Page {currentPage} of {totalPages}
              </span>
            )}
          </h2>
        </div>

        <div className="players-container">
          {filteredPlayers.length === 0 ? (
            <div className="no-players">
              <div className="no-players-icon">🚫</div>
              <h3>No free agents found</h3>
              <p>
                {searchTerm.trim() 
                  ? `No players match your search "${searchTerm}"`
                  : availablePlayers.length === 0
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
                  {paginatedPlayers.map((player: Player) => (
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
                  className="free-agents-pagination"
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