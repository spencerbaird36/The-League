using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLeagueConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LeagueConfigurations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LeagueId = table.Column<int>(type: "integer", nullable: false),
                    IncludeNFL = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    IncludeMLB = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    IncludeNBA = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    TotalKeeperSlots = table.Column<int>(type: "integer", nullable: false, defaultValue: 15),
                    IsKeeperLeague = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    MaxPlayersPerTeam = table.Column<int>(type: "integer", nullable: false, defaultValue: 25),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeagueConfigurations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeagueConfigurations_Leagues_LeagueId",
                        column: x => x.LeagueId,
                        principalTable: "Leagues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LeagueConfigurations_LeagueId",
                table: "LeagueConfigurations",
                column: "LeagueId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LeagueConfigurations");
        }
    }
}
