"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function createComment(taskId: string, text: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Make sure the task belongs to the user
  const task = await prisma.task.findUnique({
    where: { id: taskId, userId: session.user.id },
    select: { id: true },
  });
  if (!task) return { error: "Task not found" };

  try {
    const comment = await prisma.comment.create({
      data: { taskId, text },
    });

    revalidatePath("/");
    return { comment: { ...comment, createdAt: comment.createdAt.toISOString() } };
  } catch (err: any) {
    console.error("Error creating comment:", err);
    return { error: "Failed to save comment." };
  }
}

export async function deleteComment(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    // Verify ownership via task
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { task: { select: { userId: true } } },
    });
    if (!comment || comment.task.userId !== session.user.id) {
      return { error: "Not found" };
    }

    await prisma.comment.delete({ where: { id: commentId } });
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting comment:", err);
    return { error: "Failed to delete comment." };
  }
}
