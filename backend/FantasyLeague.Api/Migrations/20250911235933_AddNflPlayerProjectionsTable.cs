using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNflPlayerProjectionsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NflPlayerProjections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Team = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Position = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PassingYards = table.Column<double>(type: "double precision", nullable: false),
                    RushingYards = table.Column<double>(type: "double precision", nullable: false),
                    ReceivingYards = table.Column<double>(type: "double precision", nullable: false),
                    FieldGoalsMade = table.Column<double>(type: "double precision", nullable: false),
                    PassingTouchdowns = table.Column<double>(type: "double precision", nullable: false),
                    RushingTouchdowns = table.Column<double>(type: "double precision", nullable: false),
                    ReceivingTouchdowns = table.Column<double>(type: "double precision", nullable: false),
                    FantasyPointsYahooSeasonLong = table.Column<double>(type: "double precision", nullable: false),
                    Season = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    LastSyncedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NflPlayerProjections", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NflPlayerProjections_Name_Season_Year",
                table: "NflPlayerProjections",
                columns: new[] { "Name", "Season", "Year" });

            migrationBuilder.CreateIndex(
                name: "IX_NflPlayerProjections_PlayerId",
                table: "NflPlayerProjections",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_NflPlayerProjections_PlayerId_Season_Year",
                table: "NflPlayerProjections",
                columns: new[] { "PlayerId", "Season", "Year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NflPlayerProjections_Position",
                table: "NflPlayerProjections",
                column: "Position");

            migrationBuilder.CreateIndex(
                name: "IX_NflPlayerProjections_Season_Year",
                table: "NflPlayerProjections",
                columns: new[] { "Season", "Year" });

            migrationBuilder.CreateIndex(
                name: "IX_NflPlayerProjections_Team",
                table: "NflPlayerProjections",
                column: "Team");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NflPlayerProjections");
        }
    }
}
