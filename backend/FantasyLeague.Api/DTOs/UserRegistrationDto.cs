using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class UserRegistrationDto
    {
        [Required(ErrorMessage = "Username is required")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 50 characters")]
        public string Username { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        [StringLength(100, ErrorMessage = "Email must not exceed 100 characters")]
        public string Email { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Password is required")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters long")]
        public string Password { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Password confirmation is required")]
        [Compare("Password", ErrorMessage = "Passwords do not match")]
        public string ConfirmPassword { get; set; } = string.Empty;
        
        [StringLength(50, ErrorMessage = "First name must not exceed 50 characters")]
        public string FirstName { get; set; } = string.Empty;
        
        [StringLength(50, ErrorMessage = "Last name must not exceed 50 characters")]
        public string LastName { get; set; } = string.Empty;
    }
}