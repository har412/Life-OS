"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

export async function validateAIKey(provider: string, apiKey: string, baseUrl?: string) {
  try {
    if (provider === "GEMINI") {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      // Filter for models that support generating content
      return { 
        success: true, 
        models: data.models
          ?.filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
          .map((m: any) => m.name.replace("models/", "")) || []
      };
    }

    if (provider === "OPENAI" || provider === "OPENROUTER" || provider === "NVIDIA") {
      const client = new OpenAI({ apiKey, baseURL: baseUrl || undefined });
      const response = await client.models.list();
      return { 
        success: true, 
        models: response.data.map(m => m.id)
      };
    }

    return { error: "Provider validation not implemented yet." };
  } catch (error: any) {
    return { error: error.message || "Failed to validate key" };
  }
}
