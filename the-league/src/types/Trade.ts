// Import Player type for use in TradeModalState and other interfaces
import { Player } from './Player';

export interface TradeParticipant {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
}

export interface TradePlayer {
  id: number;
  playerName: string;
  playerPosition: string;
  playerTeam: string;
  playerLeague: string;
  pickNumber: number;
  round: number;
}

export interface TradeProposal {
  id: number;
  leagueId: number;
  proposingUserId: number;
  targetUserId: number;
  proposingUser: TradeParticipant;
  targetUser: TradeParticipant;
  proposingPlayers: TradePlayer[];
  targetPlayers: TradePlayer[];
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  message?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface CreateTradeProposalRequest {
  leagueId: number;
  proposingUserId: number;
  targetUserId: number;
  proposingPlayerIds: number[];
  targetPlayerIds: number[];
  message?: string;
}

export interface TradeProposalResponse {
  success: boolean;
  tradeProposal?: TradeProposal;
  message: string;
}

export interface LeagueTeam {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  teamName?: string;
  roster: TradePlayer[];
}

// Trade notification types
export interface TradeNotification {
  id: number;
  userId: number;
  type: 'trade_proposal_received' | 'trade_proposal_accepted' | 'trade_proposal_rejected';
  tradeProposalId: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// League trade activity (for showing completed trades to all users)
export interface TradeActivity {
  id: number;
  proposingUser: string;
  targetUser: string;
  completedAt: string;
  message: string;
}

// Trade step enum for the modal
export enum TradeStep {
  SELECT_TEAM = 'select_team',
  SELECT_THEIR_PLAYERS = 'select_their_players', 
  SELECT_MY_PLAYERS = 'select_my_players',
  REVIEW_TRADE = 'review_trade',
  TRADE_SENT = 'trade_sent'
}

// Trade modal state interface
export interface TradeModalState {
  currentStep: TradeStep;
  selectedTeam: LeagueTeam | null;
  selectedTheirPlayers: TradePlayer[];
  selectedMyPlayers: TradePlayer[];
  message: string;
  isLoading: boolean;
  error: string | null;
}