using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Data
{
    public class FantasyLeagueContext : DbContext
    {
        public FantasyLeagueContext(DbContextOptions<FantasyLeagueContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<League> Leagues { get; set; }
        public DbSet<TeamStats> TeamStats { get; set; }
        public DbSet<Draft> Drafts { get; set; }
        public DbSet<DraftPick> DraftPicks { get; set; }
        public DbSet<UserRoster> UserRosters { get; set; }
        public DbSet<Season> Seasons { get; set; }
        public DbSet<Week> Weeks { get; set; }
        public DbSet<Matchup> Matchups { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<ChatReadStatus> ChatReadStatuses { get; set; }
        public DbSet<Player> Players { get; set; }
        public DbSet<Transaction> Transactions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Username)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.Email)
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(e => e.Password)
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(e => e.FirstName)
                    .HasMaxLength(50);
                    
                entity.Property(e => e.LastName)
                    .HasMaxLength(50);
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.IsActive)
                    .IsRequired()
                    .HasDefaultValue(true);
                
                // Create unique indexes
                entity.HasIndex(e => e.Username)
                    .IsUnique();
                    
                entity.HasIndex(e => e.Email)
                    .IsUnique();
                    
                // Configure relationship with League
                entity.HasOne(e => e.League)
                    .WithMany(l => l.Users)
                    .HasForeignKey(e => e.LeagueId)
                    .IsRequired(false);
            });

            // Configure League entity
            modelBuilder.Entity<League>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(e => e.Description)
                    .HasMaxLength(500);
                    
                entity.Property(e => e.JoinCode)
                    .IsRequired()
                    .HasMaxLength(20);
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.IsActive)
                    .IsRequired()
                    .HasDefaultValue(true);
                    
                entity.Property(e => e.MaxPlayers)
                    .IsRequired()
                    .HasDefaultValue(10);
                
                // Create unique index for join code
                entity.HasIndex(e => e.JoinCode)
                    .IsUnique();
                    
                // Configure relationship with creator
                entity.HasOne(e => e.CreatedBy)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedById)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Restrict);
            });

            // Configure TeamStats entity
            modelBuilder.Entity<TeamStats>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.PointsFor)
                    .HasPrecision(10, 2)
                    .HasDefaultValue(0);
                    
                entity.Property(e => e.PointsAgainst)
                    .HasPrecision(10, 2)
                    .HasDefaultValue(0);
                    
                entity.Property(e => e.LastUpdated)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Configure relationship with User (one-to-one)
                entity.HasOne(e => e.User)
                    .WithOne(u => u.TeamStats)
                    .HasForeignKey<TeamStats>(e => e.UserId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Configure relationship with League
                entity.HasOne(e => e.League)
                    .WithMany(l => l.TeamStats)
                    .HasForeignKey(e => e.LeagueId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Create unique index for user-league combination
                entity.HasIndex(e => new { e.UserId, e.LeagueId })
                    .IsUnique();
            });

            // Configure Draft entity
            modelBuilder.Entity<Draft>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.DraftOrder)
                    .IsRequired()
                    .HasMaxLength(1000);
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Configure relationship with League (one-to-one)
                entity.HasOne(e => e.League)
                    .WithMany()
                    .HasForeignKey(e => e.LeagueId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Create unique index for league (one draft per league)
                entity.HasIndex(e => e.LeagueId)
                    .IsUnique();
            });

            // Configure DraftPick entity
            modelBuilder.Entity<DraftPick>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.PlayerName)
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(e => e.PlayerPosition)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.PlayerTeam)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.PlayerLeague)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.PickedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Configure relationship with Draft
                entity.HasOne(e => e.Draft)
                    .WithMany(d => d.DraftPicks)
                    .HasForeignKey(e => e.DraftId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Configure relationship with User
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Restrict);
                    
                // Create unique index for pick number within draft
                entity.HasIndex(e => new { e.DraftId, e.PickNumber })
                    .IsUnique();
            });

            // Configure UserRoster entity
            modelBuilder.Entity<UserRoster>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.PlayerName)
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(e => e.PlayerPosition)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.PlayerTeam)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.PlayerLeague)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.DraftedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Configure relationship with User
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Configure relationship with League
                entity.HasOne(e => e.League)
                    .WithMany()
                    .HasForeignKey(e => e.LeagueId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Configure relationship with Draft
                entity.HasOne(e => e.Draft)
                    .WithMany()
                    .HasForeignKey(e => e.DraftId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Create unique index to prevent duplicate players for same user in same draft
                entity.HasIndex(e => new { e.UserId, e.DraftId, e.PlayerName })
                    .IsUnique();
            });

            // Configure Season entity
            modelBuilder.Entity<Season>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Sport)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.Year)
                    .IsRequired();
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Configure relationship with League
                entity.HasOne(e => e.League)
                    .WithMany()
                    .HasForeignKey(e => e.LeagueId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Create unique index for league-sport-year combination
                entity.HasIndex(e => new { e.LeagueId, e.Sport, e.Year })
                    .IsUnique();
            });

            // Configure Week entity
            modelBuilder.Entity<Week>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.WeekNumber)
                    .IsRequired();
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Configure relationship with Season
                entity.HasOne(e => e.Season)
                    .WithMany(s => s.Weeks)
                    .HasForeignKey(e => e.SeasonId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Create unique index for season-week combination
                entity.HasIndex(e => new { e.SeasonId, e.WeekNumber })
                    .IsUnique();
            });

            // Configure Matchup entity
            modelBuilder.Entity<Matchup>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Status)
                    .HasMaxLength(20)
                    .HasDefaultValue("upcoming");
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Configure relationship with Week
                entity.HasOne(e => e.Week)
                    .WithMany(w => w.Matchups)
                    .HasForeignKey(e => e.WeekId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Configure relationship with Home Team
                entity.HasOne(e => e.HomeTeam)
                    .WithMany()
                    .HasForeignKey(e => e.HomeTeamId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Restrict);
                    
                // Configure relationship with Away Team
                entity.HasOne(e => e.AwayTeam)
                    .WithMany()
                    .HasForeignKey(e => e.AwayTeamId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Restrict);
                    
                // Create unique index to prevent duplicate matchups in same week
                entity.HasIndex(e => new { e.WeekId, e.HomeTeamId, e.AwayTeamId })
                    .IsUnique();
            });

            // Configure ChatMessage entity
            modelBuilder.Entity<ChatMessage>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Message)
                    .IsRequired()
                    .HasMaxLength(1000);
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.IsDeleted)
                    .IsRequired()
                    .HasDefaultValue(false);
                
                // Configure relationship with League
                entity.HasOne(e => e.League)
                    .WithMany()
                    .HasForeignKey(e => e.LeagueId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Configure relationship with User
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Restrict);
                    
                // Create index for efficient querying
                entity.HasIndex(e => new { e.LeagueId, e.CreatedAt });
            });

            // Configure ChatReadStatus entity
            modelBuilder.Entity<ChatReadStatus>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.LastReadAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Configure relationship with User
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Configure relationship with League
                entity.HasOne(e => e.League)
                    .WithMany()
                    .HasForeignKey(e => e.LeagueId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Configure relationship with LastReadMessage
                entity.HasOne(e => e.LastReadMessage)
                    .WithMany()
                    .HasForeignKey(e => e.LastReadMessageId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Restrict);
                    
                // Create unique index for user-league combination
                entity.HasIndex(e => new { e.UserId, e.LeagueId })
                    .IsUnique();
            });

            // Configure Player entity
            modelBuilder.Entity<Player>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(e => e.Position)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.Team)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.League)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.UpdatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Create index for efficient searching
                entity.HasIndex(e => new { e.Name, e.League });
                entity.HasIndex(e => e.League);
            });

            // Configure Transaction entity
            modelBuilder.Entity<Transaction>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Type)
                    .IsRequired()
                    .HasConversion<string>();
                    
                entity.Property(e => e.Description)
                    .IsRequired()
                    .HasMaxLength(500);
                    
                entity.Property(e => e.PlayerName)
                    .HasMaxLength(100);
                    
                entity.Property(e => e.PlayerPosition)
                    .HasMaxLength(10);
                    
                entity.Property(e => e.PlayerTeam)
                    .HasMaxLength(50);
                    
                entity.Property(e => e.PlayerLeague)
                    .HasMaxLength(10);
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Configure relationship with League
                entity.HasOne(e => e.League)
                    .WithMany()
                    .HasForeignKey(e => e.LeagueId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Configure relationship with User
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Restrict);
                    
                // Configure relationship with RelatedTransaction (for trades)
                entity.HasOne(e => e.RelatedTransaction)
                    .WithMany()
                    .HasForeignKey(e => e.RelatedTransactionId)
                    .IsRequired(false)
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Restrict);
                    
                // Create index for efficient querying
                entity.HasIndex(e => new { e.LeagueId, e.CreatedAt });
                entity.HasIndex(e => e.Type);
            });
        }
    }
}