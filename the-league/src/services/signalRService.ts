import { HubConnection, HubConnectionBuilder, LogLevel, HubConnectionState, HttpTransportType } from '@microsoft/signalr';
import { ChatMessage } from '../types/Chat';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://the-league-api-1ff2960f0715.herokuapp.com' 
  : 'http://localhost:5000';

class SignalRService {
  private connection: HubConnection | null = null;
  private messageCallbacks: ((message: ChatMessage) => void)[] = [];
  private userOnlineCallbacks: ((user: any) => void)[] = [];
  private userOfflineCallbacks: ((user: any) => void)[] = [];
  private onlineUsersCallbacks: ((users: any[]) => void)[] = [];
  
  // Draft event callbacks
  private draftStartedCallbacks: ((data: any) => void)[] = [];
  private turnChangedCallbacks: ((data: any) => void)[] = [];
  private playerDraftedCallbacks: ((data: any) => void)[] = [];
  private draftPausedCallbacks: ((data: any) => void)[] = [];
  private draftResumedCallbacks: ((data: any) => void)[] = [];
  private draftCompletedCallbacks: ((data: any) => void)[] = [];
  private timerTickCallbacks: ((data: any) => void)[] = [];
  private draftResetCallbacks: ((data: any) => void)[] = [];

  async connect(): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      return;
    }

    // If there's an existing connection that's not connected, clean it up
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (err) {
        console.warn('Error stopping existing connection:', err);
      }
      this.connection = null;
    }

    this.connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/chathub`, {
        withCredentials: false, // CORS might not allow credentials
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(LogLevel.Information)
      .build();

    this.connection.on('ReceiveMessage', (message: ChatMessage) => {
      console.log('Received message:', message);
      this.messageCallbacks.forEach(callback => callback(message));
    });

    this.connection.on('UserOnline', (user: any) => {
      console.log('User came online:', user);
      this.userOnlineCallbacks.forEach(callback => callback(user));
    });

    this.connection.on('UserOffline', (user: any) => {
      console.log('User went offline:', user);
      this.userOfflineCallbacks.forEach(callback => callback(user));
    });

    this.connection.on('OnlineUsers', (users: any[]) => {
      console.log('Online users updated:', users);
      this.onlineUsersCallbacks.forEach(callback => callback(users));
    });

    // Draft event listeners
    this.connection.on('DraftStarted', (data: any) => {
      console.log('🔥🔥🔥 SIGNALR: Draft started event received:', data);
      console.log('Draft started callback count:', this.draftStartedCallbacks.length);
      this.draftStartedCallbacks.forEach((callback, index) => {
        console.log(`Calling draft started callback ${index}`);
        callback(data);
      });
      console.log('🔥🔥🔥 SIGNALR: All draft started callbacks executed');
    });

    this.connection.on('TurnChanged', (data: any) => {
      console.log('Turn changed:', data);
      this.turnChangedCallbacks.forEach(callback => callback(data));
    });

    this.connection.on('PlayerDrafted', (data: any) => {
      console.log('Player drafted:', data);
      this.playerDraftedCallbacks.forEach(callback => callback(data));
    });

    this.connection.on('DraftPaused', (data: any) => {
      console.log('Draft paused:', data);
      this.draftPausedCallbacks.forEach(callback => callback(data));
    });

    this.connection.on('DraftResumed', (data: any) => {
      console.log('Draft resumed:', data);
      this.draftResumedCallbacks.forEach(callback => callback(data));
    });

    this.connection.on('DraftCompleted', (data: any) => {
      console.log('Draft completed:', data);
      this.draftCompletedCallbacks.forEach(callback => callback(data));
    });

    this.connection.on('TimerTick', (data: any) => {
      console.log('Timer tick:', data);
      this.timerTickCallbacks.forEach(callback => callback(data));
    });

    this.connection.on('DraftReset', (data: any) => {
      console.log('Draft reset:', data);
      this.draftResetCallbacks.forEach(callback => callback(data));
    });

    this.connection.onreconnecting((error) => {
      console.warn('SignalR reconnecting:', error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR reconnected:', connectionId);
    });

    this.connection.onclose((error) => {
      console.error('SignalR connection closed:', error);
    });

    try {
      await this.connection.start();
      console.log('SignalR Connected successfully, state:', this.connection.state);
    } catch (err) {
      console.error('Error connecting to SignalR hub:', err);
      this.connection = null;
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  async joinLeague(leagueId: number, userId: number): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error('SignalR connection not established');
    }

    try {
      await this.connection.invoke('JoinLeague', leagueId.toString(), userId.toString());
      console.log('Joined league:', leagueId);
    } catch (err) {
      console.error('Error joining league:', err);
      throw err;
    }
  }

  async leaveLeague(leagueId: number): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      return;
    }

    try {
      await this.connection.invoke('LeaveLeague', leagueId.toString());
      console.log('Left league:', leagueId);
    } catch (err) {
      console.error('Error leaving league:', err);
    }
  }

  async sendMessage(leagueId: number, userId: number, message: string): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error(`SignalR connection not ready. Current state: ${this.connection?.state || 'null'}`);
    }

    try {
      await this.connection.invoke('SendMessage', leagueId.toString(), userId.toString(), message);
      console.log('Message sent successfully');
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }

  onMessage(callback: (message: ChatMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  offMessage(callback: (message: ChatMessage) => void): void {
    const index = this.messageCallbacks.indexOf(callback);
    if (index > -1) {
      this.messageCallbacks.splice(index, 1);
    }
  }

  onUserOnline(callback: (user: any) => void): void {
    this.userOnlineCallbacks.push(callback);
  }

  offUserOnline(callback: (user: any) => void): void {
    const index = this.userOnlineCallbacks.indexOf(callback);
    if (index > -1) {
      this.userOnlineCallbacks.splice(index, 1);
    }
  }

  onUserOffline(callback: (user: any) => void): void {
    this.userOfflineCallbacks.push(callback);
  }

  offUserOffline(callback: (user: any) => void): void {
    const index = this.userOfflineCallbacks.indexOf(callback);
    if (index > -1) {
      this.userOfflineCallbacks.splice(index, 1);
    }
  }

  onOnlineUsers(callback: (users: any[]) => void): void {
    this.onlineUsersCallbacks.push(callback);
  }

  offOnlineUsers(callback: (users: any[]) => void): void {
    const index = this.onlineUsersCallbacks.indexOf(callback);
    if (index > -1) {
      this.onlineUsersCallbacks.splice(index, 1);
    }
  }

  isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  // Draft methods
  async startDraft(leagueId: number): Promise<void> {
    console.log('🚀🚀🚀 SIGNALR: Starting draft for league:', leagueId);
    console.log('Connection state:', this.connection?.state);
    console.log('Connection object:', this.connection);
    
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      console.error('❌ SignalR connection not ready');
      throw new Error(`SignalR connection not ready. Current state: ${this.connection?.state || 'null'}`);
    }

    try {
      console.log('📡 Invoking StartDraft on SignalR hub...');
      await this.connection.invoke('StartDraft', leagueId.toString());
      console.log('✅ Draft started successfully via SignalR');
    } catch (err) {
      console.error('❌ Error starting draft via SignalR:', err);
      throw err;
    }
  }

  async makeDraftPick(leagueId: number, playerId: string, playerName: string, position: string, team: string, league: string, isAutoDraft: boolean = false): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error(`SignalR connection not ready. Current state: ${this.connection?.state || 'null'}`);
    }

    try {
      if (isAutoDraft) {
        console.log('Making auto-draft pick via WebSocket');
        await this.connection.invoke('MakeAutoDraftPick', leagueId.toString(), playerId, playerName, position, team, league);
      } else {
        console.log('Making manual draft pick via WebSocket');
        await this.connection.invoke('MakeDraftPick', leagueId.toString(), playerId, playerName, position, team, league);
      }
      console.log('Draft pick made successfully');
    } catch (err) {
      console.error('Error making draft pick:', err);
      throw err;
    }
  }

  async pauseDraft(leagueId: number): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error(`SignalR connection not ready. Current state: ${this.connection?.state || 'null'}`);
    }

    try {
      await this.connection.invoke('PauseDraft', leagueId.toString());
      console.log('Draft paused successfully');
    } catch (err) {
      console.error('Error pausing draft:', err);
      throw err;
    }
  }

  async resumeDraft(leagueId: number): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error(`SignalR connection not ready. Current state: ${this.connection?.state || 'null'}`);
    }

    try {
      await this.connection.invoke('ResumeDraft', leagueId.toString());
      console.log('Draft resumed successfully');
    } catch (err) {
      console.error('Error resuming draft:', err);
      throw err;
    }
  }

  async getCurrentDraftState(leagueId: number): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error(`SignalR connection not ready. Current state: ${this.connection?.state || 'null'}`);
    }

    try {
      await this.connection.invoke('GetCurrentDraftState', leagueId.toString());
      console.log('Requested current draft state via WebSocket');
    } catch (err) {
      console.error('Error requesting current draft state:', err);
      throw err;
    }
  }

  async resetDraft(leagueId: number): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      throw new Error(`SignalR connection not ready. Current state: ${this.connection?.state || 'null'}`);
    }

    try {
      await this.connection.invoke('ResetDraft', leagueId.toString());
      console.log('Draft reset via WebSocket');
    } catch (err) {
      console.error('Error resetting draft:', err);
      throw err;
    }
  }

  // Draft event callback registration
  onDraftStarted(callback: (data: any) => void): void {
    this.draftStartedCallbacks.push(callback);
  }

  offDraftStarted(callback: (data: any) => void): void {
    const index = this.draftStartedCallbacks.indexOf(callback);
    if (index > -1) {
      this.draftStartedCallbacks.splice(index, 1);
    }
  }

  onTurnChanged(callback: (data: any) => void): void {
    this.turnChangedCallbacks.push(callback);
  }

  offTurnChanged(callback: (data: any) => void): void {
    const index = this.turnChangedCallbacks.indexOf(callback);
    if (index > -1) {
      this.turnChangedCallbacks.splice(index, 1);
    }
  }

  onPlayerDrafted(callback: (data: any) => void): void {
    this.playerDraftedCallbacks.push(callback);
  }

  offPlayerDrafted(callback: (data: any) => void): void {
    const index = this.playerDraftedCallbacks.indexOf(callback);
    if (index > -1) {
      this.playerDraftedCallbacks.splice(index, 1);
    }
  }

  onDraftPaused(callback: (data: any) => void): void {
    this.draftPausedCallbacks.push(callback);
  }

  offDraftPaused(callback: (data: any) => void): void {
    const index = this.draftPausedCallbacks.indexOf(callback);
    if (index > -1) {
      this.draftPausedCallbacks.splice(index, 1);
    }
  }

  onDraftResumed(callback: (data: any) => void): void {
    this.draftResumedCallbacks.push(callback);
  }

  offDraftResumed(callback: (data: any) => void): void {
    const index = this.draftResumedCallbacks.indexOf(callback);
    if (index > -1) {
      this.draftResumedCallbacks.splice(index, 1);
    }
  }

  onDraftCompleted(callback: (data: any) => void): void {
    this.draftCompletedCallbacks.push(callback);
  }

  offDraftCompleted(callback: (data: any) => void): void {
    const index = this.draftCompletedCallbacks.indexOf(callback);
    if (index > -1) {
      this.draftCompletedCallbacks.splice(index, 1);
    }
  }

  onTimerTick(callback: (data: any) => void): void {
    this.timerTickCallbacks.push(callback);
  }

  offTimerTick(callback: (data: any) => void): void {
    const index = this.timerTickCallbacks.indexOf(callback);
    if (index > -1) {
      this.timerTickCallbacks.splice(index, 1);
    }
  }

  onDraftReset(callback: (data: any) => void): void {
    this.draftResetCallbacks.push(callback);
  }

  offDraftReset(callback: (data: any) => void): void {
    const index = this.draftResetCallbacks.indexOf(callback);
    if (index > -1) {
      this.draftResetCallbacks.splice(index, 1);
    }
  }
}

const signalRService = new SignalRService();
export default signalRService;