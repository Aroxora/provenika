/**
 * Rate Limiter for API Requests
 *
 * Implements a token bucket algorithm for rate limiting API requests
 * to scientific data sources.
 */

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  readonly requestsPerSecond: number;
  readonly burstSize?: number;
}

/**
 * Token bucket rate limiter
 */
export class RateLimiter {
  private readonly requestsPerSecond: number;
  private readonly burstSize: number;
  private tokens: number;
  private lastRefill: number;
  private readonly queue: Array<() => void> = [];
  private processing = false;

  constructor(requestsPerSecond: number, burstSize?: number) {
    this.requestsPerSecond = Math.max(1, requestsPerSecond);
    this.burstSize = burstSize ?? Math.max(1, Math.ceil(requestsPerSecond));
    this.tokens = this.burstSize;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(): Promise<void> {
    return new Promise<void>(resolve => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  /**
   * Try to acquire a token immediately
   * Returns true if successful, false otherwise
   */
  tryAcquire(): boolean {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    if (this.processing) return;
    this.processing = true;

    const processNext = (): void => {
      if (this.queue.length === 0) {
        this.processing = false;
        return;
      }

      this.refillTokens();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        const resolve = this.queue.shift();
        resolve?.();
        // Process next immediately if we have tokens
        if (this.tokens >= 1 && this.queue.length > 0) {
          setImmediate(processNext);
        } else if (this.queue.length > 0) {
          // Wait for token refill
          const waitTime = this.getWaitTime();
          setTimeout(processNext, waitTime);
        } else {
          this.processing = false;
        }
      } else {
        // Wait for tokens to refill
        const waitTime = this.getWaitTime();
        setTimeout(processNext, waitTime);
      }
    };

    processNext();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * this.requestsPerSecond;

    if (tokensToAdd >= 1) {
      this.tokens = Math.min(this.burstSize, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Calculate wait time until next token is available
   */
  private getWaitTime(): number {
    if (this.tokens >= 1) return 0;
    const tokensNeeded = 1 - this.tokens;
    return Math.ceil((tokensNeeded / this.requestsPerSecond) * 1000);
  }

  /**
   * Get current number of available tokens
   */
  getAvailableTokens(): number {
    this.refillTokens();
    return this.tokens;
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.burstSize;
    this.lastRefill = Date.now();
    // Clear queue and resolve all waiters
    while (this.queue.length > 0) {
      const resolve = this.queue.shift();
      resolve?.();
    }
    this.processing = false;
  }
}

/**
 * Adaptive rate limiter that adjusts based on response headers
 */
export class AdaptiveRateLimiter extends RateLimiter {
  private currentLimit: number;
  private remaining: number;
  private resetTime: number;

  constructor(initialRequestsPerSecond: number) {
    super(initialRequestsPerSecond);
    this.currentLimit = initialRequestsPerSecond;
    this.remaining = initialRequestsPerSecond;
    this.resetTime = Date.now() + 1000;
  }

  /**
   * Update rate limit based on API response headers
   */
  updateFromHeaders(headers: Record<string, string>): void {
    // Common rate limit header patterns
    const limitHeader = headers['x-ratelimit-limit'] ||
                        headers['ratelimit-limit'] ||
                        headers['x-rate-limit-limit'];

    const remainingHeader = headers['x-ratelimit-remaining'] ||
                            headers['ratelimit-remaining'] ||
                            headers['x-rate-limit-remaining'];

    const resetHeader = headers['x-ratelimit-reset'] ||
                        headers['ratelimit-reset'] ||
                        headers['x-rate-limit-reset'];

    if (limitHeader) {
      const limit = parseInt(limitHeader, 10);
      if (!isNaN(limit) && limit > 0) {
        this.currentLimit = limit;
      }
    }

    if (remainingHeader) {
      const remaining = parseInt(remainingHeader, 10);
      if (!isNaN(remaining)) {
        this.remaining = remaining;
      }
    }

    if (resetHeader) {
      const reset = parseInt(resetHeader, 10);
      if (!isNaN(reset)) {
        // Handle both Unix timestamp and seconds until reset
        this.resetTime = reset > Date.now() / 1000 + 86400
          ? reset * 1000 // Already in milliseconds or Unix timestamp
          : reset < 86400
            ? Date.now() + reset * 1000 // Seconds until reset
            : reset * 1000; // Unix timestamp in seconds
      }
    }
  }

  /**
   * Check if we should back off based on remaining quota
   */
  shouldBackoff(): boolean {
    return this.remaining <= 0 && Date.now() < this.resetTime;
  }

  /**
   * Get time to wait before next request
   */
  getBackoffTime(): number {
    if (!this.shouldBackoff()) return 0;
    return Math.max(0, this.resetTime - Date.now());
  }

  /**
   * Get current rate limit status
   */
  getStatus(): { limit: number; remaining: number; resetTime: number } {
    return {
      limit: this.currentLimit,
      remaining: this.remaining,
      resetTime: this.resetTime,
    };
  }
}

/**
 * Composite rate limiter for multiple API endpoints
 */
export class CompositeRateLimiter {
  private readonly limiters: Map<string, RateLimiter> = new Map();
  private readonly defaultLimiter: RateLimiter;

  constructor(defaultRequestsPerSecond: number) {
    this.defaultLimiter = new RateLimiter(defaultRequestsPerSecond);
  }

  /**
   * Set rate limit for a specific endpoint pattern
   */
  setEndpointLimit(pattern: string, requestsPerSecond: number): void {
    this.limiters.set(pattern, new RateLimiter(requestsPerSecond));
  }

  /**
   * Acquire a token for a specific endpoint
   */
  async acquire(endpoint: string): Promise<void> {
    const limiter = this.getLimiterForEndpoint(endpoint);
    return limiter.acquire();
  }

  /**
   * Get the appropriate rate limiter for an endpoint
   */
  private getLimiterForEndpoint(endpoint: string): RateLimiter {
    for (const [pattern, limiter] of this.limiters) {
      if (endpoint.includes(pattern) || new RegExp(pattern).test(endpoint)) {
        return limiter;
      }
    }
    return this.defaultLimiter;
  }

  /**
   * Reset all rate limiters
   */
  reset(): void {
    this.defaultLimiter.reset();
    for (const limiter of this.limiters.values()) {
      limiter.reset();
    }
  }
}
