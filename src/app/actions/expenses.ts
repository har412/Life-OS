"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getExpenses() {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    return await prisma.expense.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}

export async function createExpense(incomingData: {
  amount: number;
  description: string;
  category: string;
  date?: string;
  quantity?: string;
  location?: string;
  type?: string;
  paymentMode?: string;
  metadata?: any;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const expense = await prisma.expense.create({
      data: {
        amount: incomingData.amount,
        description: incomingData.description,
        category: incomingData.category,
        date: incomingData.date ? new Date(incomingData.date) : new Date(),
        quantity: incomingData.quantity || "?",
        location: incomingData.location || "?",
        type: incomingData.type || "DEBIT",
        paymentMode: incomingData.paymentMode || "CASH",
        metadata: incomingData.metadata || null,
        userId: session.user.id,
      },
    });

    revalidatePath("/expenses");
    return { expense };
  } catch (error: any) {
    console.error("Error creating expense:", error);
    return { error: "Failed to create expense. Please try again." };
  }
}

export async function updateExpense(
  id: string,
  incomingData: {
    amount?: number;
    description?: string;
    category?: string;
    date?: string;
    quantity?: string;
    location?: string;
    type?: string;
    paymentMode?: string;
    metadata?: any;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const updateData: any = { ...incomingData };
    if (incomingData.date) {
      updateData.date = new Date(incomingData.date);
    }

    const expense = await prisma.expense.update({
      where: { id, userId: session.user.id },
      data: updateData,
    });

    revalidatePath("/expenses");
    return { expense };
  } catch (error: any) {
    console.error("Error updating expense:", error);
    return { error: "Failed to update expense. Please try again." };
  }
}

export async function deleteExpense(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await prisma.expense.delete({
      where: { id, userId: session.user.id },
    });

    revalidatePath("/expenses");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting expense:", error);
    return { error: "Failed to delete expense." };
  }
}
