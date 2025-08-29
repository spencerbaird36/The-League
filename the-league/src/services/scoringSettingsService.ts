import { ScoringSettings, ScoringPresetsResponse } from '../types/ScoringSettings';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://the-league-api-1ff2960f0715.herokuapp.com' 
  : 'http://localhost:5000';

export class ScoringSettingsService {
  private baseUrl = `${API_BASE_URL}/api/scoringsettings`;

  // Get all scoring settings for a league
  async getLeagueScoringSettings(leagueId: number): Promise<ScoringSettings[]> {
    try {
      console.log(`📊 Fetching scoring settings for league ${leagueId}`);
      
      const response = await fetch(`${this.baseUrl}/league/${leagueId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch scoring settings: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.length} scoring settings for league ${leagueId}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching league scoring settings:', error);
      throw error;
    }
  }

  // Get scoring settings for a specific sport in a league
  async getLeagueScoringSettingsBySport(leagueId: number, sport: string): Promise<ScoringSettings> {
    try {
      console.log(`📊 Fetching ${sport} scoring settings for league ${leagueId}`);
      
      const response = await fetch(`${this.baseUrl}/league/${leagueId}/sport/${sport}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No ${sport} scoring settings found for league ${leagueId}`);
        }
        throw new Error(`Failed to fetch scoring settings: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${sport} scoring settings for league ${leagueId}`);
      
      return data;
    } catch (error) {
      console.error(`❌ Error fetching ${sport} scoring settings:`, error);
      throw error;
    }
  }

  // Create new scoring settings
  async createScoringSettings(scoringSettings: Omit<ScoringSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScoringSettings> {
    try {
      console.log(`📊 Creating scoring settings for league ${scoringSettings.leagueId}, sport ${scoringSettings.sport}`);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scoringSettings),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create scoring settings: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Created scoring settings with ID ${data.id}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error creating scoring settings:', error);
      throw error;
    }
  }

  // Update existing scoring settings
  async updateScoringSettings(id: number, scoringSettings: ScoringSettings): Promise<void> {
    try {
      console.log(`📊 Updating scoring settings ${id}`);
      
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scoringSettings),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update scoring settings: ${response.status} ${response.statusText}`);
      }

      console.log(`✅ Updated scoring settings ${id}`);
    } catch (error) {
      console.error('❌ Error updating scoring settings:', error);
      throw error;
    }
  }

  // Initialize default scoring settings for a league
  async initializeDefaultScoringSettings(leagueId: number): Promise<ScoringSettings> {
    try {
      console.log(`📊 Initializing default scoring settings for league ${leagueId}`);
      
      const response = await fetch(`${this.baseUrl}/league/${leagueId}/initialize-defaults`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to initialize default scoring settings: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Initialized default scoring settings for league ${leagueId} with ID ${data.id}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error initializing default scoring settings:', error);
      throw error;
    }
  }

  // Get scoring presets for a sport
  async getScoringPresets(sport: string): Promise<ScoringPresetsResponse> {
    try {
      console.log(`📊 Fetching scoring presets for ${sport}`);
      
      const response = await fetch(`${this.baseUrl}/presets/${sport}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch scoring presets: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.presets.length} scoring presets for ${sport}`);
      
      return data;
    } catch (error) {
      console.error(`❌ Error fetching ${sport} scoring presets:`, error);
      throw error;
    }
  }

  // Delete scoring settings (soft delete)
  async deleteScoringSettings(id: number): Promise<void> {
    try {
      console.log(`📊 Deleting scoring settings ${id}`);
      
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete scoring settings: ${response.status} ${response.statusText}`);
      }

      console.log(`✅ Deleted scoring settings ${id}`);
    } catch (error) {
      console.error('❌ Error deleting scoring settings:', error);
      throw error;
    }
  }

  // Utility function to check if league has scoring settings
  async hasLeagueScoringSettings(leagueId: number, sport: string = 'NFL'): Promise<boolean> {
    try {
      await this.getLeagueScoringSettingsBySport(leagueId, sport);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Utility function to ensure a league has default scoring settings
  async ensureDefaultScoringSettings(leagueId: number): Promise<ScoringSettings> {
    try {
      // Try to get existing NFL settings
      const existingSettings = await this.getLeagueScoringSettingsBySport(leagueId, 'NFL');
      return existingSettings;
    } catch (error) {
      // If no settings exist, create defaults
      console.log(`No existing scoring settings found for league ${leagueId}, creating defaults...`);
      return await this.initializeDefaultScoringSettings(leagueId);
    }
  }
}

// Export a singleton instance
export const scoringSettingsService = new ScoringSettingsService();