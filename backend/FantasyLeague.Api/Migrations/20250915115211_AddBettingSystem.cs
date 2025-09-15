using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBettingSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GameBets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExternalGameId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Sport = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    HomeTeam = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AwayTeam = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    GameDateTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Week = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Season = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    PointSpread = table.Column<decimal>(type: "numeric(6,1)", precision: 6, scale: 1, nullable: true),
                    OverUnderLine = table.Column<decimal>(type: "numeric(6,1)", precision: 6, scale: 1, nullable: true),
                    HomeMoneylineOdds = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    AwayMoneylineOdds = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    OverOdds = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    UnderOdds = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    Selection = table.Column<string>(type: "text", nullable: false),
                    HomeScore = table.Column<int>(type: "integer", nullable: true),
                    AwayScore = table.Column<int>(type: "integer", nullable: true),
                    GameStatus = table.Column<string>(type: "text", nullable: false, defaultValue: "Scheduled"),
                    IsSettled = table.Column<bool>(type: "boolean", nullable: false),
                    SettledAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    ExternalDataSource = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LastExternalUpdate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameBets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MatchupBets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Week = table.Column<int>(type: "integer", nullable: false),
                    Season = table.Column<int>(type: "integer", nullable: false),
                    Sport = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Team1UserId = table.Column<int>(type: "integer", nullable: false),
                    Team2UserId = table.Column<int>(type: "integer", nullable: false),
                    PointSpread = table.Column<decimal>(type: "numeric(6,1)", precision: 6, scale: 1, nullable: true),
                    OverUnderLine = table.Column<decimal>(type: "numeric(6,1)", precision: 6, scale: 1, nullable: true),
                    Selection = table.Column<int>(type: "integer", nullable: false),
                    Team1Score = table.Column<decimal>(type: "numeric(6,1)", precision: 6, scale: 1, nullable: true),
                    Team2Score = table.Column<decimal>(type: "numeric(6,1)", precision: 6, scale: 1, nullable: true),
                    TotalScore = table.Column<decimal>(type: "numeric(6,1)", precision: 6, scale: 1, nullable: true),
                    IsSettled = table.Column<bool>(type: "boolean", nullable: false),
                    SettledAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    WinnerUserId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchupBets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MatchupBets_Users_Team1UserId",
                        column: x => x.Team1UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MatchupBets_Users_Team2UserId",
                        column: x => x.Team2UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MatchupBets_Users_WinnerUserId",
                        column: x => x.WinnerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Bets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    LeagueId = table.Column<int>(type: "integer", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PotentialPayout = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Odds = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false, defaultValue: "Active"),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    SettledAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TokenTransactionId = table.Column<int>(type: "integer", nullable: false),
                    MatchupBetId = table.Column<int>(type: "integer", nullable: true),
                    GameBetId = table.Column<int>(type: "integer", nullable: true),
                    SettledByAdminId = table.Column<int>(type: "integer", nullable: true),
                    SettlementNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Bets_GameBets_GameBetId",
                        column: x => x.GameBetId,
                        principalTable: "GameBets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Bets_Leagues_LeagueId",
                        column: x => x.LeagueId,
                        principalTable: "Leagues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Bets_MatchupBets_MatchupBetId",
                        column: x => x.MatchupBetId,
                        principalTable: "MatchupBets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Bets_TokenTransactions_TokenTransactionId",
                        column: x => x.TokenTransactionId,
                        principalTable: "TokenTransactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Bets_Users_SettledByAdminId",
                        column: x => x.SettledByAdminId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Bets_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BettingLines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Type = table.Column<string>(type: "text", nullable: false),
                    MatchupBetId = table.Column<int>(type: "integer", nullable: true),
                    GameBetId = table.Column<int>(type: "integer", nullable: true),
                    PointSpread = table.Column<decimal>(type: "numeric(6,1)", precision: 6, scale: 1, nullable: true),
                    OverUnderLine = table.Column<decimal>(type: "numeric(6,1)", precision: 6, scale: 1, nullable: true),
                    FavoriteOdds = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    UnderdogOdds = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    OverOdds = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    UnderOdds = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedByAdminId = table.Column<int>(type: "integer", nullable: false),
                    MinBetAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    MaxBetAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    MaxTotalExposure = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    CurrentExposure = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0.00m),
                    BetCount = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BettingLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BettingLines_GameBets_GameBetId",
                        column: x => x.GameBetId,
                        principalTable: "GameBets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BettingLines_MatchupBets_MatchupBetId",
                        column: x => x.MatchupBetId,
                        principalTable: "MatchupBets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BettingLines_Users_CreatedByAdminId",
                        column: x => x.CreatedByAdminId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Bets_GameBetId",
                table: "Bets",
                column: "GameBetId");

            migrationBuilder.CreateIndex(
                name: "IX_Bets_LeagueId",
                table: "Bets",
                column: "LeagueId");

            migrationBuilder.CreateIndex(
                name: "IX_Bets_MatchupBetId",
                table: "Bets",
                column: "MatchupBetId");

            migrationBuilder.CreateIndex(
                name: "IX_Bets_SettledByAdminId",
                table: "Bets",
                column: "SettledByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_Bets_Status",
                table: "Bets",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Bets_Status_ExpiresAt",
                table: "Bets",
                columns: new[] { "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Bets_TokenTransactionId",
                table: "Bets",
                column: "TokenTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_Bets_Type",
                table: "Bets",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_Bets_UserId_CreatedAt",
                table: "Bets",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BettingLines_CreatedByAdminId",
                table: "BettingLines",
                column: "CreatedByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_BettingLines_GameBetId",
                table: "BettingLines",
                column: "GameBetId");

            migrationBuilder.CreateIndex(
                name: "IX_BettingLines_IsActive",
                table: "BettingLines",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_BettingLines_IsActive_ExpiresAt",
                table: "BettingLines",
                columns: new[] { "IsActive", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BettingLines_MatchupBetId",
                table: "BettingLines",
                column: "MatchupBetId");

            migrationBuilder.CreateIndex(
                name: "IX_BettingLines_Type",
                table: "BettingLines",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_GameBets_ExternalGameId",
                table: "GameBets",
                column: "ExternalGameId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GameBets_GameStatus",
                table: "GameBets",
                column: "GameStatus");

            migrationBuilder.CreateIndex(
                name: "IX_GameBets_IsSettled",
                table: "GameBets",
                column: "IsSettled");

            migrationBuilder.CreateIndex(
                name: "IX_GameBets_Sport_GameDateTime",
                table: "GameBets",
                columns: new[] { "Sport", "GameDateTime" });

            migrationBuilder.CreateIndex(
                name: "IX_MatchupBets_IsSettled",
                table: "MatchupBets",
                column: "IsSettled");

            migrationBuilder.CreateIndex(
                name: "IX_MatchupBets_Team1UserId_Team2UserId",
                table: "MatchupBets",
                columns: new[] { "Team1UserId", "Team2UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_MatchupBets_Team2UserId",
                table: "MatchupBets",
                column: "Team2UserId");

            migrationBuilder.CreateIndex(
                name: "IX_MatchupBets_Week_Season_Sport",
                table: "MatchupBets",
                columns: new[] { "Week", "Season", "Sport" });

            migrationBuilder.CreateIndex(
                name: "IX_MatchupBets_WinnerUserId",
                table: "MatchupBets",
                column: "WinnerUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Bets");

            migrationBuilder.DropTable(
                name: "BettingLines");

            migrationBuilder.DropTable(
                name: "GameBets");

            migrationBuilder.DropTable(
                name: "MatchupBets");
        }
    }
}
