interface Bucket {
  tokens: number;
  updatedAt: number;
}
export class TokenRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly capacity = 20;
  private readonly refillPerMillisecond = 60 / 60_000;

  allow(key: string, now = Date.now()): boolean {
    const existing = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: now };
    const elapsed = Math.max(0, now - existing.updatedAt);
    existing.tokens = Math.min(this.capacity, existing.tokens + elapsed * this.refillPerMillisecond);
    existing.updatedAt = now;
    if (existing.tokens < 1) {
      this.buckets.set(key, existing);
      return false;
    }
    existing.tokens -= 1;
    this.buckets.set(key, existing);
    return true;
  }
}
