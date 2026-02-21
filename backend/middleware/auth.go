package middleware

import (
	"khairul169/garage-webui/store"
	"khairul169/garage-webui/utils"
	"net/http"
)

// AuthMiddleware checks authentication. In DB mode (store != nil), it reads the
// user from the session and injects into context. In legacy mode, it checks the
// "authenticated" session key. Legacy authenticated users get an implicit admin role.
func AuthMiddleware(s *store.Store) func(http.Handler) http.Handler {
	authData := utils.GetEnv("AUTH_USER_PASS", "")

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if s != nil {
				// DB mode: read user from session
				sessionUser := utils.Session.GetUser(r)
				if sessionUser == nil {
					http.Error(w, "unauthorized", http.StatusUnauthorized)
					return
				}
				// Inject user into context for downstream handlers
				ctx := utils.ContextWithUser(r.Context(), sessionUser)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Legacy mode: no auth configured → allow all
			if authData == "" {
				// Inject a virtual admin so role checks still work
				admin := &utils.SessionUser{ID: 0, Username: "admin", Role: "admin"}
				ctx := utils.ContextWithUser(r.Context(), admin)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Legacy mode: check boolean session key
			auth := utils.Session.Get(r, "authenticated")
			if auth == nil || !auth.(bool) {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			// Legacy authenticated user gets implicit admin role
			admin := &utils.SessionUser{ID: 0, Username: "admin", Role: "admin"}
			ctx := utils.ContextWithUser(r.Context(), admin)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
