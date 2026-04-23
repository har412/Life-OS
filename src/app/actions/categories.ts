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

  const category = await prisma.category.create({
    data: {
      ...data,
      userId: session.user.id,
    },
  });

  revalidatePath("/");
  return { category };
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

  if (reassignToId) {
    await prisma.task.updateMany({
      where: { categoryId: id, userId: session.user.id },
      data: { categoryId: reassignToId },
    });
  } else {
    // Or just delete them or cascade
  }

  await prisma.category.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/");
  return { success: true };
}
