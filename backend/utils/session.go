package utils

import (
	"context"
	"encoding/gob"
	"net/http"
	"time"

	"github.com/alexedwards/scs/v2"
)

// SessionUser is stored in the session for multi-user mode.
type SessionUser struct {
	ID       int
	Username string
	Role     string
}

func init() {
	gob.Register(SessionUser{})
}

type SessionManager struct {
	mgr *scs.SessionManager
}

var Session *SessionManager

func configureSessionDefaults(sessMgr *scs.SessionManager) {
	sessMgr.Lifetime = 24 * time.Hour
	sessMgr.Cookie.SameSite = http.SameSiteStrictMode
	sessMgr.Cookie.Secure = GetEnv("COOKIE_SECURE", "true") != "false"
}

func InitSessionManager() *scs.SessionManager {
	sessMgr := scs.New()
	configureSessionDefaults(sessMgr)
	Session = &SessionManager{mgr: sessMgr}
	return sessMgr
}

// InitSessionManagerWithStore creates a session manager backed by a custom store.
func InitSessionManagerWithStore(store scs.Store) *scs.SessionManager {
	sessMgr := scs.New()
	configureSessionDefaults(sessMgr)
	sessMgr.Store = store
	Session = &SessionManager{mgr: sessMgr}
	return sessMgr
}

func (s *SessionManager) Get(r *http.Request, key string) interface{} {
	return s.mgr.Get(r.Context(), key)
}

func (s *SessionManager) Set(r *http.Request, key string, value interface{}) {
	s.mgr.Put(r.Context(), key, value)
}

func (s *SessionManager) Clear(r *http.Request) error {
	return s.mgr.Clear(r.Context())
}

// RenewToken regenerates the session token to prevent session fixation attacks.
func (s *SessionManager) RenewToken(r *http.Request) error {
	return s.mgr.RenewToken(r.Context())
}

// SetUser stores a SessionUser in the session.
func (s *SessionManager) SetUser(r *http.Request, user SessionUser) {
	s.mgr.Put(r.Context(), "user", user)
}

// GetUser retrieves the SessionUser from the session.
func (s *SessionManager) GetUser(r *http.Request) *SessionUser {
	val := s.mgr.Get(r.Context(), "user")
	if val == nil {
		return nil
	}
	u, ok := val.(SessionUser)
	if !ok {
		return nil
	}
	return &u
}

type contextKey string

const userContextKey contextKey = "session_user"

// ContextWithUser adds a SessionUser to the request context.
func ContextWithUser(ctx context.Context, user *SessionUser) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}

// UserFromContext retrieves the SessionUser from the request context.
func UserFromContext(ctx context.Context) *SessionUser {
	val := ctx.Value(userContextKey)
	if val == nil {
		return nil
	}
	u, ok := val.(*SessionUser)
	if !ok {
		return nil
	}
	return u
}
