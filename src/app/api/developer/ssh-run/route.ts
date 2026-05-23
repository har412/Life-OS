import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { Client } from "ssh2";

export const dynamic = "force-dynamic";

// Key: userId, Value: shell stream + connection reference + cached logs + active writers + metadata
export const activeSessions = new Map<
  string,
  {
    shell: any;
    conn: any;
    logs: { type: "stdout" | "stderr" | "system"; text: string; timestamp: string }[];
    writers: Set<WritableStreamDefaultWriter<Uint8Array>>;
    encoder: TextEncoder;
    projectPath: string | null;
    prompt: string;
  }
>();

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user.id;
  const activeSession = activeSessions.get(userId);
  if (!activeSession) {
    return new Response(JSON.stringify({ active: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Set up SSE/NDJSON response stream
  const responseStream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = responseStream.writable.getWriter();
  const encoder = activeSession.encoder;

  // Stream historical logs first
  try {
    const infoPayload = JSON.stringify({
      type: "system",
      text: `🔄 Reconnecting to active shell session...`,
      timestamp: new Date().toISOString(),
      reconnected: true,
      projectPath: activeSession.projectPath,
      prompt: activeSession.prompt,
    });
    writer.write(encoder.encode(`${infoPayload}\n`));

    for (const log of activeSession.logs) {
      const payload = JSON.stringify(log);
      writer.write(encoder.encode(`${payload}\n`));
    }
  } catch (err) {
    try { writer.close(); } catch {}
    return new Response(null, { status: 500 });
  }

  // Add the writer to the session's active writers set
  activeSession.writers.add(writer);

  // Monitor client connection abort (e.g. navigated away or tab closed)
  req.signal.addEventListener("abort", () => {
    activeSession.writers.delete(writer);
    try { writer.close(); } catch {}
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

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
  const { prompt, projectPath } = body;

  if (!prompt) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch the SSH credentials
  const credential = await prisma.sSHCredential.findUnique({
    where: { userId },
  });

  if (!credential) {
    return new Response(
      JSON.stringify({ error: "SSH not configured. Add SSH connection details in Settings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let secret: string;
  let passphrase: string | undefined;

  try {
    secret = decrypt(credential.encryptedSecret);
    if (credential.passphrase) {
      passphrase = decrypt(credential.passphrase);
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to decrypt SSH credentials. Please re-configure." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Set up SSE response stream
  const responseStream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Create writers set and history logs array for this session
  const writers = new Set<WritableStreamDefaultWriter<Uint8Array>>();
  writers.add(writer);

  const logs: { type: "stdout" | "stderr" | "system"; text: string; timestamp: string }[] = [];

  const writeLog = (type: "stdout" | "stderr" | "system", data: string) => {
    const logObj = { type, text: data, timestamp: new Date().toISOString() };
    logs.push(logObj);
    if (logs.length > 1000) {
      logs.shift(); // Bound log size in memory
    }

    const payload = JSON.stringify(logObj);
    const encoded = encoder.encode(`${payload}\n`);

    for (const activeWriter of writers) {
      try {
        activeWriter.write(encoded);
      } catch {
        writers.delete(activeWriter);
      }
    }
  };

  // Kill any existing session for this user before opening a new one
  const existing = activeSessions.get(userId);
  if (existing) {
    try {
      existing.shell.end();
    } catch { /* ignore */ }
    try {
      existing.conn.end();
    } catch { /* ignore */ }
    for (const w of existing.writers) {
      try { w.close(); } catch {}
    }
    activeSessions.delete(userId);
  }

  const conn = new Client();

  conn
    .on("ready", () => {
      writeLog("system", `🔒 SSH Connected → ${credential.username}@${credential.host}`);
      if (projectPath) {
        writeLog("system", `📁 Workspace: ${projectPath}`);
      }

      // Open a PTY shell (pseudo-terminal)
      conn.shell(
        {
          term: "xterm-256color",
          cols: 200,
          rows: 40,
        },
        (err, shell) => {
          if (err) {
            writeLog("stderr", `❌ Failed to open shell: ${err.message}`);
            try { writer.close(); } catch {}
            conn.end();
            return;
          }

          // Store session so follow-up inputs can be sent and GET requests can reconnect
          const sessionData = {
            shell,
            conn,
            logs,
            writers,
            encoder,
            projectPath,
            prompt,
          };
          activeSessions.set(userId, sessionData);

          // Build the startup command
          let startupCmd = "";
          if (projectPath) {
            startupCmd += `cd /d "${projectPath}" && `;
          }
          startupCmd += prompt.trim().startsWith("$")
            ? prompt.trim().slice(1).trim()
            : prompt.trim();

          writeLog("system", `🚀 $ ${prompt.trim()}`);

          // Send the command to the shell stdin
          shell.write(`${startupCmd}\r\n`);

          // Stream shell stdout back
          shell.on("data", (data: Buffer) => {
            writeLog("stdout", data.toString("utf8"));
          });

          // Stream shell stderr back
          shell.stderr?.on("data", (data: Buffer) => {
            writeLog("stderr", data.toString("utf8"));
          });

          // When the shell closes
          shell.on("close", () => {
            writeLog("system", "🏁 Shell session ended.");
            activeSessions.delete(userId);
            for (const activeWriter of writers) {
              try { activeWriter.close(); } catch { /* ignore */ }
            }
          });

          shell.on("error", (shellErr: Error) => {
            writeLog("stderr", `Shell error: ${shellErr.message}`);
          });
        }
      );
    })
    .on("error", (err) => {
      writeLog("stderr", `❌ SSH connection error: ${err.message}`);
      try { writer.close(); } catch { /* ignore */ }
    })
    .on("close", () => {
      activeSessions.delete(userId);
      try { writer.close(); } catch { /* ignore */ }
    })
    .connect({
      host: credential.host,
      port: credential.port,
      username: credential.username,
      password: credential.authMethod === "PASSWORD" ? secret : undefined,
      privateKey: credential.authMethod === "KEY" ? secret : undefined,
      passphrase,
      readyTimeout: 15000,
    });

  // Monitor connection abort for the POST stream
  req.signal.addEventListener("abort", () => {
    writers.delete(writer);
    try { writer.close(); } catch {}
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user.id;
  const activeSession = activeSessions.get(userId);

  if (activeSession) {
    try {
      activeSession.shell.end();
    } catch {}
    try {
      activeSession.conn.end();
    } catch {}

    const endPayload = JSON.stringify({
      type: "system",
      text: "🏁 Session manually closed by user.",
      timestamp: new Date().toISOString(),
    });
    const encoded = activeSession.encoder.encode(`${endPayload}\n`);

    for (const w of activeSession.writers) {
      try {
        w.write(encoded);
        w.close();
      } catch {}
    }

    activeSessions.delete(userId);

    return new Response(JSON.stringify({ success: true, message: "Session closed successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: false, error: "No active session to close" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}
