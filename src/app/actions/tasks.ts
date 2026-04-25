"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { qstashClient } from "@/lib/qstash";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

// Ensure worker is running on the server


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
    data.status = 'SCHEDULED';
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

    const now = new Date();
    const delay = Math.floor((alertTime.getTime() - now.getTime()) / 1000);
    
    console.log(`⏰ Current Server Time: ${now.toISOString()}`);
    console.log(`📅 Target Alert Time:  ${alertTime.toISOString()}`);
    console.log(`⏳ Calculated Delay:   ${delay} seconds`);
    
    if (delay > 0) {
      try {
        const res = await qstashClient.publishJSON({
          url: `${APP_URL}/api/alerts/trigger`,
          body: { taskId: task.id, userId: session.user.id },
          delay: delay,
        });
        console.log(`✅ Message published to QStash (ID: ${res.messageId})`);
      } catch (err) {
        console.error("❌ Failed to publish to QStash:", err);
      }
    } else {
      console.log(`⚠️ Delay is negative (${delay}s), skipping QStash publish.`);
    }
  }

  return { task };
}

export async function updateTask(id: string, incomingData: any) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const data = { ...incomingData };

  // 0. Business logic: backlog should not have due date
  if (data.status === 'BACKLOG') {
    data.dueDate = null;
    data.time = null;
  } else if (data.dueDate && !data.status) {
    // If adding a date to a task that might be in BACKLOG, move it to SCHEDULED
    const currentTask = await prisma.task.findUnique({ 
      where: { id, userId: session.user.id },
      select: { status: true }
    });
    if (currentTask?.status === 'BACKLOG') {
      data.status = 'SCHEDULED';
    }
  }

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

    const now = new Date();
    const delay = Math.floor((alertTime.getTime() - now.getTime()) / 1000);
    
    console.log(`⏰ Current Server Time: ${now.toISOString()}`);
    console.log(`📅 Target Alert Time:  ${alertTime.toISOString()}`);
    console.log(`⏳ Calculated Delay:   ${delay} seconds`);

    if (delay > 0) {
      try {
        const res = await qstashClient.publishJSON({
          url: `${APP_URL}/api/alerts/trigger`,
          body: { taskId: task.id, userId: session.user.id },
          delay: delay,
        });
        console.log(`✅ New message published to QStash (ID: ${res.messageId})`);
      } catch (err) {
        console.error("❌ Failed to reschedule on QStash:", err);
      }
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
  
  // Remove scheduled alert (QStash messages don't need manual removal here 
  // as the trigger route handles task existence checks)

  return { success: true };
}
