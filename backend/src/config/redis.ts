import Redis, { RedisOptions } from 'ioredis';
import { config } from './index';

export const redisOptions: RedisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    // Exponential backoff with a cap of 2000ms
    const delay = Math.min(times * 100, 2000);
    return delay;
  },
};

export const redisClient = new Redis(redisOptions);

redisClient.on('connect', () => {
  console.log(`[Redis] Connected to ${config.redis.host}:${config.redis.port}`);
});

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

export default redisClient;
