import { useState, useCallback, useMemo } from 'react';
import { Player } from '../types/Player';

export interface FilterCriteria {
  // Basic filters
  positions: string[];
  teams: string[];
  leagues: 'NFL' | 'MLB' | 'NBA' | 'all';
  
  // Advanced filters
  minValue?: number;
  maxValue?: number;
  tier?: number[];
  ageRange?: { min: number; max: number };
  injuryRisk?: 'low' | 'medium' | 'high' | 'any';
  consistency?: 'low' | 'medium' | 'high' | 'any';
  upside?: 'low' | 'medium' | 'high' | 'any';
  
  // Stat-based filters
  statFilters?: {
    stat: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
  }[];
  
  // Custom filters
  tags?: string[]; // sleeper, breakout, bust, etc.
  customRankings?: boolean; // Use user's custom rankings
}

export interface PlayerWithMetrics extends Player {
  // Enhanced metrics
  value: number;
  tier: number;
  adp: number; // Average Draft Position
  consistency: number; // 0-100
  upside: number; // 0-100
  injuryRisk: number; // 0-100
  age: number;
  tags: string[];
  customRank?: number;
  
  // Advanced stats
  projectedPoints: number;
  floor: number; // Worst case scenario
  ceiling: number; // Best case scenario
  strengthOfSchedule: number; // 0-100
  targetShare?: number; // For relevant positions
  redZoneOpportunities?: number;
  
  // Trend data
  trend: 'up' | 'down' | 'stable';
  momentumScore: number; // Recent performance trend
  newsScore: number; // Recent news impact
}

export interface CustomRanking {
  playerId: string;
  rank: number;
  notes?: string;
  lastUpdated: string;
}

export interface AdvancedFilteringTools {
  // Filtering
  applyFilters: (players: Player[], criteria: FilterCriteria) => PlayerWithMetrics[];
  getFilteredPlayers: () => PlayerWithMetrics[];
  setFilterCriteria: (criteria: Partial<FilterCriteria>) => void;
  getFilterCriteria: () => FilterCriteria;
  clearFilters: () => void;
  
  // Search and sorting
  searchPlayers: (query: string, players?: PlayerWithMetrics[]) => PlayerWithMetrics[];
  sortPlayers: (players: PlayerWithMetrics[], sortBy: string, direction: 'asc' | 'desc') => PlayerWithMetrics[];
  
  // Custom rankings
  setCustomRank: (playerId: string, rank: number, notes?: string) => void;
  getCustomRanking: (playerId: string) => CustomRanking | null;
  exportCustomRankings: () => CustomRanking[];
  importCustomRankings: (rankings: CustomRanking[]) => void;
  
  // Player insights
  getSleeperPicks: (count?: number) => PlayerWithMetrics[];
  getBreakoutCandidates: (count?: number) => PlayerWithMetrics[];
  getBustCandidates: (count?: number) => PlayerWithMetrics[];
  getValuePicks: (round: number, count?: number) => PlayerWithMetrics[];
  
  // Tier management
  getTiers: (position?: string) => { tier: number; players: PlayerWithMetrics[] }[];
  suggestTierBreaks: (position: string) => number[];
  
  // Watchlist
  addToWatchlist: (playerId: string) => void;
  removeFromWatchlist: (playerId: string) => void;
  getWatchlist: () => PlayerWithMetrics[];
  isOnWatchlist: (playerId: string) => boolean;
}

const DEFAULT_FILTER_CRITERIA: FilterCriteria = {
  positions: [],
  teams: [],
  leagues: 'all'
};

