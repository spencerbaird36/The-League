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
}