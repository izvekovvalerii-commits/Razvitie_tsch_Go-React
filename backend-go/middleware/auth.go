package middleware

import (
	"net/http"
	"portal-razvitie/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware extracts the user ID from the X-User-ID header and loads user & permissions from DB
func AuthMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		uidStr := c.GetHeader("X-User-ID")
		if uidStr == "" {
			uidStr = c.Query("userId")
		}

		if uidStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Missing X-User-ID header"})
			c.Abort()
			return
		}

		uid, err := strconv.Atoi(uidStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid User ID"})
			c.Abort()
			return
		}

		// Попытка получить данные из кэша
		// Note: We might want to move caching logic into AuthService completely?
		// For now, let's just use AuthService to fetch if cache miss.

		// Optimization: Check authService has cached fetch?
		// Current AuthService implementation does database fetch.
		// Let's keep cache logic here OR move it to service.
		// Moving to service is cleaner but bigger change.
		// Let's try to cache user object separately if we want, but permissions are cached.

		user, perms, err := authService.GetUserByIdWithPerms(uid)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// Cache logic for permissions was:
		// perms, found := permCache.Get(user.Role)
		// But GetUserByIdWithPerms already fetches permissions from DB.
		// If we want to use cache efficiently, we should check cache BEFORE fetch.
		// But we need User role first.

		// Let's rely on AuthService for now, or adapt cache.
		// The previous code cached permissions by ROLE code.
		// So we fetched user, got role, checked cache.

		// Let's simplify and assume GetUserByIdWithPerms is efficient enough or we delegate caching to it later.
		// Or we can just use the perms returned by AuthService.

		// If we really want to keep the cache optimization:
		// We would need GetUserById without Preload, then check Cache, then fetch perms if needed.
		// But GetUserByIdWithPerms does preloading.
		// Let's just use the returned perms and ignore middleware caching for now to reduce complexity.
		// It's a "Clean Up", simpler is better.

		c.Set("user", user)
		c.Set("permissions", perms)
		c.Next()
	}
}

// RequirePermission checks if the authenticated user has the specified permission (from Context)
func RequirePermission(perm string) gin.HandlerFunc {
	return func(c *gin.Context) {
		_, exists := c.Get("user")
		if !exists {
			c.Abort()
			return
		}

		permsInterface, exists := c.Get("permissions")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: No permissions loaded"})
			c.Abort()
			return
		}

		userPerms := permsInterface.([]string)
		hasPermission := false
		for _, p := range userPerms {
			if p == perm {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: missing permission " + perm})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireTaskEditPermission checks if user has task:edit OR task:edit_own permission
func RequireTaskEditPermission() gin.HandlerFunc {
	return func(c *gin.Context) {
		_, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		permsInterface, exists := c.Get("permissions")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: No permissions loaded"})
			c.Abort()
			return
		}

		userPerms := permsInterface.([]string)
		hasPermission := false
		for _, p := range userPerms {
			if p == "task:edit" || p == "task:edit_own" {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: missing permission task:edit or task:edit_own"})
			c.Abort()
			return
		}

		c.Next()
	}
}
