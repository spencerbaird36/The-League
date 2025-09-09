using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddActiveNbaPlayersTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ActiveNbaPlayers",
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
                    table.PrimaryKey("PK_ActiveNbaPlayers", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ActiveNbaPlayers_BirthDate",
                table: "ActiveNbaPlayers",
                column: "BirthDate");

            migrationBuilder.CreateIndex(
                name: "IX_ActiveNbaPlayers_FirstName_LastName",
                table: "ActiveNbaPlayers",
                columns: new[] { "FirstName", "LastName" });

            migrationBuilder.CreateIndex(
                name: "IX_ActiveNbaPlayers_PlayerID",
                table: "ActiveNbaPlayers",
                column: "PlayerID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ActiveNbaPlayers_Position",
                table: "ActiveNbaPlayers",
                column: "Position");

            migrationBuilder.CreateIndex(
                name: "IX_ActiveNbaPlayers_Team",
                table: "ActiveNbaPlayers",
                column: "Team");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActiveNbaPlayers");
        }
    }
}
