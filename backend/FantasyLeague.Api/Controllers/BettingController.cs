using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BettingController : ControllerBase
    {
        private readonly BettingService _bettingService;
        private readonly ILogger<BettingController> _logger;

        public BettingController(
            BettingService bettingService,
            ILogger<BettingController> logger)
        {
            _bettingService = bettingService;
            _logger = logger;
        }

        [HttpGet("available")]
        public async Task<ActionResult<AvailableBetsDto>> GetAvailableBets()
        {
            try
            {
                var userId = GetCurrentUserId();
                var availableBets = await _bettingService.GetAvailableBetsAsync(userId);
                return Ok(availableBets);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving available bets");
                return StatusCode(500, "An error occurred while retrieving available bets");
            }
        }

        [HttpGet("available/matchups")]
        public async Task<ActionResult<List<MatchupBetOptionDto>>> GetAvailableMatchups(int? leagueId = null)
        {
            try
            {
                var userId = GetCurrentUserId();
                var matchups = await _bettingService.GetAvailableMatchupBetsAsync(userId, leagueId);
                return Ok(matchups);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving available matchup bets for user {UserId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving available matchup bets");
            }
        }

        [HttpGet("available/games")]
        public async Task<ActionResult<List<GameBetOptionDto>>> GetAvailableGames(int? leagueId = null)
        {
            try
            {
                var userId = GetCurrentUserId();
                var games = await _bettingService.GetAvailableGameBetsAsync(userId, leagueId);
                return Ok(games);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving available game bets for user {UserId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving available game bets");
            }
        }

        [HttpPost("place")]
        public async Task<ActionResult<PlaceBetResponseDto>> PlaceBet([FromBody] PlaceBetDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var response = await _bettingService.PlaceBetAsync(userId, request);

                if (response.Success)
                {
                    return Ok(response);
                }
                else
                {
                    return BadRequest(response);
                }
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid bet request from user {UserId}: {Message}", GetCurrentUserId(), ex.Message);
                return BadRequest(new PlaceBetResponseDto
                {
                    Success = false,
                    Message = ex.Message,
                    ErrorMessage = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Bet placement failed for user {UserId}: {Message}", GetCurrentUserId(), ex.Message);
                return BadRequest(new PlaceBetResponseDto
                {
                    Success = false,
                    Message = ex.Message,
                    ErrorMessage = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error placing bet for user {UserId}", GetCurrentUserId());
                return StatusCode(500, new PlaceBetResponseDto
                {
                    Success = false,
                    Message = "An error occurred while placing the bet",
                    ErrorMessage = "Internal server error"
                });
            }
        }

        [HttpGet("my-bets")]
        public async Task<ActionResult<List<BetDto>>> GetMyBets(
            [FromQuery] BetStatus? status = null,
            [FromQuery] BetType? type = null,
            [FromQuery] int? leagueId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var userId = GetCurrentUserId();
                var bets = await _bettingService.GetUserBetsAsync(userId, status, type, leagueId, page, pageSize);
                return Ok(bets);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving bets for user {UserId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving your bets");
            }
        }

        [HttpGet("my-bets/{betId}")]
        public async Task<ActionResult<BetDto>> GetMyBet(int betId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var bet = await _bettingService.GetUserBetAsync(userId, betId);

                if (bet == null)
                {
                    return NotFound("Bet not found or you don't have permission to view it");
                }

                return Ok(bet);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving bet {BetId} for user {UserId}", betId, GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving the bet");
            }
        }

        [HttpPost("my-bets/{betId}/cancel")]
        public async Task<ActionResult<PlaceBetResponseDto>> CancelBet(int betId)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _bettingService.CancelBetAsync(userId, betId);

                if (result.Success)
                {
                    return Ok(result);
                }
                else
                {
                    return BadRequest(result);
                }
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid bet cancellation request from user {UserId} for bet {BetId}: {Message}",
                    GetCurrentUserId(), betId, ex.Message);
                return BadRequest(new PlaceBetResponseDto
                {
                    Success = false,
                    Message = ex.Message,
                    ErrorMessage = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling bet {BetId} for user {UserId}", betId, GetCurrentUserId());
                return StatusCode(500, new PlaceBetResponseDto
                {
                    Success = false,
                    Message = "An error occurred while cancelling the bet",
                    ErrorMessage = "Internal server error"
                });
            }
        }

        [HttpGet("my-stats")]
        public async Task<ActionResult<BettingStatsDto>> GetMyBettingStats([FromQuery] int? leagueId = null)
        {
            try
            {
                var userId = GetCurrentUserId();
                var stats = await _bettingService.GetUserBettingStatsAsync(userId, leagueId);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving betting stats for user {UserId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving your betting statistics");
            }
        }

        [HttpGet("odds/calculate")]
        public async Task<ActionResult<decimal>> CalculateOdds(
            [FromQuery] BetType betType,
            [FromQuery] int? matchupBetId = null,
            [FromQuery] MatchupBetSelection? matchupSelection = null,
            [FromQuery] int? gameBetId = null,
            [FromQuery] GameBetSelection? gameSelection = null)
        {
            try
            {
                var odds = await _bettingService.CalculateOddsAsync(betType, matchupBetId, matchupSelection, gameBetId, gameSelection);
                return Ok(odds);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid odds calculation request: {Message}", ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating odds for bet type {BetType}", betType);
                return StatusCode(500, "An error occurred while calculating odds");
            }
        }

        [HttpGet("payout/calculate")]
        public async Task<ActionResult<decimal>> CalculatePayout(
            [FromQuery] decimal betAmount,
            [FromQuery] BetType betType,
            [FromQuery] int? matchupBetId = null,
            [FromQuery] MatchupBetSelection? matchupSelection = null,
            [FromQuery] int? gameBetId = null,
            [FromQuery] GameBetSelection? gameSelection = null)
        {
            try
            {
                var odds = await _bettingService.CalculateOddsAsync(betType, matchupBetId, matchupSelection, gameBetId, gameSelection);
                var payout = await _bettingService.CalculatePayoutAsync(betAmount, odds);
                return Ok(payout);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid payout calculation request: {Message}", ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating payout for amount {Amount} and bet type {BetType}", betAmount, betType);
                return StatusCode(500, "An error occurred while calculating payout");
            }
        }

        [HttpGet("kelly-bet-size")]
        public async Task<ActionResult<decimal>> CalculateKellyBetSize(
            [FromQuery] decimal bankroll,
            [FromQuery] decimal winProbability,
            [FromQuery] BetType betType,
            [FromQuery] int? matchupBetId = null,
            [FromQuery] MatchupBetSelection? matchupSelection = null,
            [FromQuery] int? gameBetId = null,
            [FromQuery] GameBetSelection? gameSelection = null)
        {
            try
            {
                var odds = await _bettingService.CalculateOddsAsync(betType, matchupBetId, matchupSelection, gameBetId, gameSelection);
                var kellySize = await _bettingService.CalculateKellyBetSizeAsync(bankroll, odds, winProbability);
                return Ok(kellySize);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid Kelly bet size calculation request: {Message}", ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating Kelly bet size for bankroll {Bankroll} and probability {Probability}",
                    bankroll, winProbability);
                return StatusCode(500, "An error occurred while calculating recommended bet size");
            }
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                throw new UnauthorizedAccessException("Invalid user ID in token");
            }
            return userId;
        }
    }
}