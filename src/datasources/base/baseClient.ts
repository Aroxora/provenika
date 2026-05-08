/**
 * Base Client for Scientific Data Sources
 *
 * Provides common HTTP functionality, error handling, and retry logic
 * for all cancer research data source clients.
 */

import { RateLimiter } from './rateLimiter.js';
import { CacheManager } from './cacheManager.js';

/**
 * Configuration for a data source client
 */
export interface DataSourceConfig {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly timeout?: number;
  readonly retries?: number;
  readonly retryDelay?: number;
  readonly rateLimitPerSecond?: number;
  readonly cacheTtlMs?: number;
  readonly userAgent?: string;
}

/**
 * HTTP request options
 */
export interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly headers?: Record<string, string>;
  readonly body?: string | Record<string, unknown>;
  readonly params?: Record<string, string | number | boolean | undefined>;
  readonly timeout?: number;
  readonly skipCache?: boolean;
}

/**
 * Response from a data source
 */
export interface DataSourceResponse<T> {
  readonly data: T;
  readonly status: number;
  readonly cached: boolean;
  readonly headers?: Record<string, string>;
}

/**
 * Error from a data source
 */
export class DataSourceError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'DataSourceError';
  }
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  rateLimitPerSecond: 10,
  cacheTtlMs: 300000, // 5 minutes
  userAgent: 'CancerCore/1.0',
};

/**
 * Base client class for scientific data sources
 */
export abstract class BaseClient {
  protected readonly config: Required<DataSourceConfig>;
  protected readonly rateLimiter: RateLimiter;
  protected readonly cache: CacheManager;
  protected readonly sourceName: string;

  constructor(config: DataSourceConfig, sourceName: string) {
    this.sourceName = sourceName;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      apiKey: config.apiKey ?? '',
    };

    this.rateLimiter = new RateLimiter(this.config.rateLimitPerSecond);
    this.cache = new CacheManager(this.config.cacheTtlMs);
  }

  /**
   * Make an HTTP request with retries, rate limiting, and caching
   */
  protected async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<DataSourceResponse<T>> {
    const method = options.method ?? 'GET';
    const url = this.buildUrl(endpoint, options.params);
    const cacheKey = this.getCacheKey(method, url, options.body);

    // Check cache for GET requests
    if (method === 'GET' && !options.skipCache) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== null) {
        return { data: cached, status: 200, cached: true };
      }
    }

    // Wait for rate limiter
    await this.rateLimiter.acquire();

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const response = await this.executeRequest<T>(url, method, options);

        // Cache successful GET responses
        if (method === 'GET' && response.status >= 200 && response.status < 300) {
          this.cache.set(cacheKey, response.data);
        }

        return { ...response, cached: false };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt === this.config.retries) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    throw new DataSourceError(
      `Request to ${this.sourceName} failed: ${lastError?.message}`,
      this.sourceName,
      undefined,
      'REQUEST_FAILED',
      false
    );
  }

  /**
   * Execute a single HTTP request
   */
  private async executeRequest<T>(
    url: string,
    method: string,
    options: RequestOptions
  ): Promise<DataSourceResponse<T>> {
    const headers: Record<string, string> = {
      'User-Agent': this.config.userAgent,
      'Accept': 'application/json',
      ...options.headers,
    };

    if (this.config.apiKey) {
      this.addAuthHeader(headers);
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (options.body && (method === 'POST' || method === 'PUT')) {
      if (typeof options.body === 'string') {
        fetchOptions.body = options.body;
      } else {
        fetchOptions.body = JSON.stringify(options.body);
        headers['Content-Type'] = 'application/json';
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeout ?? this.config.timeout
    );

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new DataSourceError(
          `HTTP ${response.status}: ${response.statusText}`,
          this.sourceName,
          response.status,
          `HTTP_${response.status}`,
          response.status >= 500 || response.status === 429
        );
      }

      const data = await response.json() as T;

      return {
        data,
        status: response.status,
        cached: false,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Build URL with query parameters
   */
  protected buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const base = this.config.baseUrl.endsWith('/')
      ? this.config.baseUrl.slice(0, -1)
      : this.config.baseUrl;

    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${base}${path}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Generate cache key for a request
   */
  protected getCacheKey(
    method: string,
    url: string,
    body?: string | Record<string, unknown>
  ): string {
    const bodyHash = body ? JSON.stringify(body) : '';
    return `${this.sourceName}:${method}:${url}:${bodyHash}`;
  }

  /**
   * Add authentication header - override in subclasses for different auth methods
   */
  protected addAuthHeader(headers: Record<string, string>): void {
    headers['Authorization'] = `Bearer ${this.config.apiKey}`;
  }

  /**
   * Check if an error is retryable
   */
  protected isRetryableError(error: Error): boolean {
    if (error instanceof DataSourceError) {
      return error.retryable;
    }

    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('rate limit')
    );
  }

  /**
   * Sleep for a specified duration
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return this.cache.getStats();
  }

  /**
   * Test connectivity to the data source
   */
  abstract testConnection(): Promise<boolean>;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly hasMore: boolean;
}

/**
 * Helper to create paginated response
 */
export function createPaginatedResponse<T>(
  items: readonly T[],
  total: number,
  offset: number,
  limit: number
): PaginatedResponse<T> {
  return {
    items,
    total,
    offset,
    limit,
    hasMore: offset + items.length < total,
  };
}
