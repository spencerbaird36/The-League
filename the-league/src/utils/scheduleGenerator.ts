import { SeasonSchedule, WeekSchedule, ScheduleMatchup, LeagueTeam } from '../types/Schedule';

// Round-robin scheduling algorithm
export function generateRoundRobinSchedule(teams: LeagueTeam[]): number[][] {
  const numTeams = teams.length;
  if (numTeams % 2 !== 0) {
    // Add a "bye" team for odd number of teams
    teams = [...teams, { id: -1, name: 'BYE', firstName: '', lastName: '', username: 'bye' }];
  }
  
  const rounds: number[][] = [];
  const totalRounds = teams.length - 1;
  const matchesPerRound = teams.length / 2;
  
  for (let round = 0; round < totalRounds; round++) {
    const roundMatches: number[] = [];
    
    for (let match = 0; match < matchesPerRound; match++) {
      let home: number, away: number;
      
      if (match === 0) {
        // First team stays fixed, second team rotates
        home = 0;
        away = round === 0 ? 1 : (teams.length - round);
      } else {
        // Calculate other matches using rotation
        home = (round + match) % (teams.length - 1);
        if (home >= teams.length - 1 - match) home++;
        
        away = (teams.length - 1 - match + round) % (teams.length - 1);
        if (away >= teams.length - 1 - match) away++;
      }
      
      // Skip games involving bye team
      if (teams[home].id !== -1 && teams[away].id !== -1) {
        roundMatches.push(home, away);
      }
    }
    
    if (roundMatches.length > 0) {
      rounds.push(roundMatches);
    }
  }
  
  return rounds;
}

// Generate NFL schedule (September 1 - December 29, 2025)
export function generateNFLSchedule(teams: LeagueTeam[]): SeasonSchedule {
  const startDate = new Date('2025-09-01'); // Monday, September 1, 2025
  const endDate = new Date('2025-12-29'); // Monday, December 29, 2025
  
  const weeks: WeekSchedule[] = [];
  const roundRobinMatches = generateRoundRobinSchedule([...teams]);
  
  let currentDate = new Date(startDate);
  let weekNumber = 1;
  let matchIndex = 0;
  
  while (currentDate <= endDate && weekNumber <= 17) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
    
    const matchups: ScheduleMatchup[] = [];
    
    // Get matches for this week (cycle through round-robin if needed)
    if (matchIndex < roundRobinMatches.length) {
      const roundMatches = roundRobinMatches[matchIndex];
      
      for (let i = 0; i < roundMatches.length; i += 2) {
        const homeTeamIndex = roundMatches[i];
        const awayTeamIndex = roundMatches[i + 1];
        
        if (homeTeamIndex < teams.length && awayTeamIndex < teams.length) {
          const homeTeam = teams[homeTeamIndex];
          const awayTeam = teams[awayTeamIndex];
          
          // Schedule game for Sunday of this week
          const gameDate = new Date(weekEnd);
          
          matchups.push({
            id: `nfl-${weekNumber}-${homeTeam.id}-${awayTeam.id}`,
            week: weekNumber,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            homeTeamName: `${homeTeam.firstName} ${homeTeam.lastName}`,
            awayTeamName: `${awayTeam.firstName} ${awayTeam.lastName}`,
            date: gameDate.toISOString(),
            league: 'NFL',
            status: 'upcoming'
          });
        }
      }
      
      matchIndex++;
      
      // Reset to beginning if we've used all round-robin rounds
      if (matchIndex >= roundRobinMatches.length) {
        matchIndex = 0;
      }
    }
    
    weeks.push({
      week: weekNumber,
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      matchups
    });
    
    // Move to next week (Monday)
    currentDate.setDate(currentDate.getDate() + 7);
    weekNumber++;
  }
  
  return {
    league: 'NFL',
    season: 2025,
    weeks
  };
}

