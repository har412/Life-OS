"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getSavedViews() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.savedView.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
}

export async function createSavedView(data: { name: string; emoji: string; filters: any; isDefault?: boolean }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (data.isDefault) {
    await prisma.savedView.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    });
  }

  const savedView = await prisma.savedView.create({
    data: {
      ...data,
      userId: session.user.id,
    },
  });

  revalidatePath("/");
  return { savedView };
}

export async function deleteSavedView(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await prisma.savedView.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/");
  return { success: true };
}

export async function setDefaultView(id: string | null) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Remove isDefault from all
  await prisma.savedView.updateMany({
    where: { userId: session.user.id },
    data: { isDefault: false },
  });

  if (id) {
    await prisma.savedView.update({
      where: { id, userId: session.user.id },
      data: { isDefault: true },
    });
  }

  revalidatePath("/");
  return { success: true };
}
