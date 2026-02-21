package router

import (
	"encoding/json"
	"errors"
	"khairul169/garage-webui/store"
	"khairul169/garage-webui/utils"
	"net/http"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

type Auth struct {
	Store *store.Store
}

func (c *Auth) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.ResponseError(w, err)
		return
	}

	if c.Store != nil {
		// DB mode: authenticate against users table
		user, err := c.Store.GetUserByUsername(strings.TrimSpace(body.Username))
		if err != nil {
			utils.ResponseErrorStatus(w, errors.New("internal error"), 500)
			return
		}
		if user == nil || !user.IsActive {
			utils.ResponseErrorStatus(w, errors.New("invalid username or password"), 401)
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)); err != nil {
			utils.ResponseErrorStatus(w, errors.New("invalid username or password"), 401)
			return
		}

		utils.Session.SetUser(r, utils.SessionUser{
			ID:       user.ID,
			Username: user.Username,
			Role:     user.RoleName,
		})
		utils.ResponseSuccess(w, map[string]interface{}{
			"authenticated": true,
			"user": map[string]interface{}{
				"id":       user.ID,
				"username": user.Username,
				"role":     user.RoleName,
			},
		})
		return
	}

	// Legacy mode: check AUTH_USER_PASS env
	userPass := strings.SplitN(utils.GetEnv("AUTH_USER_PASS", ""), ":", 2)
	if len(userPass) < 2 {
		utils.ResponseErrorStatus(w, errors.New("AUTH_USER_PASS not set"), 500)
		return
	}

	if strings.TrimSpace(body.Username) != userPass[0] || bcrypt.CompareHashAndPassword([]byte(userPass[1]), []byte(body.Password)) != nil {
		utils.ResponseErrorStatus(w, errors.New("invalid username or password"), 401)
		return
	}

	utils.Session.Set(r, "authenticated", true)
	utils.ResponseSuccess(w, map[string]interface{}{
		"authenticated": true,
		"user":          nil,
	})
}

func (c *Auth) Logout(w http.ResponseWriter, r *http.Request) {
	utils.Session.Clear(r)
	utils.ResponseSuccess(w, true)
}

func (c *Auth) GetStatus(w http.ResponseWriter, r *http.Request) {
	multiUser := c.Store != nil

	if multiUser {
		sessionUser := utils.Session.GetUser(r)
		authenticated := sessionUser != nil

		resp := map[string]interface{}{
			"enabled":       true,
			"authenticated": authenticated,
			"multi_user":    true,
			"user":          nil,
		}
		if authenticated {
			resp["user"] = map[string]interface{}{
				"id":       sessionUser.ID,
				"username": sessionUser.Username,
				"role":     sessionUser.Role,
			}
		}
		utils.ResponseSuccess(w, resp)
		return
	}

	// Legacy mode
	enabled := utils.GetEnv("AUTH_USER_PASS", "") != ""

	// If auth is not enabled, everyone is considered authenticated (no-auth mode).
	// If auth is enabled, check session for the "authenticated" key.
	isAuthenticated := !enabled
	authSession := utils.Session.Get(r, "authenticated")
	if authSession != nil && authSession.(bool) {
		isAuthenticated = true
	}

	utils.ResponseSuccess(w, map[string]interface{}{
		"enabled":       enabled,
		"authenticated": isAuthenticated,
		"multi_user":    false,
		"user":          nil,
	})
}
