import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash/nextjs";
import { prisma } from "@/lib/prisma";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(req: NextRequest) {
  // 1. Verify the signature from QStash
  const signature = req.headers.get("upstash-signature");
  if (!signature) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.text();
  const isValid = await receiver.verify({
    signature,
    body,
  });

  if (!isValid) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // 2. Parse the job data
  const { taskId, userId } = JSON.parse(body);

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) return new NextResponse("Task not found", { status: 200 }); // Still 200 to acknowledge QStash

    // 3. Create the Alert record
    await prisma.alert.create({
      data: {
        title: `Task: ${task.title}`,
        message: task.description || "Your task is due now!",
        type: "TASK_REMINDER",
        userId: userId,
        taskId: taskId,
      },
    });

    console.log(`🔔 QStash Alert triggered for: ${task.title}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error processing QStash alert:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
