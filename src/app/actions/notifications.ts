"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function saveSubscription(subscription: any) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    // Check if subscription already exists for this endpoint
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      return { success: true, message: "Subscription already exists" };
    }

    await prisma.pushSubscription.create({
      data: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: session.user.id,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("❌ Error saving subscription:", error);
    return { error: "Internal Error" };
  }
}

export async function getAlerts() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return await prisma.alert.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });
}
