const buckets = new Map();

function sweepExpiredBuckets(now) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function takeRateLimitToken({ key, windowMs, maxAttempts }) {
  const now = Date.now();
  sweepExpiredBuckets(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(maxAttempts - 1, 0), retryAfterSeconds: 0 };
  }

  if (bucket.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: Math.max(maxAttempts - bucket.count, 0),
    retryAfterSeconds: 0,
  };
}
