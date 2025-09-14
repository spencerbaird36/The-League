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
        public DbSet<ScoringSettings> ScoringSettings { get; set; }
        public DbSet<PlayerWeeklyStats> PlayerWeeklyStats { get; set; }
        public DbSet<TradeProposal> TradeProposals { get; set; }
        public DbSet<TradePlayer> TradePlayers { get; set; }
        public DbSet<TradeNotification> TradeNotifications { get; set; }
        public DbSet<LeagueConfiguration> LeagueConfigurations { get; set; }
        public DbSet<ActiveNflPlayer> ActiveNflPlayers { get; set; }
        public DbSet<ActiveMlbPlayer> ActiveMlbPlayers { get; set; }
        public DbSet<ActiveNbaPlayer> ActiveNbaPlayers { get; set; }
        public DbSet<NflPlayerProjection> NflPlayerProjections { get; set; }
        public DbSet<MlbPlayerProjection> MlbPlayerProjections { get; set; }
        public DbSet<NbaPlayerProjection> NbaPlayerProjections { get; set; }

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
                    
                // Configure relationship with commissioner
                entity.HasOne(e => e.Commissioner)
                    .WithMany()
                    .HasForeignKey(e => e.CommissionerId)
                    .IsRequired(false)
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.SetNull);
                    
                // Configure relationship with configuration (one-to-one)
                entity.HasOne(e => e.Configuration)
                    .WithOne(c => c.League)
                    .HasForeignKey<LeagueConfiguration>(c => c.LeagueId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
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
                    
                entity.Property(e => e.DraftType)
                    .IsRequired()
                    .HasConversion<string>()
                    .HasDefaultValue(DraftType.Keeper);
                    
                entity.Property(e => e.SportType)
                    .HasMaxLength(10);
                    
                entity.Property(e => e.MaxPicks)
                    .IsRequired()
                    .HasDefaultValue(15);
                    
                entity.Property(e => e.MaxPicksPerSport)
                    .IsRequired()
                    .HasDefaultValue(5);
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Configure relationship with League
                entity.HasOne(e => e.League)
                    .WithMany()
                    .HasForeignKey(e => e.LeagueId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Create index for league-drafttype-sport combination (multiple drafts allowed per league)
                entity.HasIndex(e => new { e.LeagueId, e.DraftType, e.SportType });
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
                    
                entity.Property(e => e.IsKeeperPick)
                    .IsRequired()
                    .HasDefaultValue(false);
                    
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

            // Configure ScoringSettings entity
            modelBuilder.Entity<ScoringSettings>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Sport)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.UpdatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.IsActive)
                    .IsRequired()
                    .HasDefaultValue(true);
                
                // Configure relationship with League
                entity.HasOne(e => e.League)
                    .WithMany(l => l.ScoringSettings)
                    .HasForeignKey(e => e.LeagueId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Create unique index for league-sport combination (only one active per league-sport)
                entity.HasIndex(e => new { e.LeagueId, e.Sport })
                    .HasFilter("\"IsActive\" = true")
                    .IsUnique();
            });

            // Configure PlayerWeeklyStats entity
            modelBuilder.Entity<PlayerWeeklyStats>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.PlayerId)
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(e => e.PlayerName)
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
                    
                entity.Property(e => e.GameStatus)
                    .HasMaxLength(20)
                    .HasDefaultValue("Scheduled");
                    
                entity.Property(e => e.Opponent)
                    .HasMaxLength(20);
                    
                entity.Property(e => e.DataSource)
                    .HasMaxLength(50);
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.UpdatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Create unique index for player-season-week combination
                entity.HasIndex(e => new { e.PlayerId, e.Season, e.Week })
                    .IsUnique();
                    
                // Create indexes for efficient querying
                entity.HasIndex(e => new { e.League, e.Season, e.Week });
                entity.HasIndex(e => new { e.PlayerName, e.Season, e.Week });
                entity.HasIndex(e => e.Position);
                entity.HasIndex(e => e.Team);
            });

            // Configure TradeProposal entity
            modelBuilder.Entity<TradeProposal>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Status)
                    .IsRequired()
                    .HasMaxLength(20)
                    .HasDefaultValue("pending");
                    
                entity.Property(e => e.Message)
                    .HasMaxLength(500);
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.UpdatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.ExpiresAt)
                    .IsRequired();
                
                // Configure relationship with League
                entity.HasOne(e => e.League)
                    .WithMany()
                    .HasForeignKey(e => e.LeagueId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Configure relationship with ProposingUser
                entity.HasOne(e => e.ProposingUser)
                    .WithMany()
                    .HasForeignKey(e => e.ProposingUserId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Restrict);
                    
                // Configure relationship with TargetUser
                entity.HasOne(e => e.TargetUser)
                    .WithMany()
                    .HasForeignKey(e => e.TargetUserId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Restrict);
                    
                // Create indexes for efficient querying
                entity.HasIndex(e => new { e.LeagueId, e.Status });
                entity.HasIndex(e => new { e.ProposingUserId, e.Status });
                entity.HasIndex(e => new { e.TargetUserId, e.Status });
                entity.HasIndex(e => e.ExpiresAt);
            });

            // Configure TradePlayer entity
            modelBuilder.Entity<TradePlayer>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.TradeType)
                    .IsRequired()
                    .HasMaxLength(10);
                    
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
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Configure relationship with TradeProposal
                entity.HasOne(e => e.TradeProposal)
                    .WithMany()
                    .HasForeignKey(e => e.TradeProposalId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Configure relationship with UserRoster
                entity.HasOne(e => e.UserRoster)
                    .WithMany()
                    .HasForeignKey(e => e.UserRosterId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Restrict);
                    
                // Configure relationship with User
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Restrict);
                    
                // Create indexes for efficient querying
                entity.HasIndex(e => new { e.TradeProposalId, e.TradeType });
                entity.HasIndex(e => e.UserId);
            });

            // Configure TradeNotification entity
            modelBuilder.Entity<TradeNotification>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.Type)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.Message)
                    .IsRequired()
                    .HasMaxLength(255);
                    
                entity.Property(e => e.IsRead)
                    .IsRequired()
                    .HasDefaultValue(false);
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Configure relationship with User
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Configure relationship with TradeProposal
                entity.HasOne(e => e.TradeProposal)
                    .WithMany(tp => tp.Notifications)
                    .HasForeignKey(e => e.TradeProposalId)
                    .IsRequired()
                    .OnDelete(Microsoft.EntityFrameworkCore.DeleteBehavior.Cascade);
                    
                // Create indexes for efficient querying
                entity.HasIndex(e => new { e.UserId, e.IsRead });
                entity.HasIndex(e => new { e.UserId, e.CreatedAt });
                entity.HasIndex(e => e.TradeProposalId);
            });

            // Configure LeagueConfiguration entity
            modelBuilder.Entity<LeagueConfiguration>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.IncludeNFL)
                    .IsRequired()
                    .HasDefaultValue(true);
                    
                entity.Property(e => e.IncludeMLB)
                    .IsRequired()
                    .HasDefaultValue(false);
                    
                entity.Property(e => e.IncludeNBA)
                    .IsRequired()
                    .HasDefaultValue(false);
                    
                entity.Property(e => e.TotalKeeperSlots)
                    .IsRequired()
                    .HasDefaultValue(15);
                    
                entity.Property(e => e.IsKeeperLeague)
                    .IsRequired()
                    .HasDefaultValue(true);
                    
                entity.Property(e => e.MaxPlayersPerTeam)
                    .IsRequired()
                    .HasDefaultValue(25);
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.UpdatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Create unique index for league (one configuration per league)
                entity.HasIndex(e => e.LeagueId)
                    .IsUnique();
            });

            // Configure ActiveNflPlayer entity
            modelBuilder.Entity<ActiveNflPlayer>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.PlayerID)
                    .IsRequired();
                    
                entity.Property(e => e.Team)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.FirstName)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.LastName)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.FantasyPosition)
                    .IsRequired()
                    .HasMaxLength(5);
                    
                entity.Property(e => e.Age)
                    .IsRequired();
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.UpdatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.LastSyncedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Create unique index for PlayerID (prevent duplicates)
                entity.HasIndex(e => e.PlayerID)
                    .IsUnique();
                    
                // Create indexes for efficient querying
                entity.HasIndex(e => e.Team);
                entity.HasIndex(e => e.FantasyPosition);
                entity.HasIndex(e => new { e.FirstName, e.LastName });
            });

            // Configure ActiveMlbPlayer entity
            modelBuilder.Entity<ActiveMlbPlayer>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.PlayerID)
                    .IsRequired();
                    
                entity.Property(e => e.Team)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.Position)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.FirstName)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.LastName)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.BirthDate)
                    .IsRequired();
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.UpdatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.LastSyncedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Create unique index for PlayerID (prevent duplicates)
                entity.HasIndex(e => e.PlayerID)
                    .IsUnique();
                    
                // Create indexes for efficient querying
                entity.HasIndex(e => e.Team);
                entity.HasIndex(e => e.Position);
                entity.HasIndex(e => new { e.FirstName, e.LastName });
                entity.HasIndex(e => e.BirthDate);
            });

            // Configure ActiveNbaPlayer entity
            modelBuilder.Entity<ActiveNbaPlayer>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.PlayerID)
                    .IsRequired();
                    
                entity.Property(e => e.Team)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.Position)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.FirstName)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.LastName)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.BirthDate)
                    .IsRequired();
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.UpdatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.LastSyncedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Create unique index for PlayerID (prevent duplicates)
                entity.HasIndex(e => e.PlayerID)
                    .IsUnique();
                    
                // Create indexes for efficient querying
                entity.HasIndex(e => e.Team);
                entity.HasIndex(e => e.Position);
                entity.HasIndex(e => new { e.FirstName, e.LastName });
                entity.HasIndex(e => e.BirthDate);
            });

            // Configure NflPlayerProjection entity
            modelBuilder.Entity<NflPlayerProjection>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.PlayerId)
                    .IsRequired();
                    
                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(e => e.Team)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.Position)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.Season)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.Year)
                    .IsRequired();
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.UpdatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.LastSyncedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Create unique index for PlayerId-Season-Year combination (prevent duplicates)
                entity.HasIndex(e => new { e.PlayerId, e.Season, e.Year })
                    .IsUnique();
                    
                // Create indexes for efficient querying
                entity.HasIndex(e => e.PlayerId);
                entity.HasIndex(e => e.Team);
                entity.HasIndex(e => e.Position);
                entity.HasIndex(e => new { e.Name, e.Season, e.Year });
                entity.HasIndex(e => new { e.Season, e.Year });
            });

            // Configure MlbPlayerProjection entity
            modelBuilder.Entity<MlbPlayerProjection>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.PlayerID)
                    .IsRequired();
                    
                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(e => e.Team)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.Position)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.Season)
                    .IsRequired();
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.UpdatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.LastSyncedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Create unique index for PlayerID-Season combination (prevent duplicates)
                entity.HasIndex(e => new { e.PlayerID, e.Season })
                    .IsUnique();
                    
                // Create indexes for efficient querying
                entity.HasIndex(e => e.PlayerID);
                entity.HasIndex(e => e.Team);
                entity.HasIndex(e => e.Position);
                entity.HasIndex(e => new { e.Name, e.Season });
                entity.HasIndex(e => e.Season);
            });

            // Configure NbaPlayerProjection entity
            modelBuilder.Entity<NbaPlayerProjection>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                entity.Property(e => e.PlayerID)
                    .IsRequired();
                    
                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(e => e.Team)
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.Position)
                    .IsRequired()
                    .HasMaxLength(10);
                    
                entity.Property(e => e.Season)
                    .IsRequired();
                    
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.UpdatedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                    
                entity.Property(e => e.LastSyncedAt)
                    .IsRequired()
                    .HasDefaultValueSql("NOW()");
                
                // Create unique index for PlayerID-Season combination (prevent duplicates)
                entity.HasIndex(e => new { e.PlayerID, e.Season })
                    .IsUnique();
                    
                // Create indexes for efficient querying
                entity.HasIndex(e => e.PlayerID);
                entity.HasIndex(e => e.Team);
                entity.HasIndex(e => e.Position);
                entity.HasIndex(e => new { e.Name, e.Season });
                entity.HasIndex(e => e.Season);
            });
        }
    }
}