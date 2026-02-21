package router

import (
	"khairul169/garage-webui/middleware"
	"khairul169/garage-webui/store"
	"net/http"
)

// wrapRole wraps an http.HandlerFunc with RequireRole middleware.
func wrapRole(minRole string, handler http.HandlerFunc) http.Handler {
	return middleware.RequireRole(minRole)(http.HandlerFunc(handler))
}

// HandleApiRouter sets up the API routes. If s is non-nil, multi-user mode is
// enabled with role-based access control. If nil, legacy mode is used.
func HandleApiRouter(s *store.Store) *http.ServeMux {
	mux := http.NewServeMux()

	auth := &Auth{Store: s}
	// Public routes (no auth required)
	mux.HandleFunc("POST /auth/login", auth.Login)
	mux.HandleFunc("GET /auth/status", auth.GetStatus)

	// All other routes require authentication
	router := http.NewServeMux()
	router.HandleFunc("POST /auth/logout", auth.Logout)

	// Viewer routes (any authenticated user)
	config := &Config{}
	router.HandleFunc("GET /config", config.GetAll)

	buckets := &Buckets{}
	router.HandleFunc("GET /buckets", buckets.GetAll)

	browse := &Browse{}
	router.HandleFunc("GET /browse/{bucket}", browse.GetObjects)
	router.HandleFunc("GET /browse/{bucket}/{key...}", browse.GetOneObject)

	presign := &Presign{}
	router.HandleFunc("GET /presign/{bucket}/{key...}", presign.GetPresignedURL)

	zipDl := &ZipDownload{}
	router.HandleFunc("GET /zip/{bucket}", zipDl.DownloadAsZip)

	lifecycle := &Lifecycle{}
	router.HandleFunc("GET /lifecycle/{bucket}", lifecycle.GetLifecycleConfig)

	// Editor routes (editor or admin)
	router.Handle("PUT /browse/{bucket}/{key...}", wrapRole("editor", browse.PutObject))
	router.Handle("DELETE /browse/{bucket}/{key...}", wrapRole("editor", browse.DeleteObject))

	objects := &Objects{}
	router.Handle("POST /objects/copy", wrapRole("editor", objects.CopyObject))

	// Admin routes
	router.Handle("POST /lifecycle/{bucket}", wrapRole("admin", lifecycle.SetLifecycleConfig))
	router.Handle("DELETE /lifecycle/{bucket}", wrapRole("admin", lifecycle.DeleteLifecycleConfig))

	// User management routes (multi-user mode only)
	if s != nil {
		users := &Users{Store: s}
		// Password change: any authenticated user (self check in handler)
		router.HandleFunc("PUT /users/{id}/password", users.ChangePassword)
		// All other user routes: admin only
		router.Handle("GET /users", wrapRole("admin", users.GetAll))
		router.Handle("GET /roles", wrapRole("admin", users.GetRoles))
		router.Handle("POST /users", wrapRole("admin", users.Create))
		router.Handle("PUT /users/{id}", wrapRole("admin", users.Update))
		router.Handle("DELETE /users/{id}", wrapRole("admin", users.Delete))
	}

	// Catch-all proxy to Garage Admin API (admin only)
	router.Handle("/", wrapRole("admin", ProxyHandler))

	mux.Handle("/", middleware.AuthMiddleware(s)(router))
	return mux
}
