package main

import (
	"fmt"
	"khairul169/garage-webui/router"
	"khairul169/garage-webui/store"
	"khairul169/garage-webui/ui"
	"khairul169/garage-webui/utils"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/alexedwards/scs/v2"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	utils.InitCacheManager()

	if err := utils.Garage.LoadConfig(); err != nil {
		log.Println("Cannot load garage config!", err)
	}

	var (
		s       *store.Store
		sessMgr *scs.SessionManager
	)

	dataDir := os.Getenv("DATA_DIR")

	if dataDir != "" {
		log.Printf("Multi-user mode: DATA_DIR=%s", dataDir)

		var err error
		s, err = store.New(dataDir)
		if err != nil {
			log.Fatalf("Failed to initialize database: %v", err)
		}
		defer s.Close()

		sessionStore := store.NewSessionStore(s.DB())
		defer sessionStore.StopCleanup()

		sessMgr = utils.InitSessionManagerWithStore(sessionStore)

		// Seed admin user from AUTH_USER_PASS env if set
		authUserPass := os.Getenv("AUTH_USER_PASS")
		if authUserPass != "" {
			parts := strings.SplitN(authUserPass, ":", 2)
			if len(parts) == 2 {
				if err := s.EnsureAdminFromEnv(parts[0], parts[1]); err != nil {
					log.Printf("Warning: could not seed admin user: %v", err)
				} else {
					log.Printf("Admin user '%s' ensured in database", parts[0])
				}
			}
		}
	} else {
		sessMgr = utils.InitSessionManager()
	}

	basePath := os.Getenv("BASE_PATH")
	mux := http.NewServeMux()

	apiPrefix := basePath + "/api"
	mux.Handle(apiPrefix+"/", http.StripPrefix(apiPrefix, router.HandleApiRouter(s)))

	ui.ServeUI(mux)

	if basePath != "" {
		mux.Handle("/", http.RedirectHandler(basePath, http.StatusMovedPermanently))
	}

	host := utils.GetEnv("HOST", "0.0.0.0")
	port := utils.GetEnv("PORT", "3909")

	addr := fmt.Sprintf("%s:%s", host, port)
	log.Printf("Starting server on http://%s", addr)

	if err := http.ListenAndServe(addr, sessMgr.LoadAndSave(mux)); err != nil {
		log.Fatal(err)
	}
}
