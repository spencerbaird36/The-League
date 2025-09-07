import { ChatMessage, CreateChatMessage, ChatReadStatus } from '../types/Chat';
import { API_BASE_URL } from '../config/api';

class ChatService {
  async getMessages(leagueId: number, limit = 50, offset = 0): Promise<ChatMessage[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/chat/league/${leagueId}/messages?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async sendMessage(leagueId: number, userId: number, message: CreateChatMessage): Promise<ChatMessage> {
    const response = await fetch(
      `${API_BASE_URL}/api/chat/league/${leagueId}/messages?userId=${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getUnreadCount(leagueId: number, userId: number): Promise<ChatReadStatus> {
    const response = await fetch(
      `${API_BASE_URL}/api/chat/league/${leagueId}/unread-count?userId=${userId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async markAsRead(leagueId: number, userId: number, lastMessageId: number): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/chat/league/${leagueId}/mark-read?userId=${userId}&lastMessageId=${lastMessageId}`,
      {
        method: 'PUT',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  async deleteMessage(messageId: number, userId: number): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/chat/messages/${messageId}?userId=${userId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  async clearAllMessages(leagueId: number, userId: number): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/chat/league/${leagueId}/clear?userId=${userId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
}

const chatService = new ChatService();
export default chatService;