package cache

import (
	"sync"
	"time"
)

// PermissionCache хранит права ролей в памяти для быстрого доступа
type PermissionCache struct {
	cache         map[string]*CacheEntry
	mu            sync.RWMutex
	ttl           time.Duration
	cleanupTicker *time.Ticker
}

type CacheEntry struct {
	Permissions []string
	ExpiresAt   time.Time
}

var (
	permCache *PermissionCache
	once      sync.Once
)

// GetCache возвращает singleton экземпляр кэша
func GetCache() *PermissionCache {
	once.Do(func() {
		permCache = &PermissionCache{
			cache: make(map[string]*CacheEntry),
			ttl:   5 * time.Minute,
		}
		// Запускаем фоновую очистку устаревших записей
		permCache.startCleanup()
	})
	return permCache
}

// Get получает права роли из кэша
func (pc *PermissionCache) Get(roleCode string) ([]string, bool) {
	pc.mu.RLock()
	defer pc.mu.RUnlock()

	entry, exists := pc.cache[roleCode]
	if !exists {
		return nil, false
	}

	// Проверяем не истек ли срок действия
	if time.Now().After(entry.ExpiresAt) {
		return nil, false
	}

	return entry.Permissions, true
}

// Set сохраняет права роли в кэш
func (pc *PermissionCache) Set(roleCode string, permissions []string) {
	pc.mu.Lock()
	defer pc.mu.Unlock()

	pc.cache[roleCode] = &CacheEntry{
		Permissions: permissions,
		ExpiresAt:   time.Now().Add(pc.ttl),
	}
}

// Invalidate удаляет права роли из кэша (при изменении)
func (pc *PermissionCache) Invalidate(roleCode string) {
	pc.mu.Lock()
	defer pc.mu.Unlock()

	delete(pc.cache, roleCode)
}

// InvalidateAll очищает весь кэш
func (pc *PermissionCache) InvalidateAll() {
	pc.mu.Lock()
	defer pc.mu.Unlock()

	pc.cache = make(map[string]*CacheEntry)
}

// startCleanup запускает фоновую задачу очистки устаревших записей
func (pc *PermissionCache) startCleanup() {
	pc.cleanupTicker = time.NewTicker(1 * time.Minute)

	go func() {
		for range pc.cleanupTicker.C {
			pc.cleanup()
		}
	}()
}

// cleanup удаляет устаревшие записи из кэша
func (pc *PermissionCache) cleanup() {
	pc.mu.Lock()
	defer pc.mu.Unlock()

	now := time.Now()
	for roleCode, entry := range pc.cache {
		if now.After(entry.ExpiresAt) {
			delete(pc.cache, roleCode)
		}
	}
}

// GetStats возвращает статистику кэша (для мониторинга)
func (pc *PermissionCache) GetStats() map[string]int {
	pc.mu.RLock()
	defer pc.mu.RUnlock()

	return map[string]int{
		"total_entries": len(pc.cache),
	}
}
