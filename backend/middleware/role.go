package middleware

import (
	"khairul169/garage-webui/models"
	"khairul169/garage-webui/utils"
	"net/http"
)

// RequireRole returns a middleware that requires the session user to have at
// least the given minimum role level. Must be applied after AuthMiddleware
// which injects the user into context.
func RequireRole(minRole string) func(http.Handler) http.Handler {
	minLevel := models.RoleLevel(minRole)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := utils.UserFromContext(r.Context())
			if user == nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			if models.RoleLevel(user.Role) < minLevel {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// GetUser is a convenience to read the user from request context.
func GetUser(r *http.Request) *utils.SessionUser {
	return utils.UserFromContext(r.Context())
}
