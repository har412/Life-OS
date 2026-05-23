import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { Client } from "ssh2";

export const dynamic = "force-dynamic";

// In-memory store for active shell sessions (works in local/Node.js environments)
// Key: userId, Value: shell stream + writer ref for streaming output back
export const activeSessions = new Map<
  string,
  {
    shell: any;
    writer: WritableStreamDefaultWriter<Uint8Array>;
    encoder: TextEncoder;
  }
>();

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

  const writeLog = (type: "stdout" | "stderr" | "system", data: string) => {
    try {
      const payload = JSON.stringify({ type, text: data, timestamp: new Date().toISOString() });
      writer.write(encoder.encode(`${payload}\n`));
    } catch {
      // stream closed
    }
  };

  // Kill any existing session for this user before opening a new one
  const existing = activeSessions.get(userId);
  if (existing) {
    try {
      existing.shell.end();
    } catch { /* ignore */ }
    activeSessions.delete(userId);
  }

  // Build the command to run in the shell
  // We open a persistent interactive shell (PTY) and send the command via stdin
  const conn = new Client();

  conn
    .on("ready", () => {
      writeLog("system", `🔒 SSH Connected → ${credential.username}@${credential.host}`);
      if (projectPath) {
        writeLog("system", `📁 Workspace: ${projectPath}`);
      }

      // Open a PTY shell (pseudo-terminal) — this supports interactive apps like agy
      conn.shell(
        {
          term: "xterm-256color",
          cols: 200,
          rows: 40,
        },
        (err, shell) => {
          if (err) {
            writeLog("stderr", `❌ Failed to open shell: ${err.message}`);
            writer.close();
            conn.end();
            return;
          }

          // Store session so follow-up inputs can be sent
          activeSessions.set(userId, { shell, writer, encoder });

          // Build the startup command:
          // 1. cd into project path if set
          // 2. then run whatever the user typed (e.g. "agy")
          let startupCmd = "";
          if (projectPath) {
            startupCmd += `cd /d "${projectPath}" && `;
          }
          startupCmd += prompt.trim().startsWith("$")
            ? prompt.trim().slice(1).trim()
            : prompt.trim();

          writeLog("system", `🚀 $ ${prompt.trim()}`);

          // Send the command to the shell stdin using Windows carriage return + newline (\r\n)
          shell.write(`${startupCmd}\r\n`);

          // Stream shell stdout back
          shell.on("data", (data: Buffer) => {
            writeLog("stdout", data.toString("utf8"));
          });

          // Stream shell stderr back
          shell.stderr?.on("data", (data: Buffer) => {
            writeLog("stderr", data.toString("utf8"));
          });

          // When the shell closes (e.g. user types "exit" or process ends)
          shell.on("close", () => {
            writeLog("system", "🏁 Shell session ended.");
            activeSessions.delete(userId);
            conn.end();
            try { writer.close(); } catch { /* ignore */ }
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

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
