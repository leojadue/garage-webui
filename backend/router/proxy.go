package router

import (
	"fmt"
	"khairul169/garage-webui/utils"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

// headersToStrip are client headers that must not be forwarded to the Admin API.
var headersToStrip = []string{
	"Cookie",
	"X-Forwarded-For",
	"X-Forwarded-Host",
	"X-Forwarded-Proto",
	"X-Real-Ip",
}

func ProxyHandler(w http.ResponseWriter, r *http.Request) {
	target, err := url.Parse(utils.Garage.GetAdminEndpoint())
	if err != nil {
		utils.ResponseError(w, err)
		return
	}

	proxy := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(target)
			r.Out.URL.Path = strings.TrimPrefix(r.In.URL.Path, "/api")
			// Strip sensitive client headers before forwarding
			for _, h := range headersToStrip {
				r.Out.Header.Del(h)
			}
			r.Out.Header.Set("Authorization", fmt.Sprintf("Bearer %s", utils.Garage.GetAdminKey()))
		},
	}

	proxy.ServeHTTP(w, r)
}

// SafeProxyHandler proxies read-only requests to the Garage Admin API,
// stripping the showSecretKey query parameter to prevent secret key leakage.
func SafeProxyHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	q.Del("showSecretKey")
	r.URL.RawQuery = q.Encode()
	ProxyHandler(w, r)
}