// Enhanced player metrics calculation
const calculatePlayerMetrics = (player: Player): PlayerWithMetrics => {
  // Generate realistic-looking metrics (would be calculated from real data)
  const baseValue = Math.random() * 100;
  const tier = Math.ceil(baseValue / 15);
  const adp = Math.random() * 200 + 1;
  const consistency = Math.random() * 100;
  const upside = Math.random() * 100;
  const injuryRisk = Math.random() * 100;
  const age = Math.floor(Math.random() * 15) + 20; // 20-35 years old
  
  // Position-specific projections
  let projectedPoints = 0;
  switch (player.position) {
    case 'QB':
      projectedPoints = Math.random() * 300 + 200; // 200-500 points
      break;
    case 'RB':
    case 'WR':
      projectedPoints = Math.random() * 250 + 150; // 150-400 points
      break;
    case 'TE':
      projectedPoints = Math.random() * 200 + 100; // 100-300 points
      break;
    default:
      projectedPoints = Math.random() * 180 + 120;
  }
  
  const floor = projectedPoints * 0.7;
  const ceiling = projectedPoints * 1.4;
  
  // Generate tags based on metrics
  const tags: string[] = [];
  if (upside > 80 && adp > 100) tags.push('sleeper');
  if (age <= 24 && upside > 70) tags.push('breakout');
  if (consistency < 30) tags.push('bust-risk');
  if (baseValue > 90) tags.push('elite');
  if (injuryRisk > 75) tags.push('injury-prone');
  if (age >= 32) tags.push('veteran');
  
  const trend: 'up' | 'down' | 'stable' = Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down';
  
  return {
    ...player,
    value: baseValue,
    tier,
    adp,
    consistency,
    upside,
    injuryRisk,
    age,
    tags,
    projectedPoints,
    floor,
    ceiling,
    strengthOfSchedule: Math.random() * 100,
    targetShare: ['WR', 'TE'].includes(player.position) ? Math.random() * 30 : undefined,
    redZoneOpportunities: ['RB', 'WR', 'TE'].includes(player.position) ? Math.floor(Math.random() * 20) : undefined,
    trend,
    momentumScore: Math.random() * 100,
    newsScore: Math.random() * 100
  };
};