// Generate NBA schedule (October 2025 - April 2026)
export function generateNBASchedule(teams: LeagueTeam[]): SeasonSchedule {
  const startDate = new Date('2025-10-15'); // October 15, 2025
  const endDate = new Date('2026-04-15'); // April 15, 2026
  
  const weeks: WeekSchedule[] = [];
  const roundRobinMatches = generateRoundRobinSchedule([...teams]);
  
  let currentDate = new Date(startDate);
  let weekNumber = 1;
  let matchIndex = 0;
  
  // NBA plays more games per week (2-3 games)
  while (currentDate <= endDate && weekNumber <= 26) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const matchups: ScheduleMatchup[] = [];
    
    // Get matches for this week (cycle through round-robin if needed)
    if (matchIndex < roundRobinMatches.length) {
      const roundMatches = roundRobinMatches[matchIndex];
      
      for (let i = 0; i < roundMatches.length; i += 2) {
        const homeTeamIndex = roundMatches[i];
        const awayTeamIndex = roundMatches[i + 1];
        
        if (homeTeamIndex < teams.length && awayTeamIndex < teams.length) {
          const homeTeam = teams[homeTeamIndex];
          const awayTeam = teams[awayTeamIndex];
          
          // Schedule games for different days of the week
          const gameDate = new Date(weekStart);
          gameDate.setDate(gameDate.getDate() + 2); // Wednesday
          
          matchups.push({
            id: `nba-${weekNumber}-${homeTeam.id}-${awayTeam.id}`,
            week: weekNumber,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            homeTeamName: `${homeTeam.firstName} ${homeTeam.lastName}`,
            awayTeamName: `${awayTeam.firstName} ${awayTeam.lastName}`,
            date: gameDate.toISOString(),
            league: 'NBA',
            status: 'upcoming'
          });
        }
      }
      
      matchIndex++;
      
      // Reset to beginning if we've used all round-robin rounds
      if (matchIndex >= roundRobinMatches.length) {
        matchIndex = 0;
      }
    }
    
    weeks.push({
      week: weekNumber,
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      matchups
    });
    
    currentDate.setDate(currentDate.getDate() + 7);
    weekNumber++;
  }
  
  return {
    league: 'NBA',
    season: 2025,
    weeks
  };
}

// Generate MLB schedule (April 2025 - September 2025)
export function generateMLBSchedule(teams: LeagueTeam[]): SeasonSchedule {
  const startDate = new Date('2025-04-01'); // April 1, 2025
  const endDate = new Date('2025-09-30'); // September 30, 2025
  
  const weeks: WeekSchedule[] = [];
  const roundRobinMatches = generateRoundRobinSchedule([...teams]);
  
  let currentDate = new Date(startDate);
  let weekNumber = 1;
  let matchIndex = 0;
  
  // MLB plays most games (4-6 per week)
  while (currentDate <= endDate && weekNumber <= 26) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const matchups: ScheduleMatchup[] = [];
    
    // Get matches for this week (cycle through round-robin if needed)
    if (matchIndex < roundRobinMatches.length) {
      const roundMatches = roundRobinMatches[matchIndex];
      
      for (let i = 0; i < roundMatches.length; i += 2) {
        const homeTeamIndex = roundMatches[i];
        const awayTeamIndex = roundMatches[i + 1];
        
        if (homeTeamIndex < teams.length && awayTeamIndex < teams.length) {
          const homeTeam = teams[homeTeamIndex];
          const awayTeam = teams[awayTeamIndex];
          
          // Schedule games for different days of the week
          const gameDate = new Date(weekStart);
          gameDate.setDate(gameDate.getDate() + 1); // Tuesday
          
          matchups.push({
            id: `mlb-${weekNumber}-${homeTeam.id}-${awayTeam.id}`,
            week: weekNumber,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            homeTeamName: `${homeTeam.firstName} ${homeTeam.lastName}`,
            awayTeamName: `${awayTeam.firstName} ${awayTeam.lastName}`,
            date: gameDate.toISOString(),
            league: 'MLB',
            status: 'upcoming'
          });
        }
      }
      
      matchIndex++;
      
      // Reset to beginning if we've used all round-robin rounds
      if (matchIndex >= roundRobinMatches.length) {
        matchIndex = 0;
      }
    }
    
    weeks.push({
      week: weekNumber,
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      matchups
    });
    
    currentDate.setDate(currentDate.getDate() + 7);
    weekNumber++;
  }
  
  return {
    league: 'MLB',
    season: 2025,
    weeks
  };
}