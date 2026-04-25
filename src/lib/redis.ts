import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

const redisConnection = redisUrl ? new Redis(redisUrl, {
  maxRetriesPerRequest: null,
}) : null;

if (redisConnection) {
  console.log("🔌 Redis connection initialized.");
} else {
  console.warn("⚠️ Redis connection failed: REDIS_URL not found.");
}

export { redisConnection };
