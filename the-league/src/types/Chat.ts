export interface ChatMessage {
  id: number;
  leagueId: number;
  userId: number;
  username: string;
  message: string;
  createdAt: string;
}

export interface CreateChatMessage {
  message: string;
}

export interface ChatReadStatus {
  unreadCount: number;
  lastReadMessageId?: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isConnected: boolean;
  unreadCount: number;
  isExpanded: boolean;
}