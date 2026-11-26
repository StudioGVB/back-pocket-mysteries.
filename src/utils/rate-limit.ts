import { headers } from 'next/headers';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  __bpmRateLimitBuckets?: Map<string, RateLimitBucket>;
};

function getBuckets(): Map<string, RateLimitBucket> {
  if (!globalForRateLimit.__bpmRateLimitBuckets) {
    globalForRateLimit.__bpmRateLimitBuckets = new Map<string, RateLimitBucket>();
  }
  return globalForRateLimit.__bpmRateLimitBuckets;
}

export async function getCallerIpAddress(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return h.get('x-real-ip')?.trim() || 'unknown-ip';
  } catch {
    return 'unknown-ip';
  }
}

/**
 * Checks if a bucket key (e.g. `failed-pin:${ip}`) has exceeded `maxCount` within `windowMs`.
 * When `incrementOnCheck` is false, it only checks if currently blocked without incrementing
 * (used for Kahoot-style PIN lookup where valid PINs never increment the counter, so 20+ guests
 * on the same home Wi-Fi can join simultaneously without ever being throttled).
 */
export function checkRateLimitBucket(params: {
  key: string;
  maxCount: number;
  windowMs: number;
  increment?: boolean;
}): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const buckets = getBuckets();
  const now = Date.now();

  // Periodic cleanup of expired buckets
  if (buckets.size > 2000) {
    for (const [k, v] of buckets.entries()) {
      if (now >= v.resetAt) buckets.delete(k);
    }
  }

  let bucket = buckets.get(params.key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = {
      count: 0,
      resetAt: now + params.windowMs,
    };
    buckets.set(params.key, bucket);
  }

  if (bucket.count >= params.maxCount) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  if (params.increment !== false) {
    bucket.count += 1;
  }

  return {
    allowed: true,
    remaining: Math.max(0, params.maxCount - bucket.count),
    retryAfterSeconds: 0,
  };
}
