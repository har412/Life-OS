import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { activeSessions } from "../ssh-run/route";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user.id;
  const body = await req.json();
  const { input } = body;

  if (input === undefined) {
    return new Response(JSON.stringify({ error: "Input is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const activeSession = activeSessions.get(userId);
  if (!activeSession) {
    return new Response(
      JSON.stringify({ error: "No active SSH terminal session. Please start a terminal first." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Send the input directly into the running PTY shell's stdin
    if (input === "ctrl+c" || input === "\x03") {
      activeSession.shell.write("\x03");
    } else {
      activeSession.shell.write(`${input}\r\n`);
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to write input to active shell" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
