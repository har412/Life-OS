"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
}

export async function createCategory(data: { label: string; colorCode: string }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const category = await prisma.category.create({
      data: {
        ...data,
        userId: session.user.id,
      },
    });

    revalidatePath("/");
    return { category };
  } catch (error: any) {
    console.error("Error creating category:", error);
    if (error.code === 'P2002') {
      return { error: "A category with this name already exists." };
    }
    return { error: "Could not create category. Please try again." };
  }
}

export async function updateCategory(id: string, data: { label?: string; colorCode?: string }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const category = await prisma.category.update({
    where: { id, userId: session.user.id },
    data,
  });

  revalidatePath("/");
  return { category };
}

export async function deleteCategory(id: string, reassignToId?: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    let targetId = reassignToId;

    // If no target provided, find the first available fallback category
    if (!targetId) {
      const fallback = await prisma.category.findFirst({
        where: { userId: session.user.id, NOT: { id } }
      });
      targetId = fallback?.id;
    }

    // Move all tasks (including DONE ones) to the target category
    if (targetId) {
      await prisma.task.updateMany({
        where: { categoryId: id, userId: session.user.id },
        data: { categoryId: targetId },
      });
    } else {
      // If no other category exists, we might need to block deletion 
      // or check if there are actually any tasks
      const taskCount = await prisma.task.count({ where: { categoryId: id, userId: session.user.id } });
      if (taskCount > 0) {
        return { error: "Cannot delete the last category while tasks exist. Please create another category first." };
      }
    }

    await prisma.category.delete({
      where: { id, userId: session.user.id },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return { error: "Failed to delete category. An unexpected error occurred." };
  }
}
