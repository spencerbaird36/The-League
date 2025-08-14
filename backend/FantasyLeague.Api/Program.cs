using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Services;

// Configure legacy timestamp behavior for PostgreSQL
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

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

// Add services
builder.Services.AddScoped<ScheduleService>();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:3001", "https://the-league-f8fa1bccd03a.herokuapp.com")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Auto-migrate database on startup (for Heroku)
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<FantasyLeagueContext>();
    context.Database.Migrate();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Use CORS
app.UseCors("AllowReactApp");

app.MapControllers();

app.Run();
