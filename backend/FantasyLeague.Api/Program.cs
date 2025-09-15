using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.Hubs;
using FantasyLeague.Api.Infrastructure;
using SendGrid;
using Hangfire;
using Hangfire.PostgreSql;

// Configure legacy timestamp behavior for PostgreSQL
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// Add SignalR
builder.Services.AddSignalR();

// Add Entity Framework
string connectionString;
if (builder.Environment.IsProduction())
{
    // Use Heroku DATABASE_URL in production
    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    if (!string.IsNullOrEmpty(databaseUrl))
    {
        // Parse Heroku DATABASE_URL
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':');
        connectionString = $"Host={uri.Host};Port={uri.Port};Database={uri.LocalPath.Substring(1)};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true;";
    }
    else
    {
        connectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;
    }
}
else
{
    connectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;
}

builder.Services.AddDbContext<FantasyLeagueContext>(options =>
    options.UseNpgsql(connectionString));

// Configure Hangfire to use the same connection string as PostgreSQL
builder.Services.AddHangfire(configuration => configuration
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(connectionString, new PostgreSqlStorageOptions
    {
        QueuePollInterval = TimeSpan.FromSeconds(10),
        JobExpirationCheckInterval = TimeSpan.FromHours(1),
        CountersAggregateInterval = TimeSpan.FromMinutes(5),
        PrepareSchemaIfNecessary = true
    }));

// Add Hangfire server
builder.Services.AddHangfireServer(options =>
{
    options.Queues = new[] { "default", "emails" };
    options.WorkerCount = Math.Max(Environment.ProcessorCount, 2);
});

// Configure email settings
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));

// Add SendGrid client
builder.Services.AddSingleton<ISendGridClient>(provider =>
{
    var apiKey = builder.Configuration.GetSection("EmailSettings")["ApiKey"];
    return new SendGridClient(apiKey);
});

// Add services
builder.Services.AddScoped<ScheduleService>();
builder.Services.AddScoped<ICommissionerService, CommissionerService>();
builder.Services.AddScoped<LeagueConfigurationService>();
builder.Services.AddScoped<ProjectionSyncService>();
builder.Services.AddScoped<KeeperDraftService>();
builder.Services.AddScoped<PlayerPoolService>();
builder.Services.AddScoped<RegularDraftService>();
builder.Services.AddScoped<NflPlayerDataService>();
builder.Services.AddScoped<MlbPlayerDataService>();
builder.Services.AddScoped<NbaPlayerDataService>();
builder.Services.AddScoped<NflProjectionDataService>();
builder.Services.AddScoped<MlbProjectionDataService>();
builder.Services.AddScoped<NbaProjectionDataService>();
builder.Services.AddScoped<IEmailTemplateService, EmailTemplateService>();
builder.Services.AddScoped<IEmailService, SendGridEmailService>();
builder.Services.AddScoped<IBackgroundEmailService, BackgroundEmailService>();
builder.Services.AddScoped<IEmailMonitoringService, EmailMonitoringService>();

// Add background service for email monitoring
builder.Services.AddHostedService<EmailMonitoringBackgroundService>();

// Add HttpClient for API calls
builder.Services.AddHttpClient();

// Add health checks
builder.Services.AddHealthChecks()
    .AddCheck<FantasyLeague.Api.HealthChecks.EmailSystemHealthCheck>("email_system")
    .AddCheck<FantasyLeague.Api.HealthChecks.SendGridHealthCheck>("sendgrid")
    .AddDbContextCheck<FantasyLeagueContext>("database");

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:3001", "https://the-league-f8fa1bccd03a.herokuapp.com")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .SetIsOriginAllowed(_ => true) // Allow any origin for SignalR
              .AllowCredentials(); // Required for SignalR
    });
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Initialize static service provider for SignalR Hub timer callbacks
FantasyLeague.Api.Hubs.ChatHub.InitializeServiceProvider(app.Services);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Use CORS
app.UseCors("AllowReactApp");

// Add Hangfire dashboard (optional, for monitoring)
if (app.Environment.IsDevelopment())
{
    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        Authorization = new[] { new AllowAllConnectionsFilter() }
    });
}

app.MapControllers();

// Map SignalR hub
app.MapHub<ChatHub>("/chathub");

// Map health checks
app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var response = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(x => new
            {
                name = x.Key,
                status = x.Value.Status.ToString(),
                exception = x.Value.Exception?.Message,
                duration = x.Value.Duration.ToString(),
                data = x.Value.Data
            }),
            duration = report.TotalDuration
        };
        await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(response));
    }
});

// Add health check endpoint
app.MapGet("/", () => "Fantasy League API is running!");

// Configure port for Heroku
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
app.Urls.Add($"http://*:{port}");

// Run migrations asynchronously after startup to avoid boot timeout
_ = Task.Run(async () =>
{
    await Task.Delay(1000); // Wait for app to start
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<FantasyLeagueContext>();
    try
    {
        await context.Database.MigrateAsync();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Error running migrations");
    }
});

// Schedule recurring projection sync jobs after app starts
_ = Task.Run(async () =>
{
    await Task.Delay(2000); // Wait for app and migrations to complete
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        // Schedule daily projection syncs at 6 AM UTC
        RecurringJob.AddOrUpdate<ProjectionSyncService>("sync-nfl-projections",
            service => service.SyncNflProjectionsAsync(),
            "0 6 * * *"); // 6 AM UTC daily

        RecurringJob.AddOrUpdate<ProjectionSyncService>("sync-mlb-projections",
            service => service.SyncMlbProjectionsAsync(),
            "0 6 * * *"); // 6 AM UTC daily

        RecurringJob.AddOrUpdate<ProjectionSyncService>("sync-nba-projections",
            service => service.SyncNbaProjectionsAsync(),
            "0 6 * * *"); // 6 AM UTC daily

        logger.LogInformation("Recurring projection sync jobs scheduled successfully");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error scheduling recurring projection sync jobs");
    }
});

app.Run();
