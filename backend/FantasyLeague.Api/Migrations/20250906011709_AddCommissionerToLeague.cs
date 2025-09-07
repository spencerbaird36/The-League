using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCommissionerToLeague : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CommissionerId",
                table: "Leagues",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Leagues_CommissionerId",
                table: "Leagues",
                column: "CommissionerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Leagues_Users_CommissionerId",
                table: "Leagues",
                column: "CommissionerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Leagues_Users_CommissionerId",
                table: "Leagues");

            migrationBuilder.DropIndex(
                name: "IX_Leagues_CommissionerId",
                table: "Leagues");

            migrationBuilder.DropColumn(
                name: "CommissionerId",
                table: "Leagues");
        }
    }
}
