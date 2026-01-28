package router

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/common"

	"github.com/gin-gonic/gin"
)

// OAuth paths that should be rewritten to use the request's host/scheme
var oauthRedirectPaths = []string{
	"/oauth/login",
	"/oauth/consent",
	"/oauth/logout",
}

// SetHydraPublicProxyRouter proxies Hydra public endpoints through new-api.
func SetHydraPublicProxyRouter(router *gin.Engine) {
	if !common.HydraEnabled {
		return
	}

	publicURL := strings.TrimSpace(common.HydraPublicURL)
	if publicURL == "" {
		return
	}

	target, err := url.Parse(publicURL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		common.SysLog("invalid HYDRA_PUBLIC_URL: " + publicURL)
		return
	}

	router.Any("/oauth2/*any", func(c *gin.Context) {
		proxy := createHydraProxy(target, c.Request.Host, getRequestScheme(c.Request))
		proxy.ServeHTTP(c.Writer, c.Request)
	})
	router.Any("/.well-known/*any", func(c *gin.Context) {
		proxy := createHydraProxy(target, c.Request.Host, getRequestScheme(c.Request))
		proxy.ServeHTTP(c.Writer, c.Request)
	})
}

// createHydraProxy creates a reverse proxy with automatic URL rewriting for OAuth redirects.
func createHydraProxy(target *url.URL, requestHost, requestScheme string) *httputil.ReverseProxy {
	proxy := httputil.NewSingleHostReverseProxy(target)
	defaultDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		defaultDirector(req)
		if requestHost != "" {
			req.Header.Set("X-Forwarded-Host", requestHost)
		}
		if requestScheme != "" {
			req.Header.Set("X-Forwarded-Proto", requestScheme)
		}
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, proxyErr error) {
		common.SysLog(fmt.Sprintf("hydra public proxy error: method=%s url=%s host=%s target=%s err=%v", r.Method, r.URL.String(), r.Host, target.String(), proxyErr))
		http.Error(w, "bad gateway", http.StatusBadGateway)
	}

	// Always rewrite OAuth redirect URLs to use the current request's host/scheme
	if requestHost != "" {
		proxy.ModifyResponse = func(resp *http.Response) error {
			return rewriteOAuthRedirect(resp, requestHost, requestScheme)
		}
	}

	return proxy
}

func getRequestScheme(req *http.Request) string {
	if req == nil {
		return ""
	}
	if forwardedProto := parseForwardedProto(req.Header.Get("Forwarded")); forwardedProto != "" {
		return forwardedProto
	}
	if cfVisitorScheme := parseCFVisitorScheme(req.Header.Get("CF-Visitor")); cfVisitorScheme != "" {
		return cfVisitorScheme
	}
	if forwardedProto := strings.TrimSpace(req.Header.Get("X-Forwarded-Proto")); forwardedProto != "" {
		return forwardedProto
	}
	if req.TLS != nil {
		return "https"
	}
	return "http"
}

func parseForwardedProto(forwarded string) string {
	forwarded = strings.TrimSpace(forwarded)
	if forwarded == "" {
		return ""
	}
	for _, entry := range strings.Split(forwarded, ",") {
		for _, part := range strings.Split(entry, ";") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			kv := strings.SplitN(part, "=", 2)
			if len(kv) != 2 {
				continue
			}
			if strings.EqualFold(strings.TrimSpace(kv[0]), "proto") {
				proto := strings.Trim(strings.TrimSpace(kv[1]), "\"")
				if proto != "" {
					return strings.ToLower(proto)
				}
			}
		}
	}
	return ""
}

func parseCFVisitorScheme(cfVisitor string) string {
	cfVisitor = strings.TrimSpace(cfVisitor)
	if cfVisitor == "" {
		return ""
	}
	if strings.Contains(cfVisitor, "\"scheme\":\"https\"") {
		return "https"
	}
	if strings.Contains(cfVisitor, "\"scheme\":\"http\"") {
		return "http"
	}
	return ""
}

// rewriteOAuthRedirect rewrites OAuth redirect URLs (login, consent, logout) to use the request's host/scheme.
// This allows multi-domain setups without needing to configure HYDRA_BASE_HOST.
func rewriteOAuthRedirect(resp *http.Response, requestHost, requestScheme string) error {
	// Only process redirect responses
	if resp.StatusCode < 300 || resp.StatusCode >= 400 {
		return nil
	}

	location := resp.Header.Get("Location")
	if location == "" {
		return nil
	}

	// Parse the location URL
	locURL, err := url.Parse(location)
	if err != nil {
		return nil
	}

	// Check if this is an OAuth redirect path
	if !isOAuthRedirectPath(locURL.Path) {
		return nil
	}

	oldLocation := location
	needRewrite := false

	// Rewrite host if different
	if locURL.Host != requestHost && locURL.Host != "" {
		locURL.Host = requestHost
		needRewrite = true
	}

	// Rewrite scheme if different
	if requestScheme != "" && locURL.Scheme != requestScheme {
		locURL.Scheme = requestScheme
		needRewrite = true
	}

	if needRewrite {
		newLocation := locURL.String()
		resp.Header.Set("Location", newLocation)
		common.SysLog(fmt.Sprintf("hydra proxy rewrite: %s -> %s", oldLocation, newLocation))
	}

	return nil
}

// isOAuthRedirectPath checks if the path is an OAuth redirect path that should be rewritten.
func isOAuthRedirectPath(path string) bool {
	for _, p := range oauthRedirectPaths {
		if strings.HasPrefix(path, p) {
			return true
		}
	}
	return false
}
