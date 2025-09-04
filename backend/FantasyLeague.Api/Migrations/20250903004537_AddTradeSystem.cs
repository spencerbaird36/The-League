using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTradeSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TradeProposals",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LeagueId = table.Column<int>(type: "integer", nullable: false),
                    ProposingUserId = table.Column<int>(type: "integer", nullable: false),
                    TargetUserId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "pending"),
                    Message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TradeProposals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TradeProposals_Leagues_LeagueId",
                        column: x => x.LeagueId,
                        principalTable: "Leagues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TradeProposals_Users_ProposingUserId",
                        column: x => x.ProposingUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TradeProposals_Users_TargetUserId",
                        column: x => x.TargetUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TradeNotifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    TradeProposalId = table.Column<int>(type: "integer", nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Message = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    ReadAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TradeNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TradeNotifications_TradeProposals_TradeProposalId",
                        column: x => x.TradeProposalId,
                        principalTable: "TradeProposals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TradeNotifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TradePlayers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TradeProposalId = table.Column<int>(type: "integer", nullable: false),
                    UserRosterId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    TradeType = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PlayerName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PlayerPosition = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PlayerTeam = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PlayerLeague = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PickNumber = table.Column<int>(type: "integer", nullable: false),
                    Round = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "NOW()"),
                    TradeProposalId1 = table.Column<int>(type: "integer", nullable: true),
                    TradeProposalId2 = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TradePlayers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TradePlayers_TradeProposals_TradeProposalId",
                        column: x => x.TradeProposalId,
                        principalTable: "TradeProposals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TradePlayers_TradeProposals_TradeProposalId1",
                        column: x => x.TradeProposalId1,
                        principalTable: "TradeProposals",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TradePlayers_TradeProposals_TradeProposalId2",
                        column: x => x.TradeProposalId2,
                        principalTable: "TradeProposals",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TradePlayers_UserRosters_UserRosterId",
                        column: x => x.UserRosterId,
                        principalTable: "UserRosters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TradePlayers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TradeNotifications_TradeProposalId",
                table: "TradeNotifications",
                column: "TradeProposalId");

            migrationBuilder.CreateIndex(
                name: "IX_TradeNotifications_UserId_CreatedAt",
                table: "TradeNotifications",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TradeNotifications_UserId_IsRead",
                table: "TradeNotifications",
                columns: new[] { "UserId", "IsRead" });

            migrationBuilder.CreateIndex(
                name: "IX_TradePlayers_TradeProposalId_TradeType",
                table: "TradePlayers",
                columns: new[] { "TradeProposalId", "TradeType" });

            migrationBuilder.CreateIndex(
                name: "IX_TradePlayers_TradeProposalId1",
                table: "TradePlayers",
                column: "TradeProposalId1");

            migrationBuilder.CreateIndex(
                name: "IX_TradePlayers_TradeProposalId2",
                table: "TradePlayers",
                column: "TradeProposalId2");

            migrationBuilder.CreateIndex(
                name: "IX_TradePlayers_UserId",
                table: "TradePlayers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TradePlayers_UserRosterId",
                table: "TradePlayers",
                column: "UserRosterId");

            migrationBuilder.CreateIndex(
                name: "IX_TradeProposals_ExpiresAt",
                table: "TradeProposals",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_TradeProposals_LeagueId_Status",
                table: "TradeProposals",
                columns: new[] { "LeagueId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_TradeProposals_ProposingUserId_Status",
                table: "TradeProposals",
                columns: new[] { "ProposingUserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_TradeProposals_TargetUserId_Status",
                table: "TradeProposals",
                columns: new[] { "TargetUserId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TradeNotifications");

            migrationBuilder.DropTable(
                name: "TradePlayers");

            migrationBuilder.DropTable(
                name: "TradeProposals");
        }
    }
}
