/**
 * Lightweight in-memory rate limiter for server actions.
 *
 * NOTE: This is per-process. For multi-instance deployments, use a
 * distributed store like Redis or Supabase-based rate limiting.
 * This is still useful for single-instance protection and as a
 * first line of defense.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5_000;
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS).unref?.();
}

export interface RateLimitConfig {
  /** Unique key identifying the caller (e.g., user ID, IP, or action+user combo) */
  key: string;
  /** Maximum number of calls allowed within the window */
  max: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and consume a rate limit token.
 * Returns whether the call is allowed, plus remaining quota and reset time.
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  let entry = store.get(config.key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(config.key, entry);
  }

  entry.count += 1;

  const allowed = entry.count <= config.max;
  const remaining = Math.max(0, config.max - entry.count);

  return { allowed, remaining, resetAt: entry.resetAt };
}

/**
 * Higher-order wrapper that applies rate limiting to a server action.
 * Throws an error with a descriptive message when the limit is exceeded.
 */
export function withRateLimit<T extends (...args: any[]) => any>(
  fn: T,
  config: Omit<RateLimitConfig, 'key'> & { getKey: (...args: Parameters<T>) => string }
): (...args: Parameters<T>) => ReturnType<T> {
  return ((...args: Parameters<T>) => {
    const key = config.getKey(...args);
    const result = checkRateLimit({ key, max: config.max, windowMs: config.windowMs });

    if (!result.allowed) {
      const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded. Try again in ${retryAfterSec}s.`);
    }

    return fn(...args);
  }) as T;
}
