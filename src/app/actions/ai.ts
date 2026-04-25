"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function saveAISettings(data: {
  provider: string;
  apiKey: string;
  modelName: string;
  baseUrl?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await prisma.aISettings.upsert({
      where: { userId: session.user.id },
      update: {
        provider: data.provider,
        apiKey: data.apiKey,
        modelName: data.modelName,
        baseUrl: data.baseUrl,
      },
      create: {
        provider: data.provider,
        apiKey: data.apiKey,
        modelName: data.modelName,
        baseUrl: data.baseUrl,
        userId: session.user.id,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("❌ Error saving AI settings:", error);
    return { error: "Internal Error" };
  }
}

export async function getAISettings() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return await prisma.aISettings.findUnique({
    where: { userId: session.user.id },
  });
}
