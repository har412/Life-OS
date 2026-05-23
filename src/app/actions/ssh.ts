"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { encrypt, decrypt } from "@/lib/crypto";

export async function saveSSHCredential(data: {
  host: string;
  port: number;
  username: string;
  authMethod: "PASSWORD" | "KEY";
  secret: string;
  passphrase?: string;
  projectPaths?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!data.host || !data.username || !data.secret) {
    return { error: "Missing required SSH fields" };
  }

  try {
    const encryptedSecret = encrypt(data.secret);
    const encryptedPassphrase = data.passphrase ? encrypt(data.passphrase) : null;

    await prisma.sSHCredential.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        host: data.host,
        port: data.port,
        username: data.username,
        authMethod: data.authMethod,
        encryptedSecret,
        passphrase: encryptedPassphrase,
        projectPaths: data.projectPaths || null,
      },
      update: {
        host: data.host,
        port: data.port,
        username: data.username,
        authMethod: data.authMethod,
        encryptedSecret,
        passphrase: encryptedPassphrase,
        projectPaths: data.projectPaths ?? undefined,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/developer");
    return { success: true };
  } catch (err: any) {
    console.error("❌ Failed to save SSH credentials:", err);
    return { error: err.message || "Failed to save SSH credentials" };
  }
}

export async function getSSHCredential() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const credential = await prisma.sSHCredential.findUnique({
      where: { userId: session.user.id },
    });

    if (!credential) {
      return { success: true, credential: null };
    }

    return {
      success: true,
      credential: {
        host: credential.host,
        port: credential.port,
        username: credential.username,
        authMethod: credential.authMethod,
        hasSecret: true,
        hasPassphrase: !!credential.passphrase,
        projectPaths: credential.projectPaths || "",
      },
    };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch SSH credentials" };
  }
}

export async function disconnectSSH() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.sSHCredential.delete({
      where: { userId: session.user.id },
    });

    revalidatePath("/settings");
    revalidatePath("/developer");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete SSH connection" };
  }
}

export async function saveProjectPaths(projectPaths: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const existing = await prisma.sSHCredential.findUnique({
      where: { userId: session.user.id },
    });

    if (!existing) {
      return { error: "No SSH connection configured. Please set up SSH first." };
    }

    await prisma.sSHCredential.update({
      where: { userId: session.user.id },
      data: { projectPaths },
    });

    revalidatePath("/settings");
    revalidatePath("/developer");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to save project paths" };
  }
}
