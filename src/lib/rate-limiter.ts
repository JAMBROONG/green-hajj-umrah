/**
 * In-memory rate limiter.
 * Suitable for single-instance deployments (cPanel, etc.).
 * For multi-instance / serverless, replace with a Redis-backed solution.
 */

interface Entry {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

class RateLimiter {
  private readonly store = new Map<string, Entry>();

  constructor() {
    // Periodically purge stale entries to prevent memory growth
    const interval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
    // Don't prevent Node.js from exiting cleanly
    if (typeof interval === 'object' && interval.unref) interval.unref();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      const maxAge = entry.blockedUntil
        ? entry.blockedUntil + 60_000           // keep a bit past block expiry
        : entry.windowStart + 2 * 60 * 60 * 1000; // 2-hour hard cap
      if (now > maxAge) this.store.delete(key);
    }
  }

  /**
   * Check and increment the counter for `key`.
   *
   * Returns `{ allowed: true }` while under the limit.
   * Returns `{ allowed: false, retryAfterMs }` once the limit is exceeded.
   *
   * @param key       Unique identifier (e.g. `otp:user@example.com`)
   * @param limit     Max requests allowed within `windowMs`
   * @param windowMs  Sliding-window duration in milliseconds
   * @param blockMs   How long to block after the limit is hit (defaults to `windowMs`)
   */
  check(
    key: string,
    limit: number,
    windowMs: number,
    blockMs: number = windowMs,
  ): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    // Currently in a block period
    if (entry?.blockedUntil !== undefined) {
      if (now < entry.blockedUntil) {
        return { allowed: false, retryAfterMs: entry.blockedUntil - now };
      }
      // Block has expired — start fresh
      this.store.delete(key);
    }

    if (!entry || now - entry.windowStart >= windowMs) {
      // First request in a new window
      this.store.set(key, { count: 1, windowStart: now });
      return { allowed: true };
    }

    entry.count += 1;

    if (entry.count > limit) {
      entry.blockedUntil = now + blockMs;
      return { allowed: false, retryAfterMs: blockMs };
    }

    return { allowed: true };
  }

  /**
   * Reset the counter for `key` (e.g. after a successful login/verification).
   */
  reset(key: string): void {
    this.store.delete(key);
  }
}

// Module-level singleton — shared across all API route calls in the same process
export const rateLimiter = new RateLimiter();
