import React, { useState, useCallback, useMemo } from 'react';
import { Player } from '../types/Player';
import { useAdvancedFiltering, FilterCriteria, PlayerWithMetrics } from '../hooks/useAdvancedFiltering';
import './AdvancedPlayerSearch.css';

interface AdvancedPlayerSearchProps {
  players: Player[];
  onPlayersFiltered: (players: PlayerWithMetrics[]) => void;
  className?: string;
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({ 
  title, 
  children, 
  isCollapsible = true,
  defaultExpanded = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  return (
    <div className="filter-section">
      <div 
        className="filter-section__header" 
        onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
      >
        <h4>{title}</h4>
        {isCollapsible && (
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        )}
      </div>
      {(!isCollapsible || isExpanded) && (
        <div className="filter-section__content">
          {children}
        </div>
      )}
    </div>
  );
};

const RangeSlider: React.FC<{
  label: string;
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
}> = ({ label, min, max, value, onChange, step = 1 }) => (
  <div className="range-slider">
    <label className="range-slider__label">{label}</label>
    <div className="range-slider__inputs">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onChange([Number(e.target.value), value[1]])}
        className="range-input"
      />
      <span className="range-separator">to</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value[1]}
        onChange={(e) => onChange([value[0], Number(e.target.value)])}
        className="range-input"
      />
    </div>
  </div>
);

