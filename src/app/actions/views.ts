"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getSavedViews() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.savedView.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
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

  // Get max order
  const lastView = await prisma.savedView.findFirst({
    where: { userId: session.user.id },
    orderBy: { order: "desc" },
  });
  const order = lastView ? lastView.order + 1 : 0;

  const savedView = await prisma.savedView.create({
    data: {
      ...data,
      order,
      userId: session.user.id,
    },
  });

  revalidatePath("/");
  return { savedView };
}

export async function reorderSavedViews(ids: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  // Update order for each view
  const updates = ids.map((id, index) => 
    prisma.savedView.update({
      where: { id, userId },
      data: { order: index },
    })
  );

  await prisma.$transaction(updates);

  revalidatePath("/");
  return { success: true };
}

export async function deleteSavedView(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await prisma.savedView.deleteMany({
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
