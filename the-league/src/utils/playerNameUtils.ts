/**
 * Utility functions for cleaning and formatting player names
 */

/**
 * Removes auto-draft indicators and ID prefixes from player names
 * @param playerName - The raw player name from the backend
 * @returns Clean player name without prefixes or suffixes
 */
export function cleanPlayerName(playerName: string): string {
  if (!playerName) return playerName;
  
  let cleanName = playerName;
  
  // Remove ID prefix if present (e.g., "aaron-rodgers:Aaron Rodgers" -> "Aaron Rodgers")
  const idPrefixMatch = cleanName.match(/^([^:]+):(.+)$/);
  if (idPrefixMatch) {
    cleanName = idPrefixMatch[2].trim();
  }
  
  // Remove "(AUTO)" suffix for auto-drafted players
  cleanName = cleanName.replace(/\s*\(AUTO\)\s*$/, '').trim();
  
  return cleanName;
}

/**
 * Extracts player ID from name if present
 * @param playerName - The raw player name from the backend
 * @returns Player ID if found, null otherwise
 */
export function extractPlayerIdFromName(playerName: string): string | null {
  if (!playerName) return null;
  
  const idPrefixMatch = playerName.match(/^([^:]+):(.+)$/);
  return idPrefixMatch ? idPrefixMatch[1].trim() : null;
}