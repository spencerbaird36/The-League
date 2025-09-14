using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMlbPlayerProjectionsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MlbPlayerProjections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerID = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Team = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Position = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    FantasyPointsYahoo = table.Column<double>(type: "double precision", nullable: false),
                    Runs = table.Column<double>(type: "double precision", nullable: false),
                    Hits = table.Column<double>(type: "double precision", nullable: false),
                    HomeRuns = table.Column<double>(type: "double precision", nullable: false),
                    BattingAverage = table.Column<double>(type: "double precision", nullable: false),
                    RunsBattedIn = table.Column<double>(type: "double precision", nullable: false),
                    Walks = table.Column<double>(type: "double precision", nullable: false),
                    StolenBases = table.Column<double>(type: "double precision", nullable: false),
                    OnBasePlusSlugging = table.Column<double>(type: "double precision", nullable: false),
                    Wins = table.Column<double>(type: "double precision", nullable: false),
                    Losses = table.Column<double>(type: "double precision", nullable: false),
                    Saves = table.Column<double>(type: "double precision", nullable: false),
                    PitchingStrikeouts = table.Column<double>(type: "double precision", nullable: false),
                    WalksHitsPerInningsPitched = table.Column<double>(type: "double precision", nullable: false),
                    Season = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    LastSyncedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MlbPlayerProjections", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MlbPlayerProjections_Name_Season",
                table: "MlbPlayerProjections",
                columns: new[] { "Name", "Season" });

            migrationBuilder.CreateIndex(
                name: "IX_MlbPlayerProjections_PlayerID",
                table: "MlbPlayerProjections",
                column: "PlayerID");

            migrationBuilder.CreateIndex(
                name: "IX_MlbPlayerProjections_PlayerID_Season",
                table: "MlbPlayerProjections",
                columns: new[] { "PlayerID", "Season" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MlbPlayerProjections_Position",
                table: "MlbPlayerProjections",
                column: "Position");

            migrationBuilder.CreateIndex(
                name: "IX_MlbPlayerProjections_Season",
                table: "MlbPlayerProjections",
                column: "Season");

            migrationBuilder.CreateIndex(
                name: "IX_MlbPlayerProjections_Team",
                table: "MlbPlayerProjections",
                column: "Team");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MlbPlayerProjections");
        }
    }
}
