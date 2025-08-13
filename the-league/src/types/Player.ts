export interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  league: 'NFL' | 'MLB' | 'NBA';
  stats?: {
    [key: string]: number | string;
  };
}