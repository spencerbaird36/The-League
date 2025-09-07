using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FantasyLeague.Api.Services
{
    public interface ICommissionerService
    {
        Task<bool> IsCommissioner(int userId, int leagueId);
        Task<bool> UpdateLeagueSettings(int leagueId, int commissionerId, string name, string description, int maxPlayers);
        Task<bool> InviteUser(int leagueId, int commissionerId, string email);
        Task<bool> RemoveUser(int leagueId, int commissionerId, int targetUserId);
        Task<bool> TransferCommissioner(int leagueId, int currentCommissionerId, int newCommissionerId);
        Task<League?> GetLeagueForCommissioner(int leagueId, int commissionerId);
    }

    public class CommissionerService : ICommissionerService
    {
        private readonly FantasyLeagueContext _context;

        public CommissionerService(FantasyLeagueContext context)
        {
            _context = context;
        }

        public async Task<bool> IsCommissioner(int userId, int leagueId)
        {
            var league = await _context.Leagues.FindAsync(leagueId);
            return league?.CommissionerId == userId;
        }

        public async Task<bool> UpdateLeagueSettings(int leagueId, int commissionerId, string name, string description, int maxPlayers)
        {
            if (!await IsCommissioner(commissionerId, leagueId))
            {
                return false;
            }

            var league = await _context.Leagues.FindAsync(leagueId);
            if (league == null)
            {
                return false;
            }

            // Check if the name is already taken by another league (excluding current league)
            var existingLeague = await _context.Leagues
                .FirstOrDefaultAsync(l => l.Name == name && l.Id != leagueId);
            if (existingLeague != null)
            {
                return false; // Name already taken
            }

            // Validate max players
            var currentUserCount = await _context.Users.CountAsync(u => u.LeagueId == leagueId);
            if (maxPlayers < currentUserCount)
            {
                return false; // Can't reduce max players below current user count
            }

            league.Name = name;
            league.Description = description;
            league.MaxPlayers = maxPlayers;

            try
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> InviteUser(int leagueId, int commissionerId, string email)
        {
            if (!await IsCommissioner(commissionerId, leagueId))
            {
                return false;
            }

            var league = await _context.Leagues
                .Include(l => l.Users)
                .FirstOrDefaultAsync(l => l.Id == leagueId);

            if (league == null)
            {
                return false;
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                return false; // User doesn't exist
            }

            if (user.LeagueId != null)
            {
                return false; // User is already in a league
            }

            if (league.Users.Count >= league.MaxPlayers)
            {
                return false; // League is full
            }

            user.LeagueId = leagueId;

            try
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> RemoveUser(int leagueId, int commissionerId, int targetUserId)
        {
            if (!await IsCommissioner(commissionerId, leagueId))
            {
                return false;
            }

            // Can't remove the commissioner themselves
            if (commissionerId == targetUserId)
            {
                return false;
            }

            var user = await _context.Users.FindAsync(targetUserId);
            if (user == null || user.LeagueId != leagueId)
            {
                return false;
            }

            // Remove user from league
            user.LeagueId = null;

            // TODO: Handle cleanup of user's roster, drafts, etc.
            // For now, we'll just remove them from the league

            try
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> TransferCommissioner(int leagueId, int currentCommissionerId, int newCommissionerId)
        {
            if (!await IsCommissioner(currentCommissionerId, leagueId))
            {
                return false;
            }

            var league = await _context.Leagues.FindAsync(leagueId);
            if (league == null)
            {
                return false;
            }

            var newCommissioner = await _context.Users.FindAsync(newCommissionerId);
            if (newCommissioner == null || newCommissioner.LeagueId != leagueId)
            {
                return false; // New commissioner must be in the same league
            }

            league.CommissionerId = newCommissionerId;

            try
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<League?> GetLeagueForCommissioner(int leagueId, int commissionerId)
        {
            if (!await IsCommissioner(commissionerId, leagueId))
            {
                return null;
            }

            return await _context.Leagues
                .Include(l => l.CreatedBy)
                .Include(l => l.Commissioner)
                .Include(l => l.Users)
                .FirstOrDefaultAsync(l => l.Id == leagueId);
        }
    }
}