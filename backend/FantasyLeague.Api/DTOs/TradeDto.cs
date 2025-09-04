using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.DTOs
{
    // DTO for creating a new trade proposal
    public class CreateTradeProposalDto
    {
        public int LeagueId { get; set; }
        public int ProposingUserId { get; set; }
        public int TargetUserId { get; set; }
        public List<int> ProposingPlayerIds { get; set; } = new();
        public List<int> TargetPlayerIds { get; set; } = new();
        public string? Message { get; set; }
    }

    // DTO for responding to a trade proposal
    public class RespondToTradeDto
    {
        public bool Accept { get; set; }
        public string? Message { get; set; }
    }

    // DTO for trade participant information
    public class TradeParticipantDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
    }

    // DTO for player information in trades
    public class TradePlayerDto
    {
        public int Id { get; set; }
        public string PlayerName { get; set; } = string.Empty;
        public string PlayerPosition { get; set; } = string.Empty;
        public string PlayerTeam { get; set; } = string.Empty;
        public string PlayerLeague { get; set; } = string.Empty;
        public int PickNumber { get; set; }
        public int Round { get; set; }
    }

    // DTO for complete trade proposal information
    public class TradeProposalDto
    {
        public int Id { get; set; }
        public int LeagueId { get; set; }
        public int ProposingUserId { get; set; }
        public int TargetUserId { get; set; }
        public TradeParticipantDto ProposingUser { get; set; } = null!;
        public TradeParticipantDto TargetUser { get; set; } = null!;
        public List<TradePlayerDto> ProposingPlayers { get; set; } = new();
        public List<TradePlayerDto> TargetPlayers { get; set; } = new();
        public string Status { get; set; } = string.Empty;
        public string? Message { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    // DTO for trade proposal response
    public class TradeProposalResponseDto
    {
        public bool Success { get; set; }
        public TradeProposalDto? TradeProposal { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    // DTO for league team with roster information
    public class LeagueTeamDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? TeamName { get; set; }
        public List<TradePlayerDto> Roster { get; set; } = new();
    }

    // DTO for trade notification
    public class TradeNotificationDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Type { get; set; } = string.Empty;
        public int TradeProposalId { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // DTO for league trade activity
    public class TradeActivityDto
    {
        public int Id { get; set; }
        public string ProposingUser { get; set; } = string.Empty;
        public string TargetUser { get; set; } = string.Empty;
        public DateTime CompletedAt { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}