const AdvancedPlayerSearch: React.FC<AdvancedPlayerSearchProps> = ({
  players,
  onPlayersFiltered,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const filtering = useAdvancedFiltering(players);
  const criteria = filtering.getFilterCriteria();
  
  // Available options for dropdowns
  const availablePositions = useMemo(() => {
    const positions = new Set(players.map(p => p.position));
    return Array.from(positions).sort();
  }, [players]);
  
  const availableTeams = useMemo(() => {
    const teams = new Set(players.map(p => p.team));
    return Array.from(teams).sort();
  }, [players]);
  
  // Apply filters and search
  const filteredPlayers = useMemo(() => {
    let filtered = filtering.getFilteredPlayers();
    
    // Apply search query
    if (searchQuery.trim()) {
      filtered = filtering.searchPlayers(searchQuery, filtered);
    }
    
    // Apply sorting
    filtered = filtering.sortPlayers(filtered, sortBy, sortDirection);
    
    return filtered;
  }, [filtering, searchQuery, sortBy, sortDirection]);
  
  // Update parent component when filters change
  React.useEffect(() => {
    onPlayersFiltered(filteredPlayers);
  }, [filteredPlayers, onPlayersFiltered]);
  
  const handleFilterChange = useCallback((updates: Partial<FilterCriteria>) => {
    filtering.setFilterCriteria(updates);
  }, [filtering]);
  
  const handlePositionToggle = useCallback((position: string) => {
    const newPositions = criteria.positions.includes(position)
      ? criteria.positions.filter(p => p !== position)
      : [...criteria.positions, position];
    
    handleFilterChange({ positions: newPositions });
  }, [criteria.positions, handleFilterChange]);
  
  const handleTeamToggle = useCallback((team: string) => {
    const newTeams = criteria.teams.includes(team)
      ? criteria.teams.filter(t => t !== team)
      : [...criteria.teams, team];
    
    handleFilterChange({ teams: newTeams });
  }, [criteria.teams, handleFilterChange]);
  
  const handleClearFilters = useCallback(() => {
    filtering.clearFilters();
    setSearchQuery('');
    setSortBy('value');
    setSortDirection('desc');
  }, [filtering]);
  
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (criteria.positions.length > 0) count++;
    if (criteria.teams.length > 0) count++;
    if (criteria.leagues !== 'all') count++;
    if (criteria.minValue !== undefined) count++;
    if (criteria.maxValue !== undefined) count++;
    if (criteria.ageRange) count++;
    if (criteria.injuryRisk && criteria.injuryRisk !== 'any') count++;
    if (criteria.consistency && criteria.consistency !== 'any') count++;
    if (criteria.upside && criteria.upside !== 'any') count++;
    if (criteria.tags && criteria.tags.length > 0) count++;
    return count;
  }, [criteria]);
  
  return (
    <div className={`advanced-player-search ${className}`}>
      <div className="search-header">
        <h3>Advanced Player Search & Filters</h3>
        <div className="search-controls">
          <div className="active-filters">
            {activeFilterCount > 0 && (
              <span className="filter-count">{activeFilterCount} active filters</span>
            )}
            <button 
              className="clear-filters-btn"
              onClick={handleClearFilters}
              disabled={activeFilterCount === 0}
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search players by name, position, team, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <span className="search-results-count">
          {filteredPlayers.length} players found
        </span>
      </div>
      
      {/* Sort Controls */}
      <div className="sort-controls">
        <div className="sort-field">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="value">Value</option>
            <option value="name">Name</option>
            <option value="position">Position</option>
            <option value="team">Team</option>
            <option value="adp">ADP</option>
            <option value="projectedPoints">Projected Points</option>
            <option value="upside">Upside</option>
            <option value="consistency">Consistency</option>
            <option value="age">Age</option>
          </select>
        </div>
        <div className="sort-direction">
          <button 
            className={sortDirection === 'desc' ? 'active' : ''}
            onClick={() => setSortDirection('desc')}
          >
            ↓ High to Low
          </button>
          <button 
            className={sortDirection === 'asc' ? 'active' : ''}
            onClick={() => setSortDirection('asc')}
          >
            ↑ Low to High
          </button>
        </div>
      </div>
      
      <div className="filters-grid">
        {/* Basic Filters */}
        <FilterSection title="Basic Filters" defaultExpanded={true}>
          <div className="league-selector">
            <label>League:</label>
            <select 
              value={criteria.leagues}
              onChange={(e) => handleFilterChange({ leagues: e.target.value as any })}
            >
              <option value="all">All Leagues</option>
              <option value="NFL">NFL</option>
              <option value="MLB">MLB</option>
              <option value="NBA">NBA</option>
            </select>
          </div>
          
          <div className="position-filters">
            <label>Positions:</label>
            <div className="position-tags">
              {availablePositions.map(position => (
                <button
                  key={position}
                  className={`position-tag ${criteria.positions.includes(position) ? 'active' : ''}`}
                  onClick={() => handlePositionToggle(position)}
                >
                  {position}
                </button>
              ))}
            </div>
          </div>
          
          <div className="team-filters">
            <label>Teams:</label>
            <div className="team-select-container">
              <select
                multiple
                value={criteria.teams}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange({ teams: values });
                }}
                size={6}
                className="team-multiselect"
              >
                {availableTeams.map(team => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FilterSection>
        
        {/* Value Filters */}
        <FilterSection title="Value & Rankings">
          <RangeSlider
            label="Player Value"
            min={0}
            max={100}
            value={[criteria.minValue || 0, criteria.maxValue || 100]}
            onChange={([min, max]) => handleFilterChange({ minValue: min, maxValue: max })}
          />
          
          <div className="tier-selector">
            <label>Tiers:</label>
            <div className="tier-checkboxes">
              {[1, 2, 3, 4, 5].map(tier => (
                <label key={tier} className="tier-checkbox">
                  <input
                    type="checkbox"
                    checked={criteria.tier?.includes(tier) || false}
                    onChange={(e) => {
                      const currentTiers = criteria.tier || [];
                      const newTiers = e.target.checked
                        ? [...currentTiers, tier]
                        : currentTiers.filter(t => t !== tier);
                      handleFilterChange({ tier: newTiers });
                    }}
                  />
                  Tier {tier}
                </label>
              ))}
            </div>
          </div>
        </FilterSection>
        
        {/* Player Attributes */}
        <FilterSection title="Player Attributes">
          <RangeSlider
            label="Age Range"
            min={20}
            max={40}
            value={[criteria.ageRange?.min || 20, criteria.ageRange?.max || 40]}
            onChange={([min, max]) => handleFilterChange({ ageRange: { min, max } })}
          />
          
          <div className="attribute-selectors">
            <div className="attribute-selector">
              <label>Injury Risk:</label>
              <select
                value={criteria.injuryRisk || 'any'}
                onChange={(e) => handleFilterChange({ injuryRisk: e.target.value as any })}
              >
                <option value="any">Any</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>
            
            <div className="attribute-selector">
              <label>Consistency:</label>
              <select
                value={criteria.consistency || 'any'}
                onChange={(e) => handleFilterChange({ consistency: e.target.value as any })}
              >
                <option value="any">Any</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div className="attribute-selector">
              <label>Upside:</label>
              <select
                value={criteria.upside || 'any'}
                onChange={(e) => handleFilterChange({ upside: e.target.value as any })}
              >
                <option value="any">Any</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </FilterSection>
        
        {/* Special Categories */}
        <FilterSection title="Special Categories">
          <div className="special-filters">
            <div className="special-filter-row">
              <button 
                className="special-filter-btn"
                onClick={() => onPlayersFiltered(filtering.getSleeperPicks(20))}
              >
                🌟 Sleeper Picks
              </button>
              <button 
                className="special-filter-btn"
                onClick={() => onPlayersFiltered(filtering.getBreakoutCandidates(20))}
              >
                📈 Breakout Candidates
              </button>
            </div>
            <div className="special-filter-row">
              <button 
                className="special-filter-btn"
                onClick={() => onPlayersFiltered(filtering.getBustCandidates(20))}
              >
                ⚠️ Bust Risks
              </button>
              <button 
                className="special-filter-btn"
                onClick={() => onPlayersFiltered(filtering.getValuePicks(5, 20))}
              >
                💎 Value Picks (R5)
              </button>
            </div>
          </div>
          
          <div className="watchlist-section">
            <button
              className="watchlist-btn"
              onClick={() => onPlayersFiltered(filtering.getWatchlist())}
            >
              ⭐ My Watchlist ({filtering.getWatchlist().length})
            </button>
          </div>
        </FilterSection>
      </div>
    </div>
  );
};

export default AdvancedPlayerSearch;