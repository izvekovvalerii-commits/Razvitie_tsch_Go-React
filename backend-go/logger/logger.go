package logger

import (
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

var Logger zerolog.Logger

// Init инициализирует глобальный логгер
func Init(environment string) {
	// Настройка вывода
	zerolog.TimeFieldFormat = time.RFC3339

	if environment == "development" {
		// В режиме разработки - красивый вывод в консоль
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: "15:04:05"})
	} else {
		// В production - JSON формат
		log.Logger = zerolog.New(os.Stdout).With().Timestamp().Logger()
	}

	// Глобальный логгер
	Logger = log.Logger.With().
		Str("service", "portal-razvitie").
		Logger()

	// Установка уровня логирования
	if environment == "production" {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	} else {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	}

	Logger.Info().
		Str("environment", environment).
		Msg("Logger initialized")
}

// Info создает Info-уровень лог
func Info() *zerolog.Event {
	return Logger.Info()
}

// Debug создает Debug-уровень лог
func Debug() *zerolog.Event {
	return Logger.Debug()
}

// Error создает Error-уровень лог
func Error() *zerolog.Event {
	return Logger.Error()
}

// Warn создает Warn-уровень лог
func Warn() *zerolog.Event {
	return Logger.Warn()
}

// Fatal создает Fatal-уровень лог (с os.Exit(1))
func Fatal() *zerolog.Event {
	return Logger.Fatal()
}
