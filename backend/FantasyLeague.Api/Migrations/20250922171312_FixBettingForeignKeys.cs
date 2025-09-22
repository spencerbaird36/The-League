using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixBettingForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BettingNotifications_Bets_BetId",
                table: "BettingNotifications");

            migrationBuilder.DropForeignKey(
                name: "FK_BettingNotifications_GameBets_GameBetId",
                table: "BettingNotifications");

            migrationBuilder.DropForeignKey(
                name: "FK_BettingNotifications_Leagues_LeagueId",
                table: "BettingNotifications");

            migrationBuilder.DropForeignKey(
                name: "FK_BettingNotifications_MatchupBets_MatchupBetId",
                table: "BettingNotifications");

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

            migrationBuilder.DropIndex(
                name: "IX_MatchupBets_LeagueId",
                table: "MatchupBets");

            migrationBuilder.DropIndex(
                name: "IX_MatchupBets_Week_Season_Sport",
                table: "MatchupBets");

            migrationBuilder.DropIndex(
                name: "IX_GameBets_LeagueId",
                table: "GameBets");

            migrationBuilder.DropIndex(
                name: "IX_GameBets_Sport_GameDateTime",
                table: "GameBets");

            migrationBuilder.DropIndex(
                name: "IX_BettingNotifications_UserId",
                table: "BettingNotifications");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "MatchupBets",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "BettingNotifications",
                type: "text",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Priority",
                table: "BettingNotifications",
                type: "text",
                nullable: false,
                defaultValue: "Normal",
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<bool>(
                name: "IsRead",
                table: "BettingNotifications",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "BettingNotifications",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.CreateIndex(
                name: "IX_MatchupBets_ExpiresAt",
                table: "MatchupBets",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_MatchupBets_LeagueId_Week_Season_Sport",
                table: "MatchupBets",
                columns: new[] { "LeagueId", "Week", "Season", "Sport" });

            migrationBuilder.CreateIndex(
                name: "IX_GameBets_ExpiresAt",
                table: "GameBets",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_GameBets_LeagueId_Sport_GameDateTime",
                table: "GameBets",
                columns: new[] { "LeagueId", "Sport", "GameDateTime" });

            migrationBuilder.CreateIndex(
                name: "IX_BettingNotifications_IsRead_ExpiresAt",
                table: "BettingNotifications",
                columns: new[] { "IsRead", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BettingNotifications_Priority",
                table: "BettingNotifications",
                column: "Priority");

            migrationBuilder.CreateIndex(
                name: "IX_BettingNotifications_Type",
                table: "BettingNotifications",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_BettingNotifications_UserId_CreatedAt",
                table: "BettingNotifications",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BettingNotifications_UserId_IsRead",
                table: "BettingNotifications",
                columns: new[] { "UserId", "IsRead" });

            migrationBuilder.AddForeignKey(
                name: "FK_BettingNotifications_Bets_BetId",
                table: "BettingNotifications",
                column: "BetId",
                principalTable: "Bets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BettingNotifications_GameBets_GameBetId",
                table: "BettingNotifications",
                column: "GameBetId",
                principalTable: "GameBets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BettingNotifications_Leagues_LeagueId",
                table: "BettingNotifications",
                column: "LeagueId",
                principalTable: "Leagues",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_BettingNotifications_MatchupBets_MatchupBetId",
                table: "BettingNotifications",
                column: "MatchupBetId",
                principalTable: "MatchupBets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_GameBets_Leagues_LeagueId",
                table: "GameBets",
                column: "LeagueId",
                principalTable: "Leagues",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_GameBets_Users_CreatedByAdminId",
                table: "GameBets",
                column: "CreatedByAdminId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchupBets_Leagues_LeagueId",
                table: "MatchupBets",
                column: "LeagueId",
                principalTable: "Leagues",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MatchupBets_Users_CreatedByAdminId",
                table: "MatchupBets",
                column: "CreatedByAdminId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BettingNotifications_Bets_BetId",
                table: "BettingNotifications");

            migrationBuilder.DropForeignKey(
                name: "FK_BettingNotifications_GameBets_GameBetId",
                table: "BettingNotifications");

            migrationBuilder.DropForeignKey(
                name: "FK_BettingNotifications_Leagues_LeagueId",
                table: "BettingNotifications");

            migrationBuilder.DropForeignKey(
                name: "FK_BettingNotifications_MatchupBets_MatchupBetId",
                table: "BettingNotifications");

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

            migrationBuilder.DropIndex(
                name: "IX_MatchupBets_ExpiresAt",
                table: "MatchupBets");

            migrationBuilder.DropIndex(
                name: "IX_MatchupBets_LeagueId_Week_Season_Sport",
                table: "MatchupBets");

            migrationBuilder.DropIndex(
                name: "IX_GameBets_ExpiresAt",
                table: "GameBets");

            migrationBuilder.DropIndex(
                name: "IX_GameBets_LeagueId_Sport_GameDateTime",
                table: "GameBets");

            migrationBuilder.DropIndex(
                name: "IX_BettingNotifications_IsRead_ExpiresAt",
                table: "BettingNotifications");

            migrationBuilder.DropIndex(
                name: "IX_BettingNotifications_Priority",
                table: "BettingNotifications");

            migrationBuilder.DropIndex(
                name: "IX_BettingNotifications_Type",
                table: "BettingNotifications");

            migrationBuilder.DropIndex(
                name: "IX_BettingNotifications_UserId_CreatedAt",
                table: "BettingNotifications");

            migrationBuilder.DropIndex(
                name: "IX_BettingNotifications_UserId_IsRead",
                table: "BettingNotifications");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "MatchupBets",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<int>(
                name: "Type",
                table: "BettingNotifications",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<int>(
                name: "Priority",
                table: "BettingNotifications",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "Normal");

            migrationBuilder.AlterColumn<bool>(
                name: "IsRead",
                table: "BettingNotifications",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "BettingNotifications",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.CreateIndex(
                name: "IX_MatchupBets_LeagueId",
                table: "MatchupBets",
                column: "LeagueId");

            migrationBuilder.CreateIndex(
                name: "IX_MatchupBets_Week_Season_Sport",
                table: "MatchupBets",
                columns: new[] { "Week", "Season", "Sport" });

            migrationBuilder.CreateIndex(
                name: "IX_GameBets_LeagueId",
                table: "GameBets",
                column: "LeagueId");

            migrationBuilder.CreateIndex(
                name: "IX_GameBets_Sport_GameDateTime",
                table: "GameBets",
                columns: new[] { "Sport", "GameDateTime" });

            migrationBuilder.CreateIndex(
                name: "IX_BettingNotifications_UserId",
                table: "BettingNotifications",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_BettingNotifications_Bets_BetId",
                table: "BettingNotifications",
                column: "BetId",
                principalTable: "Bets",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BettingNotifications_GameBets_GameBetId",
                table: "BettingNotifications",
                column: "GameBetId",
                principalTable: "GameBets",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BettingNotifications_Leagues_LeagueId",
                table: "BettingNotifications",
                column: "LeagueId",
                principalTable: "Leagues",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BettingNotifications_MatchupBets_MatchupBetId",
                table: "BettingNotifications",
                column: "MatchupBetId",
                principalTable: "MatchupBets",
                principalColumn: "Id");

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
    }
}
