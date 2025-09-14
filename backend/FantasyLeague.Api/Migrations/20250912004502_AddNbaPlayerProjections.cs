using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNbaPlayerProjections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NbaPlayerProjections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerID = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Team = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Position = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    FieldGoalsMade = table.Column<double>(type: "double precision", nullable: false),
                    FieldGoalsPercentage = table.Column<double>(type: "double precision", nullable: false),
                    ThreePointersMade = table.Column<double>(type: "double precision", nullable: false),
                    FreeThrowsMade = table.Column<double>(type: "double precision", nullable: false),
                    Rebounds = table.Column<double>(type: "double precision", nullable: false),
                    Assists = table.Column<double>(type: "double precision", nullable: false),
                    Steals = table.Column<double>(type: "double precision", nullable: false),
                    BlockedShots = table.Column<double>(type: "double precision", nullable: false),
                    Turnovers = table.Column<double>(type: "double precision", nullable: false),
                    Points = table.Column<double>(type: "double precision", nullable: false),
                    FantasyPointsYahoo = table.Column<double>(type: "double precision", nullable: false),
                    Season = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    LastSyncedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NbaPlayerProjections", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NbaPlayerProjections_Name_Season",
                table: "NbaPlayerProjections",
                columns: new[] { "Name", "Season" });

            migrationBuilder.CreateIndex(
                name: "IX_NbaPlayerProjections_PlayerID",
                table: "NbaPlayerProjections",
                column: "PlayerID");

            migrationBuilder.CreateIndex(
                name: "IX_NbaPlayerProjections_PlayerID_Season",
                table: "NbaPlayerProjections",
                columns: new[] { "PlayerID", "Season" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NbaPlayerProjections_Position",
                table: "NbaPlayerProjections",
                column: "Position");

            migrationBuilder.CreateIndex(
                name: "IX_NbaPlayerProjections_Season",
                table: "NbaPlayerProjections",
                column: "Season");

            migrationBuilder.CreateIndex(
                name: "IX_NbaPlayerProjections_Team",
                table: "NbaPlayerProjections",
                column: "Team");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NbaPlayerProjections");
        }
    }
}
