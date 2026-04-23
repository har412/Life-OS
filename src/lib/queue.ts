import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const alertQueue = redisConnection ? new Queue("alerts", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 1000,
  },
}) : null;
