package helpers

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ParseIDParam парсит ID из URL параметра
func ParseIDParam(ctx *gin.Context, paramName string) (uint, error) {
	idStr := ctx.Param(paramName)
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		return 0, errors.New("invalid " + paramName)
	}
	return uint(id), nil
}

// ParseOptionalIDParam парсит опциональный ID из query параметра
func ParseOptionalIDParam(ctx *gin.Context, paramName string) (uint, error) {
	idStr := ctx.Query(paramName)
	if idStr == "" {
		return 0, nil
	}
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		return 0, errors.New("invalid " + paramName)
	}
	return uint(id), nil
}
