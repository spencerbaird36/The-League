using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddActiveMlbPlayersTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ActiveMlbPlayers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerID = table.Column<int>(type: "integer", nullable: false),
                    Team = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Position = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    FirstName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    LastName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    BirthDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    LastSyncedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActiveMlbPlayers", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ActiveMlbPlayers_BirthDate",
                table: "ActiveMlbPlayers",
                column: "BirthDate");

            migrationBuilder.CreateIndex(
                name: "IX_ActiveMlbPlayers_FirstName_LastName",
                table: "ActiveMlbPlayers",
                columns: new[] { "FirstName", "LastName" });

            migrationBuilder.CreateIndex(
                name: "IX_ActiveMlbPlayers_PlayerID",
                table: "ActiveMlbPlayers",
                column: "PlayerID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ActiveMlbPlayers_Position",
                table: "ActiveMlbPlayers",
                column: "Position");

            migrationBuilder.CreateIndex(
                name: "IX_ActiveMlbPlayers_Team",
                table: "ActiveMlbPlayers",
                column: "Team");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActiveMlbPlayers");
        }
    }
}
