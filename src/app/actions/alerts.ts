"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getAlerts() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.alert.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function markAlertAsRead(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await prisma.alert.update({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  });

  revalidatePath("/");
  return { success: true };
}

export async function deleteAlert(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await prisma.alert.delete({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/");
  return { success: true };
}
