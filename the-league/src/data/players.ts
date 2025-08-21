// This file is now a stub - all player data is served from the backend
// Any components importing from here should be updated to use the backend API
import { Player } from '../types/Player';

// Empty player array - components should fetch from backend instead
export const players: Player[] = [];

console.warn('⚠️ DEPRECATED: data/players.ts is deprecated. Use backend API instead.');