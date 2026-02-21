package store

import (
	"database/sql"
	"fmt"
	"khairul169/garage-webui/models"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// GetAllUsers returns all users with their role names.
func (s *Store) GetAllUsers() ([]models.User, error) {
	rows, err := s.db.Query(`
		SELECT u.id, u.username, u.email, u.role_id, r.name, u.is_active, u.created_at, u.updated_at
		FROM users u JOIN roles r ON u.role_id = r.id
		ORDER BY u.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.RoleID, &u.RoleName, &u.IsActive, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// GetUserByID returns a user by ID.
func (s *Store) GetUserByID(id int) (*models.User, error) {
	u := &models.User{}
	err := s.db.QueryRow(`
		SELECT u.id, u.username, u.password_hash, u.email, u.role_id, r.name, u.is_active, u.created_at, u.updated_at
		FROM users u JOIN roles r ON u.role_id = r.id
		WHERE u.id = ?`, id).
		Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Email, &u.RoleID, &u.RoleName, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return u, err
}

// GetUserByUsername returns a user by username.
func (s *Store) GetUserByUsername(username string) (*models.User, error) {
	u := &models.User{}
	err := s.db.QueryRow(`
		SELECT u.id, u.username, u.password_hash, u.email, u.role_id, r.name, u.is_active, u.created_at, u.updated_at
		FROM users u JOIN roles r ON u.role_id = r.id
		WHERE u.username = ?`, username).
		Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Email, &u.RoleID, &u.RoleName, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return u, err
}

// CreateUser creates a new user with a hashed password.
func (s *Store) CreateUser(req models.CreateUserRequest) (*models.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	var roleID int
	err = s.db.QueryRow("SELECT id FROM roles WHERE name = ?", req.Role).Scan(&roleID)
	if err != nil {
		return nil, fmt.Errorf("invalid role %q: %w", req.Role, err)
	}

	result, err := s.db.Exec(`
		INSERT INTO users (username, password_hash, email, role_id)
		VALUES (?, ?, ?, ?)`,
		strings.TrimSpace(req.Username), string(hash), strings.TrimSpace(req.Email), roleID)
	if err != nil {
		return nil, fmt.Errorf("insert user: %w", err)
	}

	id, _ := result.LastInsertId()
	return s.GetUserByID(int(id))
}

// UpdateUser updates a user's profile fields.
func (s *Store) UpdateUser(id int, req models.UpdateUserRequest) (*models.User, error) {
	var roleID int
	err := s.db.QueryRow("SELECT id FROM roles WHERE name = ?", req.Role).Scan(&roleID)
	if err != nil {
		return nil, fmt.Errorf("invalid role %q: %w", req.Role, err)
	}

	isActive := 1
	if req.IsActive != nil && !*req.IsActive {
		isActive = 0
	}

	_, err = s.db.Exec(`
		UPDATE users SET username = ?, email = ?, role_id = ?, is_active = ?, updated_at = datetime('now')
		WHERE id = ?`,
		strings.TrimSpace(req.Username), strings.TrimSpace(req.Email), roleID, isActive, id)
	if err != nil {
		return nil, fmt.Errorf("update user: %w", err)
	}

	return s.GetUserByID(id)
}

// DeleteUser deletes a user by ID.
func (s *Store) DeleteUser(id int) error {
	_, err := s.db.Exec("DELETE FROM users WHERE id = ?", id)
	return err
}

// ChangePassword verifies the old password and sets a new one.
func (s *Store) ChangePassword(id int, oldPass, newPass string) error {
	var hash string
	err := s.db.QueryRow("SELECT password_hash FROM users WHERE id = ?", id).Scan(&hash)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(oldPass)); err != nil {
		return fmt.Errorf("invalid old password")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(newPass), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	_, err = s.db.Exec("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", string(newHash), id)
	return err
}

// AdminChangePassword sets a new password without verifying the old one (admin only).
func (s *Store) AdminChangePassword(id int, newPass string) error {
	newHash, err := bcrypt.GenerateFromPassword([]byte(newPass), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	_, err = s.db.Exec("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", string(newHash), id)
	return err
}

// CountAdmins returns the number of active admin users.
func (s *Store) CountAdmins() (int, error) {
	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(*) FROM users u
		JOIN roles r ON u.role_id = r.id
		WHERE r.name = 'admin' AND u.is_active = 1`).Scan(&count)
	return count, err
}

// EnsureAdminFromEnv creates an admin user from the AUTH_USER_PASS env var format "username:bcrypt_hash".
// The bcryptHash must be a valid bcrypt hash string (starting with $2a$, $2b$, or $2y$).
func (s *Store) EnsureAdminFromEnv(username, bcryptHash string) error {
	// Validate that the hash is a valid bcrypt hash
	if _, err := bcrypt.Cost([]byte(bcryptHash)); err != nil {
		return fmt.Errorf("AUTH_USER_PASS contains an invalid bcrypt hash (did you forget to hash the password?): %w", err)
	}

	existing, err := s.GetUserByUsername(username)
	if err != nil {
		return err
	}
	if existing != nil {
		return nil // Admin already exists
	}

	var roleID int
	err = s.db.QueryRow("SELECT id FROM roles WHERE name = 'admin'").Scan(&roleID)
	if err != nil {
		return fmt.Errorf("admin role not found: %w", err)
	}

	_, err = s.db.Exec(`
		INSERT INTO users (username, password_hash, email, role_id, is_active)
		VALUES (?, ?, '', ?, 1)`,
		username, bcryptHash, roleID)
	return err
}
