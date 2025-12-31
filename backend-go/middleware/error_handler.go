package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// AppError представляет ошибку приложения с кодом статуса
type AppError struct {
	Code    int
	Message string
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return e.Message + ": " + e.Err.Error()
	}
	return e.Message
}

// NewAppError создает новую ошибку приложения
func NewAppError(code int, message string, err error) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Err:     err,
	}
}

// ErrorHandler - middleware для централизованной обработки ошибок
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Проверяем наличие ошибок после выполнения обработчика
		if len(c.Errors) > 0 {
			err := c.Errors.Last()

			// Логируем ошибку
			log.Printf("❌ Error: %v", err.Err)

			// Определяем тип ошибки и возвращаем соответствующий ответ
			switch e := err.Err.(type) {
			case *AppError:
				c.JSON(e.Code, gin.H{
					"error":   e.Message,
					"details": getErrorDetails(e.Err),
				})
			default:
				// Для неизвестных ошибок возвращаем 500
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Внутренняя ошибка сервера",
				})
			}

			// Прерываем дальнейшую обработку
			c.Abort()
		}
	}
}

// getErrorDetails возвращает детали ошибки (если есть)
func getErrorDetails(err error) string {
	if err != nil {
		return err.Error()
	}
	return ""
}

// RecoveryMiddleware - middleware для обработки паник
func RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("🚨 PANIC: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Критическая ошибка сервера",
				})
				c.Abort()
			}
		}()
		c.Next()
	}
}
