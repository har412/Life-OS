"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { BUILT_IN_CATEGORIES, PRESET_SAVED_VIEWS } from "@/lib/taskData";


export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "User already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword,
      categories: {
        create: BUILT_IN_CATEGORIES.map(cat => ({
          id: cat.id,
          label: cat.label,
          colorCode: JSON.stringify({ dot: cat.dot, badge: cat.badge, text: cat.text }),
        })),
      },
      savedViews: {
        create: PRESET_SAVED_VIEWS.map(view => ({
          name: view.name,
          emoji: view.emoji,
          filters: view.filters as any,
          isDefault: view.name === "Today",
        })),
      }
    },

  });

  return { success: true };
}
