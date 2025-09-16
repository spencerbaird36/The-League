using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBettingAndTokenSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Selection",
                table: "GameBets");

            migrationBuilder.RenameColumn(
                name: "Selection",
                table: "MatchupBets",
                newName: "LeagueId");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "MatchupBets",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "CreatedByAdminId",
                table: "MatchupBets",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "MatchupBets",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "MatchupBets",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Team1MoneylineOdds",
                table: "MatchupBets",
                type: "numeric(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Team2MoneylineOdds",
                table: "MatchupBets",
                type: "numeric(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CreatedByAdminId",
                table: "GameBets",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "GameBets",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LeagueId",
                table: "GameBets",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "GameSelection",
                table: "Bets",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MatchupSelection",
                table: "Bets",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BettingNotifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    BetId = table.Column<int>(type: "integer", nullable: true),
                    MatchupBetId = table.Column<int>(type: "integer", nullable: true),
                    GameBetId = table.Column<int>(type: "integer", nullable: true),
                    ActionUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ActionText = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Metadata = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BettingNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BettingNotifications_Bets_BetId",
                        column: x => x.BetId,
                        principalTable: "Bets",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BettingNotifications_GameBets_GameBetId",
                        column: x => x.GameBetId,
                        principalTable: "GameBets",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BettingNotifications_MatchupBets_MatchupBetId",
                        column: x => x.MatchupBetId,
                        principalTable: "MatchupBets",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BettingNotifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MatchupBets_CreatedByAdminId",
                table: "MatchupBets",
                column: "CreatedByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_MatchupBets_LeagueId",
                table: "MatchupBets",
                column: "LeagueId");

            migrationBuilder.CreateIndex(
                name: "IX_GameBets_CreatedByAdminId",
                table: "GameBets",
                column: "CreatedByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_GameBets_LeagueId",
                table: "GameBets",
                column: "LeagueId");

            migrationBuilder.CreateIndex(
                name: "IX_BettingNotifications_BetId",
                table: "BettingNotifications",
                column: "BetId");

            migrationBuilder.CreateIndex(
                name: "IX_BettingNotifications_GameBetId",
                table: "BettingNotifications",
                column: "GameBetId");

            migrationBuilder.CreateIndex(
                name: "IX_BettingNotifications_MatchupBetId",
                table: "BettingNotifications",
                column: "MatchupBetId");

            migrationBuilder.CreateIndex(
                name: "IX_BettingNotifications_UserId",
                table: "BettingNotifications",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_GameBets_Leagues_LeagueId",
                table: "GameBets",
                column: "LeagueId",
                principalTable: "Leagues",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_GameBets_Users_CreatedByAdminId",
                table: "GameBets",
                column: "CreatedByAdminId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchupBets_Leagues_LeagueId",
                table: "MatchupBets",
                column: "LeagueId",
                principalTable: "Leagues",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchupBets_Users_CreatedByAdminId",
                table: "MatchupBets",
                column: "CreatedByAdminId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GameBets_Leagues_LeagueId",
                table: "GameBets");

            migrationBuilder.DropForeignKey(
                name: "FK_GameBets_Users_CreatedByAdminId",
                table: "GameBets");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchupBets_Leagues_LeagueId",
                table: "MatchupBets");

            migrationBuilder.DropForeignKey(
                name: "FK_MatchupBets_Users_CreatedByAdminId",
                table: "MatchupBets");

            migrationBuilder.DropTable(
                name: "BettingNotifications");

            migrationBuilder.DropIndex(
                name: "IX_MatchupBets_CreatedByAdminId",
                table: "MatchupBets");

            migrationBuilder.DropIndex(
                name: "IX_MatchupBets_LeagueId",
                table: "MatchupBets");

            migrationBuilder.DropIndex(
                name: "IX_GameBets_CreatedByAdminId",
                table: "GameBets");

            migrationBuilder.DropIndex(
                name: "IX_GameBets_LeagueId",
                table: "GameBets");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "MatchupBets");

            migrationBuilder.DropColumn(
                name: "CreatedByAdminId",
                table: "MatchupBets");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "MatchupBets");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "MatchupBets");

            migrationBuilder.DropColumn(
                name: "Team1MoneylineOdds",
                table: "MatchupBets");

            migrationBuilder.DropColumn(
                name: "Team2MoneylineOdds",
                table: "MatchupBets");

            migrationBuilder.DropColumn(
                name: "CreatedByAdminId",
                table: "GameBets");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "GameBets");

            migrationBuilder.DropColumn(
                name: "LeagueId",
                table: "GameBets");

            migrationBuilder.DropColumn(
                name: "GameSelection",
                table: "Bets");

            migrationBuilder.DropColumn(
                name: "MatchupSelection",
                table: "Bets");

            migrationBuilder.RenameColumn(
                name: "LeagueId",
                table: "MatchupBets",
                newName: "Selection");

            migrationBuilder.AddColumn<string>(
                name: "Selection",
                table: "GameBets",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
