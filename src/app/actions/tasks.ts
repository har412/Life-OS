"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { alertQueue } from "@/lib/queue";
import { startAlertWorker } from "@/lib/worker";

// Ensure worker is running on the server
if (typeof window === "undefined") {
  startAlertWorker();
}


export async function getTasks() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.task.findMany({
    where: { userId: session.user.id },
    include: { comments: true, category: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTask(incomingData: any) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const data = { ...incomingData };

  // Sanitize for Prisma
  if (data.id) delete data.id; // Let Prisma generate it
  if (data.category !== undefined) {
    data.categoryId = data.category;
    delete data.category;
  }
  if (data.dueDate) {
    data.dueDate = new Date(data.dueDate);
  } else if (data.dueDate === null) {
    data.dueDate = null;
  }
  // Comments shouldn't be created on initial task add usually, but if they are, ignore for now.
  if (data.comments) delete data.comments;

  const task = await prisma.task.create({
    data: {
      ...data,
      userId: session.user.id,
    },
    include: { category: true, comments: true },
  });

  revalidatePath("/");

  // Schedule Alert
  if (task.dueDate && task.time) {
    const alertTime = new Date(task.dueDate);
    const [hours, minutes] = task.time.split(':').map(Number);
    alertTime.setHours(hours || 0, minutes || 0, 0, 0);

    const delay = alertTime.getTime() - Date.now();
    if (delay > 0) {
      await alertQueue?.add(
        `alert-${task.id}`,
        { taskId: task.id, userId: session.user.id },
        { delay, jobId: `alert-${task.id}` }
      );
    }
  }

  return { task };
}

export async function updateTask(id: string, incomingData: any) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const data = { ...incomingData };

  // 1. Sanitize category -> categoryId
  if (data.category !== undefined) {
    data.categoryId = data.category;
    delete data.category;
  }

  // 2. Sanitize comments relation
  if (data.comments !== undefined) {
    const comments = data.comments;
    delete data.comments;
    // Delete existing and recreate to sync
    await prisma.comment.deleteMany({ where: { taskId: id } });
    if (comments && comments.length > 0) {
      await prisma.comment.createMany({
        data: comments.map((c: any) => ({
          text: c.text,
          taskId: id,
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        })),
      });
    }
  }

  // 3. Sanitize Dates
  if (data.dueDate) {
    data.dueDate = new Date(data.dueDate);
  } else if (data.dueDate === null) {
    data.dueDate = null;
  }

  const task = await prisma.task.update({
    where: { id, userId: session.user.id },
    data,
    include: { category: true, comments: true },
  });

  revalidatePath("/");

  // Schedule/Reschedule Alert
  if (task.dueDate && task.time) {
    const alertTime = new Date(task.dueDate);
    const [hours, minutes] = task.time.split(':').map(Number);
    alertTime.setHours(hours || 0, minutes || 0, 0, 0);

    const delay = alertTime.getTime() - Date.now();
    if (delay > 0) {
      // BullMQ will replace the existing job with the same jobId
      await alertQueue?.add(
        `alert-${task.id}`,
        { taskId: task.id, userId: session.user.id },
        { delay, jobId: `alert-${task.id}` }
      );
    } else {
      // If time passed, remove existing job if any
      const job = await alertQueue?.getJob(`alert-${task.id}`);
      if (job) await job.remove();
    }
  }

  return { task };
}

export async function deleteTask(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await prisma.task.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/");
  
  // Remove scheduled alert
  const job = await alertQueue?.getJob(`alert-${id}`);
  if (job) await job.remove();

  return { success: true };
}
