import { Worker } from "bullmq";
import { redisConnection } from "./redis";
import { prisma } from "./prisma";

let worker: Worker | null = null;

export function startAlertWorker() {
  if (worker || !redisConnection) return;

  console.log("🚀 Starting Alert Worker...");

  worker = new Worker(
    "alerts",
    async (job) => {
      console.log(`👷 Worker received job: ${job.id}`);
      const { taskId, userId } = job.data;
      
      try {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
        });

        if (!task) return;

        // Create Alert record
        await prisma.alert.create({
          data: {
            title: `Task: ${task.title}`,
            message: task.description || "Your task is due now!",
            type: "TASK_REMINDER",
            userId: userId,
            taskId: taskId,
          },
        });

        console.log(`🔔 Alert triggered for: ${task.title}`);
      } catch (error) {
        console.error("❌ Error in worker processing job:", error);
      }
    },
    { connection: redisConnection }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Job ${job?.id} failed: ${err.message}`);
  });
}
