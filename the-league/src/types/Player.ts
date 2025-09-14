export interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  league: 'NFL' | 'MLB' | 'NBA';
  lineupPosition?: string;
  stats?: {
    [key: string]: number | string;
  };
  projection?: {
    fantasyPoints?: number;
    // NFL specific
    passingYards?: number;
    passingTouchdowns?: number;
    rushingYards?: number;
    rushingTouchdowns?: number;
    receivingYards?: number;
    receivingTouchdowns?: number;
    fieldGoalsMade?: number;
    // NBA specific
    points?: number;
    rebounds?: number;
    assists?: number;
    steals?: number;
    blocks?: number;
    turnovers?: number;
    // MLB specific
    runs?: number;
    hits?: number;
    homeRuns?: number;
    battingAverage?: number;
    runsBattedIn?: number;
    stolenBases?: number;
    wins?: number;
    saves?: number;
    strikeouts?: number;
    whip?: number;
  };
}