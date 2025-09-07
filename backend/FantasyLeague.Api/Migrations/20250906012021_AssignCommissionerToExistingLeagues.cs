using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FantasyLeague.Api.Migrations
{
    /// <inheritdoc />
    public partial class AssignCommissionerToExistingLeagues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Update existing leagues to set spencer.baird36@gmail.com as commissioner
            migrationBuilder.Sql(@"
                UPDATE ""Leagues"" 
                SET ""CommissionerId"" = (
                    SELECT ""Id"" FROM ""Users"" 
                    WHERE ""Email"" = 'spencer.baird36@gmail.com' 
                    LIMIT 1
                )
                WHERE ""CommissionerId"" IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Set all commissioners back to null (reversal)
            migrationBuilder.Sql(@"
                UPDATE ""Leagues"" 
                SET ""CommissionerId"" = NULL;
            ");
        }
    }
}
