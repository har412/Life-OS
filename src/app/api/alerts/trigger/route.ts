import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { prisma } from "@/lib/prisma";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

// Allow GET for simple manual testing
export async function GET() {
  return new NextResponse("Webhook is alive and ready for QStash!", { status: 200 });
}

export async function POST(req: NextRequest) {
  console.log("📨 Received QStash Webhook request");
  
  // 1. Verify the signature from QStash
  const signature = req.headers.get("upstash-signature");
  if (!signature) {
    console.warn("⚠️ Missing upstash-signature header");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.text();
  console.log("📄 Webhook Body received:", body);

  const isValid = await receiver.verify({
    signature,
    body,
  }).catch(err => {
    console.error("❌ Signature verification crashed:", err);
    return false;
  });

  if (!isValid) {
    console.warn("⚠️ Invalid QStash signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  console.log("✅ Signature verified");

  // 2. Parse the job data
  let data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    console.error("❌ Failed to parse body as JSON", e);
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { taskId, userId } = data;
  console.log(`🔍 Processing Alert: TaskID=${taskId}, UserID=${userId}`);

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      console.warn(`⚠️ Task ${taskId} no longer exists. Skipping alert.`);
      return new NextResponse("Task not found", { status: 200 }); 
    }

    // 3. Create the Alert record
    const alert = await prisma.alert.create({
      data: {
        title: `Task: ${task.title}`,
        message: task.description || "Your task is due now!",
        type: "TASK_REMINDER",
        userId: userId,
        taskId: taskId,
      },
    });

    console.log(`🔔 Alert created in DB: ${alert.id} for task: ${task.title}`);
    return NextResponse.json({ success: true, alertId: alert.id });
  } catch (error) {
    console.error("❌ Error processing QStash alert:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
