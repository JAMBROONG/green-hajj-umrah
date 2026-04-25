/**
 * Rate limiter dengan abstraksi store yang pluggable.
 *
 * IMPLEMENTASI DEFAULT: in-memory (Map). Cocok untuk deployment single-process
 * (mis. cPanel, single-pod Docker tanpa replicas). TIDAK aman dipakai langsung
 * di multi-instance (PM2 cluster, Kubernetes >1 replica, serverless), karena
 * tiap process punya counter sendiri sehingga limit efektifnya menjadi
 * `limit × jumlah_instance`.
 *
 * UPGRADE PATH UNTUK PRODUCTION MULTI-INSTANCE:
 *   1. Implement RateLimitStore di Redis (mis. ioredis sliding-window):
 *        const store: RateLimitStore = createRedisStore(redisClient)
 *   2. Set `setRateLimitStore(store)` di server bootstrap (app entry).
 *   Setelah itu `rateLimiter.check(...)` otomatis pakai backend baru tanpa
 *   ubah call site di route handler.
 *
 * MITIGASI SAAT INI (single-process):
 *   - Limit yang ketat (mis. signup 5/jam/IP, OTP 3/30min/email).
 *   - Cleanup otomatis tiap 10 menit untuk batasi memory growth.
 *   - Warning log saat limit hit, untuk monitoring.
 */

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export interface RateLimitStore {
  check(key: string, limit: number, windowMs: number, blockMs: number): Promise<RateLimitResult> | RateLimitResult;
  reset(key: string): Promise<void> | void;
}

interface Entry {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

class InMemoryStore implements RateLimitStore {
  private readonly store = new Map<string, Entry>();

  constructor() {
    const interval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
    if (typeof interval === 'object' && interval.unref) interval.unref();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      const maxAge = entry.blockedUntil
        ? entry.blockedUntil + 60_000
        : entry.windowStart + 2 * 60 * 60 * 1000;
      if (now > maxAge) this.store.delete(key);
    }
  }

  check(key: string, limit: number, windowMs: number, blockMs: number): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);

    if (entry?.blockedUntil !== undefined) {
      if (now < entry.blockedUntil) {
        return { allowed: false, retryAfterMs: entry.blockedUntil - now };
      }
      this.store.delete(key);
    }

    if (!entry || now - entry.windowStart >= windowMs) {
      this.store.set(key, { count: 1, windowStart: now });
      return { allowed: true };
    }

    entry.count += 1;

    if (entry.count > limit) {
      entry.blockedUntil = now + blockMs;
      // Log untuk monitoring — kalau key sama bolak-balik nge-block, mungkin
      // attack atau bug di client.
      console.warn(`[rate-limit] Key blocked: ${key} (count=${entry.count}, limit=${limit})`);
      return { allowed: false, retryAfterMs: blockMs };
    }

    return { allowed: true };
  }

  reset(key: string): void {
    this.store.delete(key);
  }
}

let activeStore: RateLimitStore = new InMemoryStore();

/**
 * Inject store custom (mis. Redis) di bootstrap. Idempotent — panggil
 * sekali saja di awal aplikasi.
 */
export function setRateLimitStore(store: RateLimitStore): void {
  activeStore = store;
}

class RateLimiter {
  /**
   * Check and increment the counter for `key`.
   *
   * Returns `{ allowed: true }` while under the limit.
   * Returns `{ allowed: false, retryAfterMs }` once the limit is exceeded.
   *
   * NOTE: blocking here is sync untuk in-memory store. Kalau implementasi
   * RateLimitStore custom return Promise, hasilnya akan jadi Promise.
   * Semua call site existing pakai sync access — kalau migrasi ke Redis,
   * tinggal `await rateLimiter.check(...)`.
   */
  check(
    key: string,
    limit: number,
    windowMs: number,
    blockMs: number = windowMs,
  ): RateLimitResult {
    const result = activeStore.check(key, limit, windowMs, blockMs);
    // Untuk in-memory store, hasilnya selalu sync. Kalau ke depan ada
    // store async, helper ini tetap return type sync — call site lama
    // tetap aman. Untuk Redis, gunakan `checkAsync` di bawah.
    if (result instanceof Promise) {
      throw new Error('rateLimiter.check() called dengan async store — gunakan checkAsync()');
    }
    return result;
  }

  async checkAsync(
    key: string,
    limit: number,
    windowMs: number,
    blockMs: number = windowMs,
  ): Promise<RateLimitResult> {
    return activeStore.check(key, limit, windowMs, blockMs);
  }

  reset(key: string): void | Promise<void> {
    return activeStore.reset(key);
  }
}

// Module-level singleton — shared across all API route calls in the same process
export const rateLimiter = new RateLimiter();
