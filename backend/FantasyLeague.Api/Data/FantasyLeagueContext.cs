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
        }
    }
}