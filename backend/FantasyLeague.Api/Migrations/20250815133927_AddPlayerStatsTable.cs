using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPlayerStatsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Players",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Position = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Team = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    League = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PassingYards = table.Column<int>(type: "integer", nullable: true),
                    PassingTouchdowns = table.Column<int>(type: "integer", nullable: true),
                    Interceptions = table.Column<int>(type: "integer", nullable: true),
                    RushingYards = table.Column<int>(type: "integer", nullable: true),
                    RushingTouchdowns = table.Column<int>(type: "integer", nullable: true),
                    ReceivingYards = table.Column<int>(type: "integer", nullable: true),
                    ReceivingTouchdowns = table.Column<int>(type: "integer", nullable: true),
                    Receptions = table.Column<int>(type: "integer", nullable: true),
                    PointsPerGame = table.Column<double>(type: "double precision", nullable: true),
                    ReboundsPerGame = table.Column<double>(type: "double precision", nullable: true),
                    AssistsPerGame = table.Column<double>(type: "double precision", nullable: true),
                    FieldGoalPercentage = table.Column<double>(type: "double precision", nullable: true),
                    ThreePointPercentage = table.Column<double>(type: "double precision", nullable: true),
                    FreeThrowPercentage = table.Column<double>(type: "double precision", nullable: true),
                    StealsPerGame = table.Column<double>(type: "double precision", nullable: true),
                    BlocksPerGame = table.Column<double>(type: "double precision", nullable: true),
                    BattingAverage = table.Column<double>(type: "double precision", nullable: true),
                    HomeRuns = table.Column<int>(type: "integer", nullable: true),
                    RunsBattedIn = table.Column<int>(type: "integer", nullable: true),
                    Runs = table.Column<int>(type: "integer", nullable: true),
                    Hits = table.Column<int>(type: "integer", nullable: true),
                    StolenBases = table.Column<int>(type: "integer", nullable: true),
                    EarnedRunAverage = table.Column<double>(type: "double precision", nullable: true),
                    Wins = table.Column<int>(type: "integer", nullable: true),
                    Losses = table.Column<int>(type: "integer", nullable: true),
                    Strikeouts = table.Column<int>(type: "integer", nullable: true),
                    Saves = table.Column<int>(type: "integer", nullable: true),
                    WHIP = table.Column<double>(type: "double precision", nullable: true),
                    GamesPlayed = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Players", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Players_League",
                table: "Players",
                column: "League");

            migrationBuilder.CreateIndex(
                name: "IX_Players_Name_League",
                table: "Players",
                columns: new[] { "Name", "League" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Players");
        }
    }
}
