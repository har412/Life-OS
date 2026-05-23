import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { activeSessions } from "../ssh-run/route";

export const dynamic = "force-dynamic";

// ─── GitHub REST helper ──────────────────────────────────────────
async function ghFetch(token: string, endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `https://api.github.com${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

// ─── Tool definitions ────────────────────────────────────────────
interface AgentTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: object;
  };
}
const TOOLS: AgentTool[] = [
  {
    type: "function",
    function: {
      name: "github_get_issue",
      description: "Get details of a specific GitHub issue by number",
      parameters: {
        type: "object",
        properties: {
          repo: { type: "string", description: "Full repo name e.g. har412/Life-OS" },
          issue_number: { type: "number", description: "The issue number" },
        },
        required: ["repo", "issue_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_list_issues",
      description: "List open issues in a GitHub repository",
      parameters: {
        type: "object",
        properties: {
          repo: { type: "string", description: "Full repo name e.g. har412/Life-OS" },
          state: { type: "string", enum: ["open", "closed", "all"], description: "Filter by state" },
        },
        required: ["repo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_get_file",
      description: "Get the contents of a file from a GitHub repository",
      parameters: {
        type: "object",
        properties: {
          repo: { type: "string" },
          path: { type: "string", description: "File path within the repo" },
          branch: { type: "string", description: "Branch name, defaults to main/master" },
        },
        required: ["repo", "path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_create_branch",
      description: "Create a new git branch in a GitHub repository",
      parameters: {
        type: "object",
        properties: {
          repo: { type: "string" },
          branch: { type: "string", description: "New branch name e.g. feature/fix-issue-17" },
          from_branch: { type: "string", description: "Base branch to branch from, defaults to master" },
        },
        required: ["repo", "branch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_create_or_update_file",
      description: "Create or update a file in a GitHub repository",
      parameters: {
        type: "object",
        properties: {
          repo: { type: "string" },
          path: { type: "string" },
          content: { type: "string", description: "File content (plain text, will be base64 encoded)" },
          message: { type: "string", description: "Commit message" },
          branch: { type: "string" },
          sha: { type: "string", description: "SHA of existing file if updating" },
        },
        required: ["repo", "path", "content", "message", "branch"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_create_pull_request",
      description: "Create a pull request on GitHub",
      parameters: {
        type: "object",
        properties: {
          repo: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          head: { type: "string", description: "Branch with changes" },
          base: { type: "string", description: "Target branch, usually master" },
        },
        required: ["repo", "title", "head", "base"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_add_issue_comment",
      description: "Add a comment to a GitHub issue",
      parameters: {
        type: "object",
        properties: {
          repo: { type: "string" },
          issue_number: { type: "number" },
          body: { type: "string" },
        },
        required: ["repo", "issue_number", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_terminal_command",
      description: "Run a command in the active SSH terminal session on the remote machine. Returns the output. Use for git operations, running tests, npm commands etc.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to execute" },
        },
        required: ["command"],
      },
    },
  },
];

// ─── Execute a tool call ─────────────────────────────────────────
async function executeTool(
  name: string,
  args: any,
  token: string,
  userId: string
): Promise<string> {
  try {
    switch (name) {
      case "github_get_issue": {
        const r = await ghFetch(token, `/repos/${args.repo}/issues/${args.issue_number}`);
        if (!r.ok) return `Error fetching issue: ${JSON.stringify(r.data)}`;
        const i = r.data as any;
        return JSON.stringify({ number: i.number, title: i.title, body: i.body, state: i.state, labels: i.labels?.map((l: any) => l.name) });
      }
      case "github_list_issues": {
        const state = args.state || "open";
        const r = await ghFetch(token, `/repos/${args.repo}/issues?state=${state}&per_page=20`);
        if (!r.ok) return `Error listing issues: ${JSON.stringify(r.data)}`;
        const issues = (r.data as any[])
          .filter((i: any) => !i.pull_request)
          .map((i: any) => ({ number: i.number, title: i.title, state: i.state }));
        return JSON.stringify(issues);
      }
      case "github_get_file": {
        const branch = args.branch || "master";
        const r = await ghFetch(token, `/repos/${args.repo}/contents/${args.path}?ref=${branch}`);
        if (!r.ok) return `Error fetching file: ${JSON.stringify(r.data)}`;
        const content = Buffer.from((r.data as any).content, "base64").toString("utf8");
        return content.slice(0, 8000); // Limit to 8k chars
      }
      case "github_create_branch": {
        const fromBranch = args.from_branch || "master";
        // Get SHA of base branch
        const ref = await ghFetch(token, `/repos/${args.repo}/git/ref/heads/${fromBranch}`);
        if (!ref.ok) return `Error getting base branch ref: ${JSON.stringify(ref.data)}`;
        const sha = (ref.data as any).object.sha;
        // Create new branch
        const r = await ghFetch(token, `/repos/${args.repo}/git/refs`, {
          method: "POST",
          body: JSON.stringify({ ref: `refs/heads/${args.branch}`, sha }),
        });
        if (!r.ok) return `Error creating branch: ${JSON.stringify(r.data)}`;
        return `Branch "${args.branch}" created successfully from "${fromBranch}"`;
      }
      case "github_create_or_update_file": {
        const body: any = {
          message: args.message,
          content: Buffer.from(args.content).toString("base64"),
          branch: args.branch,
        };
        if (args.sha) body.sha = args.sha;
        const r = await ghFetch(token, `/repos/${args.repo}/contents/${args.path}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        if (!r.ok) return `Error creating/updating file: ${JSON.stringify(r.data)}`;
        return `File "${args.path}" committed successfully on branch "${args.branch}"`;
      }
      case "github_create_pull_request": {
        const r = await ghFetch(token, `/repos/${args.repo}/pulls`, {
          method: "POST",
          body: JSON.stringify({ title: args.title, body: args.body || "", head: args.head, base: args.base }),
        });
        if (!r.ok) return `Error creating PR: ${JSON.stringify(r.data)}`;
        const pr = r.data as any;
        return `Pull request #${pr.number} created: ${pr.html_url}`;
      }
      case "github_add_issue_comment": {
        const r = await ghFetch(token, `/repos/${args.repo}/issues/${args.issue_number}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: args.body }),
        });
        if (!r.ok) return `Error adding comment: ${JSON.stringify(r.data)}`;
        return "Comment added successfully";
      }
      case "run_terminal_command": {
        const session = activeSessions.get(userId);
        if (!session) return "No active SSH terminal session. Please start a terminal session first (run a command in the SSH agent tab).";
        // Write command to shell stdin
        await new Promise<void>((resolve) => {
          session.shell.write(`${args.command}\r\n`, () => resolve());
        });
        // Wait for output (poll logs for 3 seconds)
        const logsBefore = session.logs.length;
        await new Promise((r) => setTimeout(r, 3000));
        const newLogs = session.logs.slice(logsBefore).map((l) => l.text).join("\n");
        return newLogs || "(Command sent — no output captured in time window)";
      }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err: any) {
    return `Tool execution error: ${err.message}`;
  }
}

// ─── POST handler ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const { prompt, repo } = body;

  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), { status: 400 });
  }

  // Fetch user credentials
  const [aiSettings, integration] = await Promise.all([
    prisma.aISettings.findUnique({ where: { userId } }),
    prisma.gitHubIntegration.findUnique({ where: { userId } }),
  ]);

  if (!aiSettings?.apiKey) {
    return new Response(JSON.stringify({ error: "AI settings not configured. Add your API key in Settings → AI Intelligence." }), { status: 400 });
  }

  let githubToken: string | null = null;
  if (integration) {
    try { githubToken = decrypt(integration.encryptedToken); } catch { /* no token */ }
  }

  const systemPrompt = `You are an expert AI coding agent integrated into the Life-OS Developer Hub. You have access to:
1. GitHub REST API tools — to read issues, manage branches, commit files, create PRs
2. A remote SSH terminal — to run shell commands on the user's development machine

The user's active repos: ${integration?.selectedRepos?.join(", ") || repo || "unknown — ask the user"}
Default repo: ${repo || integration?.selectedRepos?.[0] || "har412/Life-OS"}

Work step by step. Use tools to gather information before acting. After completing work, summarize what you did concisely.
Always create a feature branch before making code changes. Never push directly to master.
If you cannot complete a task, clearly explain why and what the user needs to do manually.`;

  // ─── Stream NDJSON back to client ───────────────────────────────
  const responseStream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const emit = (event: object) => {
    try { writer.write(encoder.encode(JSON.stringify(event) + "\n")); } catch { /* ignore */ }
  };

  // Run agent loop asynchronously
  (async () => {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ];

      const provider = aiSettings.provider;
      const apiKey = aiSettings.apiKey as string;
      const modelName = aiSettings.modelName;

      let maxIterations = 10;
      let iteration = 0;

      emit({ type: "system", text: `🤖 Agent started: "${prompt}"` });

      // ── Agent loop ──────────────────────────────────────────────
      while (iteration < maxIterations) {
        iteration++;

        let assistantContent = "";
        let toolCalls: any[] = [];

        if (provider === "GEMINI") {
          // Gemini: convert messages + tools
          const genAI = new GoogleGenerativeAI(apiKey);
          const geminiTools = [{
            functionDeclarations: TOOLS.map((t: any) => ({
              name: t.function.name,
              description: t.function.description,
              parameters: t.function.parameters,
            })),
          }];
          const model = genAI.getGenerativeModel({
            model: modelName || "gemini-1.5-pro",
            tools: geminiTools as any,
          });

          // Convert OpenAI-style messages to Gemini format
          const history = messages.slice(1, -1).map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: typeof m.content === "string"
              ? [{ text: m.content }]
              : (m.content || []).map((c: any) =>
                  c.type === "tool_result" ? { text: JSON.stringify(c.content) } : { text: c.text || "" }
                ),
          }));

          const chat = model.startChat({ history: history.length > 0 ? history : undefined });
          const lastMsg = messages[messages.length - 1];
          const result = await chat.sendMessage(
            typeof lastMsg.content === "string" ? lastMsg.content : JSON.stringify(lastMsg.content)
          );
          const response = result.response;
          const candidates = response.candidates || [];
          const part = candidates[0]?.content?.parts?.[0];

          if (part?.functionCall) {
            toolCalls = [{ id: "tool_0", function: { name: part.functionCall.name, arguments: JSON.stringify(part.functionCall.args) } }];
          } else {
            assistantContent = response.text();
          }
        } else if (provider === "CLAUDE") {
          // Anthropic Claude
          const anthropic = new Anthropic({ apiKey });
          const anthropicTools = TOOLS.map((t) => ({
            name: t.function.name,
            description: t.function.description || "",
            input_schema: t.function.parameters as any,
          }));

          const claudeMessages = messages.slice(1).map((m: any) => ({
            role: m.role as "user" | "assistant",
            content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          }));

          const response = await anthropic.messages.create({
            model: modelName || "claude-3-5-sonnet-20241022",
            max_tokens: 4096,
            system: systemPrompt,
            messages: claudeMessages,
            tools: anthropicTools,
          });

          if (response.stop_reason === "tool_use") {
            toolCalls = response.content
              .filter((c: any) => c.type === "tool_use")
              .map((c: any) => ({ id: c.id, function: { name: c.name, arguments: JSON.stringify(c.input) } }));
          } else {
            assistantContent = response.content
              .filter((c: any) => c.type === "text")
              .map((c: any) => c.text)
              .join("");
          }
        } else {
          // OpenAI / Groq / OpenRouter / NVIDIA
          const isGroq = provider === "GROQ" || aiSettings.baseUrl?.includes("groq");
          const openai = new OpenAI({
            apiKey,
            baseURL: isGroq ? "https://api.groq.com/openai/v1" : (aiSettings.baseUrl || undefined),
          });

          const response = await openai.chat.completions.create({
            model: modelName || (isGroq ? "llama-3.3-70b-versatile" : "gpt-4o"),
            messages,
            tools: TOOLS as any,
            tool_choice: "auto",
          });

          const choice = response.choices[0];
          assistantContent = choice.message.content || "";
          toolCalls = choice.message.tool_calls || [];
        }

        // ── Process tool calls ────────────────────────────────────
        if (toolCalls.length > 0) {
          messages.push({ role: "assistant", content: assistantContent || null, tool_calls: toolCalls } as any);

          for (const tc of toolCalls) {
            const toolName = tc.function.name;
            let args: any = {};
            try { args = JSON.parse(tc.function.arguments); } catch { /* ignore */ }

            emit({ type: "tool_call", text: `🔧 Calling: ${toolName}(${Object.keys(args).join(", ")})` });

            const result = await executeTool(toolName, args, githubToken || "", userId);

            emit({ type: "tool_result", text: `✅ ${toolName} → ${result.slice(0, 300)}${result.length > 300 ? "..." : ""}` });

            messages.push({ role: "tool", tool_call_id: tc.id, content: result } as any);
          }

          // Continue loop to get next AI response
          continue;
        }

        // ── Final answer ──────────────────────────────────────────
        if (assistantContent) {
          emit({ type: "answer", text: assistantContent });
        }
        break;
      }

      if (iteration >= maxIterations) {
        emit({ type: "system", text: "⚠️ Agent reached maximum iterations. Please try a more specific request." });
      }

      emit({ type: "done", text: "🏁 Agent finished." });
    } catch (err: any) {
      emit({ type: "error", text: `❌ Agent error: ${err.message}` });
    } finally {
      try { writer.close(); } catch { /* ignore */ }
    }
  })();

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
