using Hangfire.Dashboard;

namespace FantasyLeague.Api.Infrastructure
{
    public class AllowAllConnectionsFilter : IDashboardAuthorizationFilter
    {
        public bool Authorize(DashboardContext context)
        {
            // Allow all connections for development
            // In production, you should implement proper authentication
            return true;
        }
    }
}