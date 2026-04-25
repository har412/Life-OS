import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@lifeos.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET() {
  return new NextResponse("Webhook is alive and ready for QStash!", { status: 200 });
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("upstash-signature");
  if (!signature) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.text();
  const isValid = await receiver.verify({ signature, body }).catch(() => false);
  if (!isValid) return new NextResponse("Invalid signature", { status: 401 });

  const { taskId, userId, alertType, offset } = JSON.parse(body);

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) return new NextResponse("Task not found", { status: 200 });

    // Determine Notification Content
    let title = `Life OS: ${task.title}`;
    let message = "";
    
    if (alertType === "REMINDER") {
      message = `Due in ${offset} minutes.`;
    } else {
      message = "This task is now OVERDUE!";
    }

    // 1. Create the database alert
    const alert = await prisma.alert.create({
      data: {
        title: title,
        message: message,
        type: alertType || "TASK_REMINDER",
        userId: userId,
        taskId: taskId,
      },
    });

    // 2. Send Web Push Notifications with ACTIONS
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: userId },
    });

    const pushPromises = subscriptions.map((sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: { auth: sub.auth, p256dh: sub.p256dh },
      };

      return webpush.sendNotification(
        pushConfig,
        JSON.stringify({
          title: title,
          body: message,
          icon: "/icons/icon-192x192.png",
          url: `/`,
          // ADD QUICK ACTIONS
          actions: [
            { action: "tomorrow", title: "📅 Tomorrow" },
            { action: "backlog", title: "📥 Backlog" }
          ],
          tag: `task-${task.id}`, // Replaces old notifications for same task
          data: {
            taskId: task.id,
            userId: userId
          }
        })
      ).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          return prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      });
    });

    await Promise.all(pushPromises);
    return NextResponse.json({ success: true, alertId: alert.id });
  } catch (error) {
    console.error("❌ Error processing alert:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
