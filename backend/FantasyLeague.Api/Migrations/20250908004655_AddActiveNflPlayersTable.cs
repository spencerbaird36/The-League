using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddActiveNflPlayersTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ActiveNflPlayers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerID = table.Column<int>(type: "integer", nullable: false),
                    Team = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    FirstName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    LastName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FantasyPosition = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    Age = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    LastSyncedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActiveNflPlayers", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ActiveNflPlayers_FantasyPosition",
                table: "ActiveNflPlayers",
                column: "FantasyPosition");

            migrationBuilder.CreateIndex(
                name: "IX_ActiveNflPlayers_FirstName_LastName",
                table: "ActiveNflPlayers",
                columns: new[] { "FirstName", "LastName" });

            migrationBuilder.CreateIndex(
                name: "IX_ActiveNflPlayers_PlayerID",
                table: "ActiveNflPlayers",
                column: "PlayerID",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ActiveNflPlayers_Team",
                table: "ActiveNflPlayers",
                column: "Team");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActiveNflPlayers");
        }
    }
}