export const useAdvancedFiltering = (players: Player[]): AdvancedFilteringTools => {
  const [filterCriteria, setFilterCriteriaState] = useState<FilterCriteria>(DEFAULT_FILTER_CRITERIA);
  const [customRankings, setCustomRankings] = useState<Map<string, CustomRanking>>(new Map());
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  
  // Enhance players with metrics
  const playersWithMetrics = useMemo((): PlayerWithMetrics[] => {
    return players.map(player => {
      const enhanced = calculatePlayerMetrics(player);
      const customRank = customRankings.get(player.id);
      if (customRank) {
        enhanced.customRank = customRank.rank;
      }
      return enhanced;
    });
  }, [players, customRankings]);
  
  const applyFilters = useCallback((
    playersToFilter: Player[], 
    criteria: FilterCriteria
  ): PlayerWithMetrics[] => {
    let filtered = playersToFilter.map(player => 
      playersWithMetrics.find(p => p.id === player.id) || calculatePlayerMetrics(player)
    );
    
    // Apply position filter
    if (criteria.positions.length > 0) {
      filtered = filtered.filter(player => criteria.positions.includes(player.position));
    }
    
    // Apply team filter
    if (criteria.teams.length > 0) {
      filtered = filtered.filter(player => criteria.teams.includes(player.team));
    }
    
    // Apply league filter
    if (criteria.leagues !== 'all') {
      filtered = filtered.filter(player => player.league === criteria.leagues);
    }
    
    // Apply value range filter
    if (criteria.minValue !== undefined) {
      filtered = filtered.filter(player => player.value >= criteria.minValue!);
    }
    if (criteria.maxValue !== undefined) {
      filtered = filtered.filter(player => player.value <= criteria.maxValue!);
    }
    
    // Apply tier filter
    if (criteria.tier && criteria.tier.length > 0) {
      filtered = filtered.filter(player => criteria.tier!.includes(player.tier));
    }
    
    // Apply age range filter
    if (criteria.ageRange) {
      filtered = filtered.filter(player => 
        player.age >= criteria.ageRange!.min && player.age <= criteria.ageRange!.max
      );
    }
    
    // Apply risk/upside filters
    if (criteria.injuryRisk && criteria.injuryRisk !== 'any') {
      const thresholds = { low: [0, 33], medium: [34, 66], high: [67, 100] };
      const [min, max] = thresholds[criteria.injuryRisk];
      filtered = filtered.filter(player => player.injuryRisk >= min && player.injuryRisk <= max);
    }
    
    if (criteria.consistency && criteria.consistency !== 'any') {
      const thresholds = { low: [0, 33], medium: [34, 66], high: [67, 100] };
      const [min, max] = thresholds[criteria.consistency];
      filtered = filtered.filter(player => player.consistency >= min && player.consistency <= max);
    }
    
    if (criteria.upside && criteria.upside !== 'any') {
      const thresholds = { low: [0, 33], medium: [34, 66], high: [67, 100] };
      const [min, max] = thresholds[criteria.upside];
      filtered = filtered.filter(player => player.upside >= min && player.upside <= max);
    }
    
    // Apply stat filters
    if (criteria.statFilters) {
      criteria.statFilters.forEach(filter => {
        filtered = filtered.filter(player => {
          const statValue = player.stats?.[filter.stat];
          if (typeof statValue !== 'number') return true;
          
          switch (filter.operator) {
            case 'gt': return statValue > filter.value;
            case 'lt': return statValue < filter.value;
            case 'eq': return statValue === filter.value;
            case 'gte': return statValue >= filter.value;
            case 'lte': return statValue <= filter.value;
            default: return true;
          }
        });
      });
    }
    
    // Apply tag filters
    if (criteria.tags && criteria.tags.length > 0) {
      filtered = filtered.filter(player => 
        criteria.tags!.some(tag => player.tags.includes(tag))
      );
    }
    
    return filtered;
  }, [playersWithMetrics]);
  
  const getFilteredPlayers = useCallback((): PlayerWithMetrics[] => {
    return applyFilters(players, filterCriteria);
  }, [applyFilters, players, filterCriteria]);
  
  const setFilterCriteria = useCallback((criteria: Partial<FilterCriteria>) => {
    setFilterCriteriaState(prev => ({ ...prev, ...criteria }));
  }, []);
  
  const getFilterCriteria = useCallback((): FilterCriteria => {
    return filterCriteria;
  }, [filterCriteria]);
  
  const clearFilters = useCallback(() => {
    setFilterCriteriaState(DEFAULT_FILTER_CRITERIA);
  }, []);
  
  const searchPlayers = useCallback((
    query: string, 
    playersToSearch?: PlayerWithMetrics[]
  ): PlayerWithMetrics[] => {
    const searchIn = playersToSearch || playersWithMetrics;
    const lowerQuery = query.toLowerCase();
    
    return searchIn.filter(player => {
      return (
        player.name.toLowerCase().includes(lowerQuery) ||
        player.position.toLowerCase().includes(lowerQuery) ||
        player.team.toLowerCase().includes(lowerQuery) ||
        player.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    });
  }, [playersWithMetrics]);
  
  const sortPlayers = useCallback((
    playersToSort: PlayerWithMetrics[], 
    sortBy: string, 
    direction: 'asc' | 'desc' = 'desc'
  ): PlayerWithMetrics[] => {
    return [...playersToSort].sort((a, b) => {
      let aValue: any = a[sortBy as keyof PlayerWithMetrics];
      let bValue: any = b[sortBy as keyof PlayerWithMetrics];
      
      // Handle custom rankings
      if (sortBy === 'customRank') {
        aValue = a.customRank || 999;
        bValue = b.customRank || 999;
      }
      
      // Handle stats
      if (sortBy.startsWith('stats.')) {
        const statKey = sortBy.replace('stats.', '');
        aValue = a.stats?.[statKey] || 0;
        bValue = b.stats?.[statKey] || 0;
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, []);
  
  const setCustomRank = useCallback((playerId: string, rank: number, notes?: string) => {
    const ranking: CustomRanking = {
      playerId,
      rank,
      notes,
      lastUpdated: new Date().toISOString()
    };
    
    setCustomRankings(prev => new Map(prev).set(playerId, ranking));
  }, []);
  
  const getCustomRanking = useCallback((playerId: string): CustomRanking | null => {
    return customRankings.get(playerId) || null;
  }, [customRankings]);
  
  const exportCustomRankings = useCallback((): CustomRanking[] => {
    return Array.from(customRankings.values());
  }, [customRankings]);
  
  const importCustomRankings = useCallback((rankings: CustomRanking[]) => {
    const newRankings = new Map<string, CustomRanking>();
    rankings.forEach(ranking => {
      newRankings.set(ranking.playerId, ranking);
    });
    setCustomRankings(newRankings);
  }, []);
  
  const getSleeperPicks = useCallback((count: number = 10): PlayerWithMetrics[] => {
    return playersWithMetrics
      .filter(player => player.tags.includes('sleeper'))
      .sort((a, b) => b.upside - a.upside)
      .slice(0, count);
  }, [playersWithMetrics]);
  
  const getBreakoutCandidates = useCallback((count: number = 10): PlayerWithMetrics[] => {
    return playersWithMetrics
      .filter(player => player.tags.includes('breakout'))
      .sort((a, b) => (b.upside * b.momentumScore) - (a.upside * a.momentumScore))
      .slice(0, count);
  }, [playersWithMetrics]);
  
  const getBustCandidates = useCallback((count: number = 10): PlayerWithMetrics[] => {
    return playersWithMetrics
      .filter(player => player.tags.includes('bust-risk'))
      .sort((a, b) => (a.consistency + a.injuryRisk) - (b.consistency + b.injuryRisk))
      .slice(0, count);
  }, [playersWithMetrics]);
  
  const getValuePicks = useCallback((round: number, count: number = 10): PlayerWithMetrics[] => {
    const roundStart = (round - 1) * 12 + 1; // Assuming 12-team league
    const roundEnd = round * 12;
    
    return playersWithMetrics
      .filter(player => player.adp >= roundStart && player.adp <= roundEnd)
      .sort((a, b) => b.value - a.value)
      .slice(0, count);
  }, [playersWithMetrics]);
  
  const getTiers = useCallback((position?: string): { tier: number; players: PlayerWithMetrics[] }[] => {
    const filtered = position 
      ? playersWithMetrics.filter(p => p.position === position)
      : playersWithMetrics;
    
    const tierMap = new Map<number, PlayerWithMetrics[]>();
    
    filtered.forEach(player => {
      const tierPlayers = tierMap.get(player.tier) || [];
      tierPlayers.push(player);
      tierMap.set(player.tier, tierPlayers);
    });
    
    return Array.from(tierMap.entries())
      .map(([tier, tierPlayers]) => ({ tier, players: tierPlayers }))
      .sort((a, b) => a.tier - b.tier);
  }, [playersWithMetrics]);
  
  const suggestTierBreaks = useCallback((position: string): number[] => {
    const positionPlayers = playersWithMetrics
      .filter(p => p.position === position)
      .sort((a, b) => b.value - a.value);
    
    const breaks: number[] = [];
    
    for (let i = 1; i < positionPlayers.length; i++) {
      const valueDrop = positionPlayers[i-1].value - positionPlayers[i].value;
      if (valueDrop > 10) { // Significant value drop
        breaks.push(i);
      }
    }
    
    return breaks;
  }, [playersWithMetrics]);
  
  const addToWatchlist = useCallback((playerId: string) => {
    setWatchlist(prev => new Set(prev).add(playerId));
  }, []);
  
  const removeFromWatchlist = useCallback((playerId: string) => {
    setWatchlist(prev => {
      const newSet = new Set(prev);
      newSet.delete(playerId);
      return newSet;
    });
  }, []);
  
  const getWatchlist = useCallback((): PlayerWithMetrics[] => {
    return playersWithMetrics.filter(player => watchlist.has(player.id));
  }, [playersWithMetrics, watchlist]);
  
  const isOnWatchlist = useCallback((playerId: string): boolean => {
    return watchlist.has(playerId);
  }, [watchlist]);
  
  return {
    applyFilters,
    getFilteredPlayers,
    setFilterCriteria,
    getFilterCriteria,
    clearFilters,
    searchPlayers,
    sortPlayers,
    setCustomRank,
    getCustomRanking,
    exportCustomRankings,
    importCustomRankings,
    getSleeperPicks,
    getBreakoutCandidates,
    getBustCandidates,
    getValuePicks,
    getTiers,
    suggestTierBreaks,
    addToWatchlist,
    removeFromWatchlist,
    getWatchlist,
    isOnWatchlist
  };
};