/**
 * Cache Manager for API Responses
 *
 * Provides in-memory caching with TTL for scientific data source responses.
 */

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
  readonly createdAt: number;
  readonly accessCount: number;
  readonly lastAccessed: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  readonly defaultTtlMs: number;
  readonly maxEntries?: number;
  readonly cleanupIntervalMs?: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  readonly size: number;
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly evictions: number;
}

/**
 * LRU cache manager with TTL support
 */
export class CacheManager {
  private readonly cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(defaultTtlMs: number = 300000, maxEntries: number = 1000) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Get a cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access tracking
    this.cache.set(key, {
      ...entry,
      accessCount: entry.accessCount + 1,
      lastAccessed: Date.now(),
    });

    this.hits++;
    return entry.value;
  }

  /**
   * Set a cached value
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    const now = Date.now();
    const ttl = ttlMs ?? this.defaultTtlMs;

    this.cache.set(key, {
      value,
      expiresAt: now + ttl,
      createdAt: now,
      accessCount: 1,
      lastAccessed: now,
    });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a cached value
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      evictions: this.evictions,
    };
  }

  /**
   * Get all keys matching a pattern
   */
  keys(pattern?: string | RegExp): string[] {
    const allKeys = Array.from(this.cache.keys());

    if (!pattern) {
      return allKeys;
    }

    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return allKeys.filter(key => regex.test(key));
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string | RegExp): number {
    const keys = this.keys(pattern);
    for (const key of keys) {
      this.cache.delete(key);
    }
    return keys.length;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.evictions++;
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    // Cleanup every minute
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000);

    // Don't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Dispose of the cache manager
   */
  dispose(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}

/**
 * Tiered cache with memory and optional persistent layers
 */
export class TieredCacheManager {
  private readonly memory: CacheManager;
  private readonly persistent: PersistentCacheAdapter | null;

  constructor(
    memoryConfig: { ttlMs: number; maxEntries: number },
    persistent?: PersistentCacheAdapter
  ) {
    this.memory = new CacheManager(memoryConfig.ttlMs, memoryConfig.maxEntries);
    this.persistent = persistent ?? null;
  }

  /**
   * Get from cache, checking memory first then persistent
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory first
    const memoryResult = this.memory.get<T>(key);
    if (memoryResult !== null) {
      return memoryResult;
    }

    // Check persistent cache
    if (this.persistent) {
      const persistentResult = await this.persistent.get<T>(key);
      if (persistentResult !== null) {
        // Promote to memory cache
        this.memory.set(key, persistentResult);
        return persistentResult;
      }
    }

    return null;
  }

  /**
   * Set in both memory and persistent caches
   */
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.memory.set(key, value, ttlMs);

    if (this.persistent) {
      await this.persistent.set(key, value, ttlMs);
    }
  }

  /**
   * Delete from both caches
   */
  async delete(key: string): Promise<void> {
    this.memory.delete(key);

    if (this.persistent) {
      await this.persistent.delete(key);
    }
  }

  /**
   * Clear both caches
   */
  async clear(): Promise<void> {
    this.memory.clear();

    if (this.persistent) {
      await this.persistent.clear();
    }
  }

  /**
   * Get combined statistics
   */
  getStats(): CacheStats {
    return this.memory.getStats();
  }

  /**
   * Dispose of both caches
   */
  async dispose(): Promise<void> {
    this.memory.dispose();

    if (this.persistent) {
      await this.persistent.dispose();
    }
  }
}

/**
 * Interface for persistent cache adapters
 */
export interface PersistentCacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  dispose(): Promise<void>;
}

/**
 * Null cache adapter for when caching is disabled
 */
export class NullCacheAdapter implements PersistentCacheAdapter {
  async get<T>(): Promise<T | null> {
    return null;
  }

  async set(): Promise<void> {
    // No-op
  }

  async delete(): Promise<void> {
    // No-op
  }

  async clear(): Promise<void> {
    // No-op
  }

  async dispose(): Promise<void> {
    // No-op
  }
}
