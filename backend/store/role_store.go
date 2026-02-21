package store

import (
	"database/sql"
	"khairul169/garage-webui/models"
)

// GetAllRoles returns all roles.
func (s *Store) GetAllRoles() ([]models.Role, error) {
	rows, err := s.db.Query("SELECT id, name, description FROM roles ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []models.Role
	for rows.Next() {
		var r models.Role
		if err := rows.Scan(&r.ID, &r.Name, &r.Description); err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	return roles, rows.Err()
}

// GetRoleByName returns a role by name, or nil if not found.
func (s *Store) GetRoleByName(name string) (*models.Role, error) {
	r := &models.Role{}
	err := s.db.QueryRow("SELECT id, name, description FROM roles WHERE name = ?", name).Scan(&r.ID, &r.Name, &r.Description)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return r, nil
}
