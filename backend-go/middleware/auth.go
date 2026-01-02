package middleware

import (
	"net/http"
	"portal-razvitie/cache"
	"portal-razvitie/database"
	"portal-razvitie/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware extracts the user ID from the X-User-ID header and loads user & permissions from DB
func AuthMiddleware() gin.HandlerFunc {
	permCache := cache.GetCache()

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

		var user models.User
		if err := database.DB.First(&user, uid).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// Пытаемся получить права из кэша
		perms, found := permCache.Get(user.Role)

		if !found {
			// Cache miss - загружаем из БД
			var role models.Role
			if err := database.DB.Preload("Permissions").Where(&models.Role{Code: user.Role}).First(&role).Error; err == nil {
				perms = make([]string, 0, len(role.Permissions))
				for _, p := range role.Permissions {
					perms = append(perms, p.Code)
				}
				// Сохраняем в кэш
				permCache.Set(user.Role, perms)
			} else {
				perms = []string{}
			}
		}

		c.Set("user", &user)
		c.Set("permissions", perms)
		c.Next()
	}
}

// RequirePermission checks if the authenticated user has the specified permission (from Context)
func RequirePermission(perm string) gin.HandlerFunc {
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
