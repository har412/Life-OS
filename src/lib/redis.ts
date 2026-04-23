import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

export { redisConnection };
