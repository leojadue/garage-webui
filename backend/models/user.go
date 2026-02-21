package models

// Role represents a user role in the system.
type Role struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// User represents a stored user.
type User struct {
	ID           int    `json:"id"`
	Username     string `json:"username"`
	PasswordHash string `json:"-"`
	Email        string `json:"email"`
	RoleID       int    `json:"role_id"`
	RoleName     string `json:"role"`
	IsActive     bool   `json:"is_active"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

// SessionUser is the user info stored in the session.
type SessionUser struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

// RoleLevel returns a numeric level for role comparison.
func RoleLevel(role string) int {
	switch role {
	case "admin":
		return 3
	case "editor":
		return 2
	case "viewer":
		return 1
	default:
		return 0
	}
}

// CreateUserRequest is the request body for creating a user.
type CreateUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

// UpdateUserRequest is the request body for updating a user.
type UpdateUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	IsActive *bool  `json:"is_active"`
}

// ChangePasswordRequest is the request body for changing a password.
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}
