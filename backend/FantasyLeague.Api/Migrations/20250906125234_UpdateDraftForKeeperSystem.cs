using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDraftForKeeperSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Drafts_LeagueId",
                table: "Drafts");

            migrationBuilder.AddColumn<string>(
                name: "DraftType",
                table: "Drafts",
                type: "text",
                nullable: false,
                defaultValue: "Keeper");

            migrationBuilder.AddColumn<int>(
                name: "MaxPicks",
                table: "Drafts",
                type: "integer",
                nullable: false,
                defaultValue: 15);

            migrationBuilder.AddColumn<int>(
                name: "MaxPicksPerSport",
                table: "Drafts",
                type: "integer",
                nullable: false,
                defaultValue: 5);

            migrationBuilder.AddColumn<string>(
                name: "SportType",
                table: "Drafts",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsKeeperPick",
                table: "DraftPicks",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Drafts_LeagueId_DraftType_SportType",
                table: "Drafts",
                columns: new[] { "LeagueId", "DraftType", "SportType" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Drafts_LeagueId_DraftType_SportType",
                table: "Drafts");

            migrationBuilder.DropColumn(
                name: "DraftType",
                table: "Drafts");

            migrationBuilder.DropColumn(
                name: "MaxPicks",
                table: "Drafts");

            migrationBuilder.DropColumn(
                name: "MaxPicksPerSport",
                table: "Drafts");

            migrationBuilder.DropColumn(
                name: "SportType",
                table: "Drafts");

            migrationBuilder.DropColumn(
                name: "IsKeeperPick",
                table: "DraftPicks");

            migrationBuilder.CreateIndex(
                name: "IX_Drafts_LeagueId",
                table: "Drafts",
                column: "LeagueId",
                unique: true);
        }
    }
}
