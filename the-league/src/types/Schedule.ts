export interface ScheduleMatchup {
  id: string;
  week: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  date: string;
  league: 'NFL' | 'NBA' | 'MLB';
  status: 'upcoming' | 'in_progress' | 'completed';
  homeScore?: number;
  awayScore?: number;
  isPlayoffs?: boolean;
}

export interface WeekSchedule {
  week: number;
  startDate: string;
  endDate: string;
  matchups: ScheduleMatchup[];
}

export interface SeasonSchedule {
  league: 'NFL' | 'NBA' | 'MLB';
  season: number;
  weeks: WeekSchedule[];
  playoffWeeks?: WeekSchedule[];
}

export interface LeagueTeam {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  username: string;
}

export interface ScheduleDisplayProps {
  league: 'NFL' | 'NBA' | 'MLB';
  teams: LeagueTeam[];
  currentWeek?: number;
}