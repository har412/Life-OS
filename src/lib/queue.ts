import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const alertQueue = new Queue("alerts", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});
