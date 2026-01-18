import { HttpException, HttpStatus } from '@nestjs/common';

type Bucket = {
  timestamps: number[];
};

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(private readonly windowMs: number) {}

  checkOrThrow(key: string, limit: number) {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

    if (bucket.timestamps.length >= limit) {
      throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.timestamps.push(now);
    this.buckets.set(key, bucket);
  }
}
