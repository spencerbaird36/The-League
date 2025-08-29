using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddScoringSettingsAndPlayerStatsFixed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PlayerWeeklyStats",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PlayerName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Position = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Team = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    League = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Season = table.Column<int>(type: "integer", nullable: false),
                    Week = table.Column<int>(type: "integer", nullable: false),
                    PassingYards = table.Column<int>(type: "integer", nullable: false),
                    PassingTouchdowns = table.Column<int>(type: "integer", nullable: false),
                    PassingInterceptions = table.Column<int>(type: "integer", nullable: false),
                    PassingAttempts = table.Column<int>(type: "integer", nullable: false),
                    PassingCompletions = table.Column<int>(type: "integer", nullable: false),
                    PassingTwoPointConversions = table.Column<int>(type: "integer", nullable: false),
                    RushingYards = table.Column<int>(type: "integer", nullable: false),
                    RushingTouchdowns = table.Column<int>(type: "integer", nullable: false),
                    RushingAttempts = table.Column<int>(type: "integer", nullable: false),
                    RushingTwoPointConversions = table.Column<int>(type: "integer", nullable: false),
                    ReceivingYards = table.Column<int>(type: "integer", nullable: false),
                    ReceivingTouchdowns = table.Column<int>(type: "integer", nullable: false),
                    Receptions = table.Column<int>(type: "integer", nullable: false),
                    Targets = table.Column<int>(type: "integer", nullable: false),
                    ReceivingTwoPointConversions = table.Column<int>(type: "integer", nullable: false),
                    FumblesLost = table.Column<int>(type: "integer", nullable: false),
                    FumblesTotal = table.Column<int>(type: "integer", nullable: false),
                    ExtraPointsMade = table.Column<int>(type: "integer", nullable: false),
                    ExtraPointsAttempted = table.Column<int>(type: "integer", nullable: false),
                    FieldGoalsMade0to39 = table.Column<int>(type: "integer", nullable: false),
                    FieldGoalsAttempted0to39 = table.Column<int>(type: "integer", nullable: false),
                    FieldGoalsMade40to49 = table.Column<int>(type: "integer", nullable: false),
                    FieldGoalsAttempted40to49 = table.Column<int>(type: "integer", nullable: false),
                    FieldGoalsMade50Plus = table.Column<int>(type: "integer", nullable: false),
                    FieldGoalsAttempted50Plus = table.Column<int>(type: "integer", nullable: false),
                    DefensiveTouchdowns = table.Column<int>(type: "integer", nullable: false),
                    Sacks = table.Column<int>(type: "integer", nullable: false),
                    InterceptionsDefense = table.Column<int>(type: "integer", nullable: false),
                    FumbleRecoveries = table.Column<int>(type: "integer", nullable: false),
                    Safeties = table.Column<int>(type: "integer", nullable: false),
                    BlockedKicks = table.Column<int>(type: "integer", nullable: false),
                    PointsAllowed = table.Column<int>(type: "integer", nullable: false),
                    YardsAllowed = table.Column<int>(type: "integer", nullable: false),
                    FantasyPoints = table.Column<decimal>(type: "numeric(8,2)", nullable: false),
                    FantasyPointsPPR = table.Column<decimal>(type: "numeric(8,2)", nullable: false),
                    FantasyPointsHalfPPR = table.Column<decimal>(type: "numeric(8,2)", nullable: false),
                    FantasyPointsStandard = table.Column<decimal>(type: "numeric(8,2)", nullable: false),
                    Opponent = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IsHomeGame = table.Column<bool>(type: "boolean", nullable: false),
                    GameStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Scheduled"),
                    GameDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    DataSource = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerWeeklyStats", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ScoringSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LeagueId = table.Column<int>(type: "integer", nullable: false),
                    Sport = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PassingYardsPerPoint = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    PassingTouchdownPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    PassingInterceptionPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    PassingTwoPointConversion = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    RushingYardsPerPoint = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    RushingTouchdownPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    RushingTwoPointConversion = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    ReceivingYardsPerPoint = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    ReceivingTouchdownPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    ReceptionPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    ReceivingTwoPointConversion = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    FumbleLostPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    ExtraPointPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    FieldGoal0to39Points = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    FieldGoal40to49Points = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    FieldGoal50PlusPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    MissedExtraPointPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    MissedFieldGoalPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    DefenseTouchdownPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    SackPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    InterceptionPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    FumbleRecoveryPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    SafetyPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    BlockedKickPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    DefensePointsAllowed0Points = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    DefensePointsAllowed1to6Points = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    DefensePointsAllowed7to13Points = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    DefensePointsAllowed14to20Points = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    DefensePointsAllowed21to27Points = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    DefensePointsAllowed28to34Points = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    DefensePointsAllowed35PlusPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    BenchPoints = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScoringSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScoringSettings_Leagues_LeagueId",
                        column: x => x.LeagueId,
                        principalTable: "Leagues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlayerWeeklyStats_League_Season_Week",
                table: "PlayerWeeklyStats",
                columns: new[] { "League", "Season", "Week" });

            migrationBuilder.CreateIndex(
                name: "IX_PlayerWeeklyStats_PlayerId_Season_Week",
                table: "PlayerWeeklyStats",
                columns: new[] { "PlayerId", "Season", "Week" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlayerWeeklyStats_PlayerName_Season_Week",
                table: "PlayerWeeklyStats",
                columns: new[] { "PlayerName", "Season", "Week" });

            migrationBuilder.CreateIndex(
                name: "IX_PlayerWeeklyStats_Position",
                table: "PlayerWeeklyStats",
                column: "Position");

            migrationBuilder.CreateIndex(
                name: "IX_PlayerWeeklyStats_Team",
                table: "PlayerWeeklyStats",
                column: "Team");

            migrationBuilder.CreateIndex(
                name: "IX_ScoringSettings_LeagueId_Sport",
                table: "ScoringSettings",
                columns: new[] { "LeagueId", "Sport" },
                unique: true,
                filter: "\"IsActive\" = true");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlayerWeeklyStats");

            migrationBuilder.DropTable(
                name: "ScoringSettings");
        }
    }
}
