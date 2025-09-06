using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;

namespace FantasyLeague.Api.Attributes
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class AdminOnlyAttribute : Attribute, IAsyncActionFilter
    {
        private const string AdminEmail = "spencer.baird36@gmail.com";

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            // Get userId from query parameter
            if (!context.HttpContext.Request.Query.TryGetValue("userId", out var userIdValue) ||
                !int.TryParse(userIdValue.ToString(), out var userId))
            {
                context.Result = new UnauthorizedObjectResult(new { Message = "User ID is required" });
                return;
            }

            // Get database context from DI
            var dbContext = context.HttpContext.RequestServices.GetRequiredService<FantasyLeagueContext>();
            
            // Check if user exists and has admin email
            var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null || user.Email.ToLower() != AdminEmail.ToLower())
            {
                context.Result = new ForbiddenObjectResult(new { Message = "Access denied: Admin privileges required" });
                return;
            }

            await next();
        }
    }

    public class ForbiddenObjectResult : ObjectResult
    {
        public ForbiddenObjectResult(object? value) : base(value)
        {
            StatusCode = 403;
        }
    }
}