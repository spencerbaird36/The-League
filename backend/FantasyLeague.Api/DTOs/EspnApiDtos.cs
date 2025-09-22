using System.Text.Json.Serialization;

namespace FantasyLeague.Api.DTOs
{
    // ESPN API Response DTOs
    public class EspnScoreboardResponse
    {
        [JsonPropertyName("leagues")]
        public List<EspnLeague>? Leagues { get; set; }

        [JsonPropertyName("events")]
        public List<EspnEvent>? Events { get; set; }
    }

    public class EspnLeague
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("abbreviation")]
        public string Abbreviation { get; set; } = string.Empty;
    }

    public class EspnEvent
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("shortName")]
        public string ShortName { get; set; } = string.Empty;

        [JsonPropertyName("date")]
        public DateTime Date { get; set; }

        [JsonPropertyName("status")]
        public EspnStatus? Status { get; set; }

        [JsonPropertyName("competitions")]
        public List<EspnCompetition>? Competitions { get; set; }

        [JsonPropertyName("season")]
        public EspnSeason? Season { get; set; }

        [JsonPropertyName("week")]
        public EspnWeek? Week { get; set; }
    }

    public class EspnStatus
    {
        [JsonPropertyName("type")]
        public EspnStatusType? Type { get; set; }

        [JsonPropertyName("displayClock")]
        public string? DisplayClock { get; set; }

        [JsonPropertyName("period")]
        public int Period { get; set; }
    }

    public class EspnStatusType
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("state")]
        public string State { get; set; } = string.Empty;

        [JsonPropertyName("completed")]
        public bool Completed { get; set; }

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("detail")]
        public string Detail { get; set; } = string.Empty;

        [JsonPropertyName("shortDetail")]
        public string ShortDetail { get; set; } = string.Empty;
    }

    public class EspnCompetition
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("date")]
        public DateTime Date { get; set; }

        [JsonPropertyName("competitors")]
        public List<EspnCompetitor>? Competitors { get; set; }

        [JsonPropertyName("odds")]
        public List<EspnOdds>? Odds { get; set; }

        [JsonPropertyName("status")]
        public EspnStatus? Status { get; set; }
    }

    public class EspnCompetitor
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("homeAway")]
        public string HomeAway { get; set; } = string.Empty;

        [JsonPropertyName("winner")]
        public bool? Winner { get; set; }

        [JsonPropertyName("score")]
        public string? Score { get; set; }

        [JsonPropertyName("team")]
        public EspnTeam? Team { get; set; }
    }

    public class EspnTeam
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; } = string.Empty;

        [JsonPropertyName("abbreviation")]
        public string Abbreviation { get; set; } = string.Empty;

        [JsonPropertyName("logo")]
        public string? Logo { get; set; }
    }

    public class EspnOdds
    {
        [JsonPropertyName("provider")]
        public EspnOddsProvider? Provider { get; set; }

        [JsonPropertyName("details")]
        public string? Details { get; set; }

        [JsonPropertyName("overUnder")]
        public decimal? OverUnder { get; set; }

        [JsonPropertyName("spread")]
        public decimal? Spread { get; set; }

        [JsonPropertyName("homeTeamOdds")]
        public EspnTeamOdds? HomeTeamOdds { get; set; }

        [JsonPropertyName("awayTeamOdds")]
        public EspnTeamOdds? AwayTeamOdds { get; set; }
    }

    public class EspnOddsProvider
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    public class EspnTeamOdds
    {
        [JsonPropertyName("favorite")]
        public bool Favorite { get; set; }

        [JsonPropertyName("underdog")]
        public bool Underdog { get; set; }

        [JsonPropertyName("moneyLine")]
        public int? MoneyLine { get; set; }

        [JsonPropertyName("spreadOdds")]
        public decimal? SpreadOdds { get; set; }

        [JsonPropertyName("team")]
        public EspnTeamReference? Team { get; set; }
    }

    public class EspnTeamReference
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;
    }

    public class EspnSeason
    {
        [JsonPropertyName("year")]
        public int Year { get; set; }

        [JsonPropertyName("type")]
        public int Type { get; set; }
    }

    public class EspnWeek
    {
        [JsonPropertyName("number")]
        public int Number { get; set; }
    }

    // Internal DTOs for service layer
    public class GameDataDto
    {
        public string ExternalGameId { get; set; } = string.Empty;
        public string Sport { get; set; } = string.Empty;
        public string HomeTeam { get; set; } = string.Empty;
        public string AwayTeam { get; set; } = string.Empty;
        public DateTime GameDateTime { get; set; }
        public string? Week { get; set; }
        public string? Season { get; set; }
        public decimal? PointSpread { get; set; }
        public decimal? OverUnderLine { get; set; }
        public decimal? HomeMoneylineOdds { get; set; }
        public decimal? AwayMoneylineOdds { get; set; }
        public decimal? OverOdds { get; set; }
        public decimal? UnderOdds { get; set; }
        public int? HomeScore { get; set; }
        public int? AwayScore { get; set; }
        public string GameStatus { get; set; } = "Scheduled";
        public string DataSource { get; set; } = "ESPN";
    }

    public class SportsDataSyncResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int GamesProcessed { get; set; }
        public int GamesCreated { get; set; }
        public int GamesUpdated { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class AllUpcomingGamesResponse
    {
        [JsonPropertyName("NFL")]
        public List<GameDataDto> NFL { get; set; } = new();

        [JsonPropertyName("NBA")]
        public List<GameDataDto> NBA { get; set; } = new();

        [JsonPropertyName("MLB")]
        public List<GameDataDto> MLB { get; set; } = new();

        [JsonPropertyName("totalGames")]
        public int TotalGames { get; set; }
    }
}