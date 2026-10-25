import redisClient from '../config/redis';
import { config } from '../config';
import { RateLimitResult } from '../types';

export class RateLimitService {
  /**
   * Checks and increments hourly rate limit for a specific sender
   */
  async checkRateLimit(
    senderId: string,
    limit: number = config.rateLimit.maxEmailsPerHour
  ): Promise<RateLimitResult> {
    const hourWindow = Math.floor(Date.now() / 3600000);
    const key = `ratelimit:${senderId}:${hourWindow}`;

    // Atomic increment + set TTL using pipeline
    const pipeline = redisClient.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, config.rateLimit.windowSeconds);
    const results = await pipeline.exec();

    const currentCount = (results?.[0]?.[1] as number) || 0;

    const allowed = currentCount <= limit;
    const remaining = Math.max(0, limit - currentCount);

    return {
      allowed,
      currentCount,
      limit,
      remaining,
    };
  }

  /**
   * Calculates the exact Date when the next hour window starts
   */
  getNextAvailableWindow(): Date {
    const currentHourWindow = Math.floor(Date.now() / 3600000);
    const nextHourWindowMs = (currentHourWindow + 1) * 3600000;
    // Add 1-second margin so window has strictly changed
    return new Date(nextHourWindowMs + 1000);
  }

  /**
   * Retrieves current hourly email count for a sender without incrementing
   */
  async getCurrentCount(senderId: string): Promise<number> {
    const hourWindow = Math.floor(Date.now() / 3600000);
    const key = `ratelimit:${senderId}:${hourWindow}`;
    const count = await redisClient.get(key);
    return count ? parseInt(count, 10) : 0;
  }
}

export const rateLimitService = new RateLimitService();
export default rateLimitService;
