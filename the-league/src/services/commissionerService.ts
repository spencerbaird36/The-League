const API_BASE_URL = 'http://localhost:5000/api';

export interface CommissionerLeague {
  id: number;
  name: string;
  description: string;
  maxPlayers: number;
  joinCode: string;
  isActive: boolean;
  createdAt: string;
  createdBy: {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  commissioner: {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  users: Array<{
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    createdAt: string;
  }>;
  userCount: number;
}

export interface UpdateLeagueSettings {
  name: string;
  description: string;
  maxPlayers: number;
}

export interface InviteUser {
  email: string;
}

export interface TransferCommissioner {
  newCommissionerId: number;
}

export interface DraftStatus {
  shouldPromptForRegularDrafts: boolean;
  pendingSports: string[];
  message: string | null;
}

export interface CreateRegularDraft {
  sportType: string;
}

export interface CreateDraftResponse {
  draftId: number;
  sportType: string;
  message: string;
}

export interface CreateAllDraftsResponse {
  message: string;
  created: Array<{
    draftId: number;
    sportType: string;
  }>;
}

export class CommissionerService {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  private handleResponse = async (response: Response) => {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  };

  // Check if user is commissioner of a league
  async isCommissioner(userId: number, leagueId: number): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/commissioner/verify/${leagueId}?userId=${userId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const result = await this.handleResponse(response);
    return result.isCommissioner;
  }

  // Get league data for commissioner management
  async getLeagueForCommissioner(leagueId: number, commissionerId: number): Promise<CommissionerLeague> {
    const response = await fetch(`${API_BASE_URL}/commissioner/league/${leagueId}?commissionerId=${commissionerId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Update league settings
  async updateLeagueSettings(leagueId: number, commissionerId: number, settings: UpdateLeagueSettings): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/commissioner/league/${leagueId}/settings?commissionerId=${commissionerId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });
    return this.handleResponse(response);
  }

  // Invite user to league
  async inviteUser(leagueId: number, commissionerId: number, invite: InviteUser): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/commissioner/league/${leagueId}/invite?commissionerId=${commissionerId}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(invite),
    });
    return this.handleResponse(response);
  }

  // Remove user from league
  async removeUser(leagueId: number, commissionerId: number, targetUserId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/commissioner/league/${leagueId}/users/${targetUserId}?commissionerId=${commissionerId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Transfer commissioner role
  async transferCommissioner(leagueId: number, currentCommissionerId: number, transfer: TransferCommissioner): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/commissioner/league/${leagueId}/transfer?currentCommissionerId=${currentCommissionerId}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(transfer),
    });
    return this.handleResponse(response);
  }

  // Check draft status and get pending sports for regular drafts
  async getDraftStatus(leagueId: number, commissionerId: number): Promise<DraftStatus> {
    const response = await fetch(`${API_BASE_URL}/commissioner/league/${leagueId}/draft-status?commissionerId=${commissionerId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Create a regular draft for a specific sport
  async createRegularDraft(leagueId: number, commissionerId: number, draft: CreateRegularDraft): Promise<CreateDraftResponse> {
    const response = await fetch(`${API_BASE_URL}/commissioner/league/${leagueId}/create-regular-draft?commissionerId=${commissionerId}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(draft),
    });
    return this.handleResponse(response);
  }

  // Create regular drafts for all pending sports
  async createAllRegularDrafts(leagueId: number, commissionerId: number): Promise<CreateAllDraftsResponse> {
    const response = await fetch(`${API_BASE_URL}/commissioner/league/${leagueId}/create-all-regular-drafts?commissionerId=${commissionerId}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const commissionerService = new CommissionerService();