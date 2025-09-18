using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNullableLeagueIdToNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TradePlayers_TradeProposals_TradeProposalId1",
                table: "TradePlayers");

            migrationBuilder.DropForeignKey(
                name: "FK_TradePlayers_TradeProposals_TradeProposalId2",
                table: "TradePlayers");

            migrationBuilder.DropIndex(
                name: "IX_TradePlayers_TradeProposalId1",
                table: "TradePlayers");

            migrationBuilder.DropIndex(
                name: "IX_TradePlayers_TradeProposalId2",
                table: "TradePlayers");

            migrationBuilder.DropColumn(
                name: "TradeProposalId1",
                table: "TradePlayers");

            migrationBuilder.DropColumn(
                name: "TradeProposalId2",
                table: "TradePlayers");

            migrationBuilder.AddColumn<int>(
                name: "LeagueId",
                table: "TradeNotifications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LeagueId",
                table: "BettingNotifications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LeagueId",
                table: "BettingLines",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TradeNotifications_LeagueId",
                table: "TradeNotifications",
                column: "LeagueId");

            migrationBuilder.CreateIndex(
                name: "IX_BettingNotifications_LeagueId",
                table: "BettingNotifications",
                column: "LeagueId");

            migrationBuilder.CreateIndex(
                name: "IX_BettingLines_LeagueId",
                table: "BettingLines",
                column: "LeagueId");

            migrationBuilder.AddForeignKey(
                name: "FK_BettingLines_Leagues_LeagueId",
                table: "BettingLines",
                column: "LeagueId",
                principalTable: "Leagues",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BettingNotifications_Leagues_LeagueId",
                table: "BettingNotifications",
                column: "LeagueId",
                principalTable: "Leagues",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TradeNotifications_Leagues_LeagueId",
                table: "TradeNotifications",
                column: "LeagueId",
                principalTable: "Leagues",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BettingLines_Leagues_LeagueId",
                table: "BettingLines");

            migrationBuilder.DropForeignKey(
                name: "FK_BettingNotifications_Leagues_LeagueId",
                table: "BettingNotifications");

            migrationBuilder.DropForeignKey(
                name: "FK_TradeNotifications_Leagues_LeagueId",
                table: "TradeNotifications");

            migrationBuilder.DropIndex(
                name: "IX_TradeNotifications_LeagueId",
                table: "TradeNotifications");

            migrationBuilder.DropIndex(
                name: "IX_BettingNotifications_LeagueId",
                table: "BettingNotifications");

            migrationBuilder.DropIndex(
                name: "IX_BettingLines_LeagueId",
                table: "BettingLines");

            migrationBuilder.DropColumn(
                name: "LeagueId",
                table: "TradeNotifications");

            migrationBuilder.DropColumn(
                name: "LeagueId",
                table: "BettingNotifications");

            migrationBuilder.DropColumn(
                name: "LeagueId",
                table: "BettingLines");

            migrationBuilder.AddColumn<int>(
                name: "TradeProposalId1",
                table: "TradePlayers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TradeProposalId2",
                table: "TradePlayers",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TradePlayers_TradeProposalId1",
                table: "TradePlayers",
                column: "TradeProposalId1");

            migrationBuilder.CreateIndex(
                name: "IX_TradePlayers_TradeProposalId2",
                table: "TradePlayers",
                column: "TradeProposalId2");

            migrationBuilder.AddForeignKey(
                name: "FK_TradePlayers_TradeProposals_TradeProposalId1",
                table: "TradePlayers",
                column: "TradeProposalId1",
                principalTable: "TradeProposals",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TradePlayers_TradeProposals_TradeProposalId2",
                table: "TradePlayers",
                column: "TradeProposalId2",
                principalTable: "TradeProposals",
                principalColumn: "Id");
        }
    }
}
