import * as signalR from '@microsoft/signalr';
import { ChatMessage } from '../types/Chat';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://fantasy-league-api-f6b13b993ec0.herokuapp.com' 
  : 'http://localhost:5000';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private messageCallbacks: ((message: ChatMessage) => void)[] = [];
  private userOnlineCallbacks: ((user: any) => void)[] = [];
  private userOfflineCallbacks: ((user: any) => void)[] = [];
  private onlineUsersCallbacks: ((users: any[]) => void)[] = [];

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
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

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/chathub`, {
        withCredentials: false, // CORS might not allow credentials
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
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
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
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
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
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
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
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
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }
}

const signalRService = new SignalRService();
export default signalRService;