package store

import (
	"database/sql"
	"time"
)

// SessionStore implements the scs.Store interface backed by SQLite.
type SessionStore struct {
	db          *sql.DB
	stopCleanup chan struct{}
}

// NewSessionStore creates a new SQLite-backed session store with periodic cleanup.
func NewSessionStore(db *sql.DB) *SessionStore {
	ss := &SessionStore{
		db:          db,
		stopCleanup: make(chan struct{}),
	}
	go ss.startCleanup(5 * time.Minute)
	return ss
}

// Find returns the data for a given session token. If the token has expired or
// does not exist, the found return value will be false.
func (ss *SessionStore) Find(token string) ([]byte, bool, error) {
	var data []byte
	var expiry float64
	err := ss.db.QueryRow("SELECT data, expiry FROM sessions WHERE token = ?", token).Scan(&data, &expiry)
	if err == sql.ErrNoRows {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	if time.Now().After(time.Unix(int64(expiry), 0)) {
		return nil, false, nil
	}
	return data, true, nil
}

// Commit adds or updates a session token with the given data and expiry time.
func (ss *SessionStore) Commit(token string, data []byte, expiry time.Time) error {
	_, err := ss.db.Exec(
		`INSERT INTO sessions (token, data, expiry) VALUES (?, ?, ?)
		 ON CONFLICT(token) DO UPDATE SET data = excluded.data, expiry = excluded.expiry`,
		token, data, float64(expiry.Unix()),
	)
	return err
}

// Delete removes a session token and its data.
func (ss *SessionStore) Delete(token string) error {
	_, err := ss.db.Exec("DELETE FROM sessions WHERE token = ?", token)
	return err
}

// All returns a map of all active session tokens and their data.
func (ss *SessionStore) All() (map[string][]byte, error) {
	rows, err := ss.db.Query("SELECT token, data FROM sessions WHERE expiry >= ?", float64(time.Now().Unix()))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sessions := make(map[string][]byte)
	for rows.Next() {
		var token string
		var data []byte
		if err := rows.Scan(&token, &data); err != nil {
			return nil, err
		}
		sessions[token] = data
	}
	return sessions, rows.Err()
}

func (ss *SessionStore) startCleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			ss.db.Exec("DELETE FROM sessions WHERE expiry < ?", float64(time.Now().Unix()))
		case <-ss.stopCleanup:
			return
		}
	}
}

// StopCleanup stops the periodic session cleanup goroutine.
func (ss *SessionStore) StopCleanup() {
	close(ss.stopCleanup)
}
