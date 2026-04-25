import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  // Note: auth() might not work in background fetch if session is expired
  // But for PWAs, the session is usually persisted.
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { taskId, action } = await req.json();

  try {
    if (action === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await prisma.task.update({
        where: { id: taskId, userId: session.user.id },
        data: {
          dueDate: tomorrow,
          status: "SCHEDULED"
        },
      });
    } else if (action === "backlog") {
      await prisma.task.update({
        where: { id: taskId, userId: session.user.id },
        data: {
          dueDate: null,
          time: null,
          status: "BACKLOG"
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error performing notification action:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
