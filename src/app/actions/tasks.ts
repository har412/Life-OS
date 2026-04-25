"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { qstashClient } from "@/lib/qstash";

const APP_URL = process.env.APP_URL;

export async function createTask(incomingData: any) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const { timezoneOffset, ...taskData } = incomingData;
  const data = { ...taskData };

  // Sanitize for Prisma
  if (data.id) delete data.id; 
  data.userId = session.user.id;

  // Map category to categoryId for Prisma
  if (data.category) {
    data.categoryId = data.category;
    delete data.category;
  }

  if (data.status === 'BACKLOG') {
    data.dueDate = null;
    data.time = null;
  } else if (data.dueDate) {
    data.dueDate = new Date(data.dueDate);
    if (!data.status || data.status === 'BACKLOG') {
      data.status = 'SCHEDULED';
    }
  }

  try {
    const task = await prisma.task.create({
      data,
      include: { category: true, comments: true },
    });

    revalidatePath("/");

    // Schedule Alerts
    if (task.dueDate && task.time) {
      await scheduleTaskAlerts(task, session.user.id, timezoneOffset);
    }

    return { task };
  } catch (err: any) {
    console.error("Error creating task:", err);
    return { error: "Failed to create task. Please try again." };
  }
}

export async function updateTask(id: string, incomingData: any) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const { timezoneOffset, ...data } = incomingData;

  if (data.status === 'BACKLOG') {
    data.dueDate = null;
    data.time = null;
  } else if (data.dueDate) {
    data.dueDate = new Date(data.dueDate);
    if (!data.status || data.status === 'BACKLOG') {
      data.status = 'SCHEDULED';
    }
  }

  // Map category to categoryId for Prisma
  if (data.category) {
    data.categoryId = data.category;
    delete data.category;
  }

  try {
    const task = await prisma.task.update({
      where: { id, userId: session.user.id },
      data,
      include: { category: true, comments: true },
    });

    revalidatePath("/");

    // Schedule/Reschedule Alerts
    if (task.dueDate && task.time) {
      await scheduleTaskAlerts(task, session.user.id, timezoneOffset);
    }

    return { task };
  } catch (err: any) {
    console.error("Error updating task:", err);
    return { error: "Failed to update task. Please try again." };
  }
}

async function scheduleTaskAlerts(task: any, userId: string, timezoneOffset?: number) {
  const alertTime = new Date(task.dueDate);
  const [hours, minutes] = task.time.split(':').map(Number);
  alertTime.setHours(hours || 0, minutes || 0, 0, 0);
  
  if (timezoneOffset !== undefined) {
    alertTime.setMinutes(alertTime.getMinutes() + Number(timezoneOffset));
  }

  const now = new Date();
  
  // We schedule two types of alerts:
  // 1. Pre-reminder (if offset > 0)
  // 2. Overdue (at the exact time)

  const offsets = [0]; // Always schedule the 0 (overdue) alert
  if (task.reminderOffset && task.reminderOffset > 0) {
    offsets.push(task.reminderOffset);
  }

  for (const offset of offsets) {
    const targetTime = new Date(alertTime.getTime() - (offset * 60000));
    const delay = Math.floor((targetTime.getTime() - now.getTime()) / 1000);

    if (delay > 0) {
      try {
        const res = await qstashClient.publishJSON({
          url: `${APP_URL}/api/alerts/trigger`,
          body: { 
            taskId: task.id, 
            userId: userId,
            alertType: offset === 0 ? "OVERDUE" : "REMINDER",
            offset: offset
          },
          delay: delay,
        });
        console.log(`✅ [${offset}m] Message published to QStash (ID: ${res.messageId})`);
      } catch (err) {
        console.error(`❌ Failed to publish ${offset}m alert:`, err);
      }
    }
  }
}

export async function deleteTask(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await prisma.task.delete({
      where: { id, userId: session.user.id },
    });

    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting task:", err);
    return { error: "Failed to delete task. It might have been already removed." };
  }
}
