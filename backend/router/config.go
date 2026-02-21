package router

import (
	"khairul169/garage-webui/schema"
	"khairul169/garage-webui/utils"
	"net/http"
)

type Config struct{}

// GetAll returns a sanitized config without secrets (admin_token, rpc_secret, metrics_token).
func (c *Config) GetAll(w http.ResponseWriter, r *http.Request) {
	cfg := utils.Garage.Config
	safe := schema.SafeConfig{
		S3API: cfg.S3API,
		S3Web: cfg.S3Web,
		Admin: schema.SafeAdmin{
			APIBindAddr: cfg.Admin.APIBindAddr,
		},
	}
	utils.ResponseSuccess(w, safe)
}
