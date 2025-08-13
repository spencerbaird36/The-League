using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Data;
using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;

        public UsersController(FantasyLeagueContext context)
        {
            _context = context;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegistrationDto registrationDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Check if username already exists
            if (await _context.Users.AnyAsync(u => u.Username.ToLower() == registrationDto.Username.ToLower()))
            {
                ModelState.AddModelError("Username", "Username is already taken");
                return BadRequest(ModelState);
            }

            // Check if email already exists
            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == registrationDto.Email.ToLower()))
            {
                ModelState.AddModelError("Email", "Email is already registered");
                return BadRequest(ModelState);
            }

            // Hash password
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(registrationDto.Password);

            // Create new user
            var user = new User
            {
                Username = registrationDto.Username,
                Email = registrationDto.Email,
                Password = hashedPassword,
                FirstName = registrationDto.FirstName,
                LastName = registrationDto.LastName,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Return user without password
            var userResponse = new
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                CreatedAt = user.CreatedAt,
                League = (object?)null
            };

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, userResponse);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await _context.Users
                .Include(u => u.League)
                .FirstOrDefaultAsync(u => u.Username.ToLower() == loginDto.Username.ToLower());
            if (user == null)
            {
                return BadRequest(new { Message = "Invalid username or password" });
            }

            if (!BCrypt.Net.BCrypt.Verify(loginDto.Password, user.Password))
            {
                return BadRequest(new { Message = "Invalid username or password" });
            }

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var userResponse = new
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt,
                League = user.League != null ? new
                {
                    Id = user.League.Id,
                    Name = user.League.Name,
                    JoinCode = user.League.JoinCode
                } : null
            };

            return Ok(userResponse);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(int id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
            {
                return NotFound();
            }

            var userResponse = new
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt,
                IsActive = user.IsActive
            };

            return Ok(userResponse);
        }
    }
}