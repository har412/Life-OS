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

import fs from "fs/promises";
import path from "path";

export async function readWorkspaceFile(filePath: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const credential = await prisma.sSHCredential.findUnique({
      where: { userId: session.user.id },
    });

    if (!credential) {
      return { error: "SSH / Workspace not configured" };
    }

    const allowedPaths = (credential.projectPaths || "")
      .split(/[\n,;]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => path.resolve(p));

    const targetPath = path.resolve(filePath);

    // Also support reading from standard brain folder for user's own task logs
    const brainDir = path.resolve("C:\\Users\\Harkirat Win10\\.gemini\\antigravity\\brain");
    const isBrainPath = targetPath.startsWith(brainDir);

    const isAllowed = isBrainPath || allowedPaths.some((allowed) => targetPath.startsWith(allowed));
    if (!isAllowed) {
      return { error: "Access denied: Path is outside the authorized workspace." };
    }

    const content = await fs.readFile(targetPath, "utf-8");
    return { success: true, content };
  } catch (err: any) {
    return { error: err.message || "Failed to read file" };
  }
}

export async function listWorkspaceArtifacts(projectPath: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const credential = await prisma.sSHCredential.findUnique({
      where: { userId: session.user.id },
    });

    if (!credential) {
      return { error: "SSH / Workspace not configured" };
    }

    const allowedPaths = (credential.projectPaths || "")
      .split(/[\n,;]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => path.resolve(p));

    const targetPath = path.resolve(projectPath);

    const isAllowed = allowedPaths.some((allowed) => targetPath.startsWith(allowed));
    if (!isAllowed) {
      return { error: "Access denied: Path is outside the authorized workspace." };
    }

    const searchDirs = [
      path.join(targetPath, "artifacts"),
      path.join(targetPath, ".agents", "artifacts"),
      path.resolve("C:\\Users\\Harkirat Win10\\.gemini\\antigravity\\brain"),
    ];

    const allArtifacts: { name: string; fullPath: string; mtime: string; dir: string }[] = [];

    for (const dir of searchDirs) {
      try {
        const stats = await fs.stat(dir);
        if (stats.isDirectory()) {
          const files = await fs.readdir(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            try {
              const fileStats = await fs.stat(fullPath);
              if (fileStats.isFile() && (file.endsWith(".md") || file.endsWith(".txt") || file.endsWith(".json"))) {
                allArtifacts.push({
                  name: file,
                  fullPath,
                  mtime: fileStats.mtime.toISOString(),
                  dir: path.basename(dir),
                });
              }
            } catch {}
          }
        }
      } catch {}
    }

    // Sort by most recently modified
    allArtifacts.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());

    return { success: true, artifacts: allArtifacts };
  } catch (err: any) {
    return { error: err.message || "Failed to list artifacts" };
  }
}

