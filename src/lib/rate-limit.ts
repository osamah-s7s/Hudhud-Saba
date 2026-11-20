/**
 * Basic in-memory rate limiter (sliding window log per key).
 *
 * HONEST LIMITATION: on Vercel each serverless function instance has its own
 * memory. The counts below are per instance, are not shared between
 * concurrent instances or regions, and are lost on every cold start or
 * redeploy. This is best-effort "basic" protection against a single client
 * hammering the endpoint, not a guarantee.
 *
 * Upgrade path (no code dependency needed for the first option):
 *  - Add a Vercel Firewall rate-limit rule for `POST /api/submit` in the
 *    project's Firewall settings, which is enforced before the function runs.
 *  - Or keep counts in a shared store (e.g. a Redis/KV integration from the
 *    Vercel Marketplace) instead of this Map.
 */

export interface RateLimitOptions {
  /** Max requests allowed per key inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Upper bound on tracked keys, so memory cannot grow without limit. */
  maxKeys: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next request from this key would be allowed (0 if allowed). */
  retryAfterSeconds: number;
}

export function createRateLimiter({ limit, windowMs, maxKeys }: RateLimitOptions) {
  // key -> timestamps (ms) of recent hits, oldest first. Map keeps insertion
  // order, which we use to evict the least recently active keys first.
  const hits = new Map<string, number[]>();

  function prune(now: number) {
    for (const [key, times] of hits) {
      if (times.length === 0 || times[times.length - 1] <= now - windowMs) hits.delete(key);
    }
    // Still too many active keys: drop the least recently active ones.
    while (hits.size > maxKeys) {
      const oldest = hits.keys().next().value;
      if (oldest === undefined) break;
      hits.delete(oldest);
    }
  }

  return function check(key: string, now = Date.now()): RateLimitResult {
    const recent = (hits.get(key) ?? []).filter((t) => t > now - windowMs);

    if (recent.length >= limit) {
      hits.set(key, recent);
      const retryAfterMs = recent[0] + windowMs - now;
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
    }

    recent.push(now);
    // Re-insert so this key becomes the most recently active one.
    hits.delete(key);
    hits.set(key, recent);
    if (hits.size > maxKeys) prune(now);
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

/**
 * Best-effort client IP, used only as a rate-limit key in memory; it is
 * never logged or emailed. Headers that Vercel's edge sets itself (and that
 * a visitor cannot forge there) come first; a plain x-forwarded-for is the
 * last resort for other hosts. With no header at all (e.g. `next start` with
 * no proxy) every visitor shares the key "unknown".
 */
export function clientIp(headers: Headers): string {
  for (const name of ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"]) {
    const first = headers.get(name)?.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return "unknown";
}
