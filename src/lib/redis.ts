import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

const redisConnection = redisUrl ? new Redis(redisUrl, {
  maxRetriesPerRequest: null,
}) : null;

export { redisConnection };
