package router

import (
	"encoding/json"
	"errors"
	"fmt"
	"khairul169/garage-webui/models"
	"khairul169/garage-webui/store"
	"khairul169/garage-webui/utils"
	"net/http"
	"strconv"
)

type Users struct {
	Store *store.Store
}

func (u *Users) GetAll(w http.ResponseWriter, r *http.Request) {
	users, err := u.Store.GetAllUsers()
	if err != nil {
		utils.ResponseError(w, err)
		return
	}
	if users == nil {
		users = []models.User{}
	}
	utils.ResponseSuccess(w, users)
}

func (u *Users) GetRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := u.Store.GetAllRoles()
	if err != nil {
		utils.ResponseError(w, err)
		return
	}
	utils.ResponseSuccess(w, roles)
}

func (u *Users) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ResponseError(w, err)
		return
	}

	if req.Username == "" || req.Password == "" || req.Role == "" {
		utils.ResponseErrorStatus(w, errors.New("username, password, and role are required"), 400)
		return
	}

	if len(req.Password) < 6 {
		utils.ResponseErrorStatus(w, errors.New("password must be at least 6 characters"), 400)
		return
	}

	level := models.RoleLevel(req.Role)
	if level == 0 {
		utils.ResponseErrorStatus(w, errors.New("invalid role"), 400)
		return
	}

	existing, err := u.Store.GetUserByUsername(req.Username)
	if err != nil {
		utils.ResponseError(w, err)
		return
	}
	if existing != nil {
		utils.ResponseErrorStatus(w, errors.New("username already exists"), 409)
		return
	}

	user, err := u.Store.CreateUser(req)
	if err != nil {
		utils.ResponseError(w, err)
		return
	}
	utils.ResponseSuccess(w, user)
}

func (u *Users) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		utils.ResponseErrorStatus(w, errors.New("invalid user id"), 400)
		return
	}

	var req models.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ResponseError(w, err)
		return
	}

	if req.Username == "" || req.Role == "" {
		utils.ResponseErrorStatus(w, errors.New("username and role are required"), 400)
		return
	}

	existing, err := u.Store.GetUserByID(id)
	if err != nil || existing == nil {
		utils.ResponseErrorStatus(w, errors.New("user not found"), 404)
		return
	}

	// Prevent demoting the last admin
	if existing.RoleName == "admin" && req.Role != "admin" {
		count, err := u.Store.CountAdmins()
		if err != nil {
			utils.ResponseError(w, err)
			return
		}
		if count <= 1 {
			utils.ResponseErrorStatus(w, errors.New("cannot demote the last admin"), 400)
			return
		}
	}

	// Prevent deactivating the last admin
	if existing.RoleName == "admin" && req.IsActive != nil && !*req.IsActive {
		count, err := u.Store.CountAdmins()
		if err != nil {
			utils.ResponseError(w, err)
			return
		}
		if count <= 1 {
			utils.ResponseErrorStatus(w, errors.New("cannot deactivate the last admin"), 400)
			return
		}
	}

	user, err := u.Store.UpdateUser(id, req)
	if err != nil {
		utils.ResponseError(w, err)
		return
	}
	utils.ResponseSuccess(w, user)
}

func (u *Users) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		utils.ResponseErrorStatus(w, errors.New("invalid user id"), 400)
		return
	}

	existing, err := u.Store.GetUserByID(id)
	if err != nil || existing == nil {
		utils.ResponseErrorStatus(w, errors.New("user not found"), 404)
		return
	}

	// Prevent deleting the last admin
	if existing.RoleName == "admin" {
		count, err := u.Store.CountAdmins()
		if err != nil {
			utils.ResponseError(w, err)
			return
		}
		if count <= 1 {
			utils.ResponseErrorStatus(w, errors.New("cannot delete the last admin"), 400)
			return
		}
	}

	if err := u.Store.DeleteUser(id); err != nil {
		utils.ResponseError(w, err)
		return
	}
	utils.ResponseSuccess(w, map[string]bool{"deleted": true})
}

func (u *Users) ChangePassword(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		utils.ResponseErrorStatus(w, errors.New("invalid user id"), 400)
		return
	}

	var req models.ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.ResponseError(w, err)
		return
	}

	if req.NewPassword == "" || len(req.NewPassword) < 6 {
		utils.ResponseErrorStatus(w, errors.New("new password must be at least 6 characters"), 400)
		return
	}

	caller := utils.UserFromContext(r.Context())
	if caller == nil {
		utils.ResponseErrorStatus(w, errors.New("unauthorized"), 401)
		return
	}

	isSelf := caller.ID == id
	isAdmin := caller.Role == "admin"

	if !isSelf && !isAdmin {
		utils.ResponseErrorStatus(w, fmt.Errorf("forbidden"), 403)
		return
	}

	if isSelf {
		// Self-service: must provide old password
		if req.OldPassword == "" {
			utils.ResponseErrorStatus(w, errors.New("old password is required"), 400)
			return
		}
		if err := u.Store.ChangePassword(id, req.OldPassword, req.NewPassword); err != nil {
			utils.ResponseErrorStatus(w, err, 400)
			return
		}
	} else {
		// Admin override: no old password needed
		if err := u.Store.AdminChangePassword(id, req.NewPassword); err != nil {
			utils.ResponseError(w, err)
			return
		}
	}

	utils.ResponseSuccess(w, map[string]bool{"changed": true})
}
