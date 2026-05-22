"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { encrypt, decrypt } from "@/lib/crypto";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── 1. Helper to log API Hits ─────────────────────────────
async function logGitHubHit(userId: string, actionType: string, endpoint: string, status: number) {
  try {
    await prisma.gitHubAuditLog.create({
      data: {
        userId,
        actionType,
        endpoint,
        status,
      },
    });
  } catch (err) {
    console.error("❌ Failed to log GitHub API hit:", err);
  }
}

// Helper to make GitHub request using user's token
async function githubFetch(userId: string, endpoint: string, options: RequestInit = {}) {
  const integration = await prisma.gitHubIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    throw new Error("GitHub account not connected.");
  }

  let token: string;
  try {
    token = decrypt(integration.encryptedToken);
  } catch (err) {
    throw new Error("Failed to decrypt secure GitHub token.");
  }

  const url = endpoint.startsWith("http") ? endpoint : `https://api.github.com${endpoint}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...options.headers,
  } as Record<string, string>;

  const res = await fetch(url, { ...options, headers });
  
  // Log request to Audit Log
  await logGitHubHit(userId, options.method || "GET", endpoint.split("?")[0], res.status);

  return res;
}

// ─── 2. Connect GitHub Token ───────────────────────────────────
export async function connectGitHub(token: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    await logGitHubHit(userId, "CONNECT", "GET /user", res.status);

    if (!res.ok) {
      return { error: "Invalid Personal Access Token." };
    }

    const userData = await res.json();
    const scopesHeader = res.headers.get("x-oauth-scopes") || "";
    const scopes = scopesHeader.split(",").map((s) => s.trim()).filter(Boolean);

    const encryptedToken = encrypt(token);

    await prisma.gitHubIntegration.upsert({
      where: { userId },
      update: {
        encryptedToken,
        githubUsername: userData.login,
        avatarUrl: userData.avatar_url,
      },
      create: {
        userId,
        encryptedToken,
        githubUsername: userData.login,
        avatarUrl: userData.avatar_url,
      },
    });

    revalidatePath("/developer");
    revalidatePath("/settings");

    return {
      success: true,
      username: userData.login,
      avatarUrl: userData.avatar_url,
      scopes,
    };
  } catch (err: any) {
    console.error("❌ connectGitHub error:", err);
    return { error: err.message || "Failed to connect to GitHub" };
  }
}

// ─── 3. Disconnect GitHub Token ────────────────────────────────
export async function disconnectGitHub() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  try {
    await prisma.gitHubIntegration.delete({
      where: { userId },
    });

    await logGitHubHit(userId, "DISCONNECT", "DELETE /user", 200);

    revalidatePath("/developer");
    revalidatePath("/settings");

    return { success: true };
  } catch (err: any) {
    console.error("❌ disconnectGitHub error:", err);
    return { error: err.message || "Failed to disconnect" };
  }
}

// ─── 4. Get Connection & Token Scope Status ────────────────────
export async function getGitHubStatus() {
  const session = await auth();
  if (!session?.user?.id) return { connected: false };
  const userId = session.user.id;

  try {
    const integration = await prisma.gitHubIntegration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return { connected: false };
    }

    // Try fetching /user to verify token works and read dynamic scopes
    const res = await githubFetch(userId, "/user");
    if (!res.ok) {
      // Token probably revoked or expired
      return { connected: true, expired: true, username: integration.githubUsername, avatarUrl: integration.avatarUrl };
    }

    const scopesHeader = res.headers.get("x-oauth-scopes") || "";
    const scopes = scopesHeader.split(",").map((s) => s.trim()).filter(Boolean);

    return {
      connected: true,
      expired: false,
      username: integration.githubUsername,
      avatarUrl: integration.avatarUrl,
      selectedRepos: integration.selectedRepos,
      scopes,
    };
  } catch (err) {
    return { connected: false };
  }
}

// ─── 5. Update Selected Repositories ───────────────────────────
export async function updateSelectedRepos(repos: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  try {
    await prisma.gitHubIntegration.update({
      where: { userId },
      data: { selectedRepos: repos },
    });

    revalidatePath("/developer");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update repositories" };
  }
}

// ─── 6. List User Repositories ────────────────────────────────
export async function listRepos() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  try {
    // Fetch user's public and private repos
    const res = await githubFetch(userId, "/user/repos?per_page=100&sort=updated");
    if (!res.ok) {
      return { error: `GitHub API error: ${res.statusText}` };
    }

    const reposData = await res.json();
    const repos = reposData.map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      private: r.private,
      description: r.description,
      url: r.html_url,
    }));

    return { success: true, repos };
  } catch (err: any) {
    return { error: err.message || "Failed to load repositories" };
  }
}

// ─── 7. List Repository Issues ─────────────────────────────────
export async function listIssues(repoFullName: string, state: "open" | "closed" | "all" = "open", page: number = 1) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  try {
    // GitHub endpoint: /repos/{owner}/{repo}/issues
    const res = await githubFetch(userId, `/repos/${repoFullName}/issues?state=${state}&page=${page}&per_page=30`);
    if (!res.ok) {
      return { error: `GitHub API error: ${res.statusText}` };
    }

    const issuesData = await res.json();
    
    // Note: GitHub issues includes Pull Requests. We need to filter them out if we want issues only.
    const issues = issuesData
      .filter((i: any) => !i.pull_request)
      .map((i: any) => ({
        id: i.id,
        number: i.number,
        title: i.title,
        body: i.body,
        state: i.state,
        htmlUrl: i.html_url,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        labels: i.labels.map((l: any) => ({ name: l.name, color: l.color })),
        user: {
          login: i.user.login,
          avatarUrl: i.user.avatar_url,
        },
      }));

    return { success: true, issues };
  } catch (err: any) {
    return { error: err.message || "Failed to load issues" };
  }
}

// ─── 8. Create Issue ───────────────────────────────────────────
export async function createIssue(repoFullName: string, title: string, body: string, labels: string[] = []) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  try {
    const defaultBody = `${body}\n\n---\n*Created via [Life OS](https://life-os.app) Developer Hub*`;
    const res = await githubFetch(userId, `/repos/${repoFullName}/issues`, {
      method: "POST",
      body: JSON.stringify({
        title,
        body: defaultBody,
        labels,
      }),
    });

    if (!res.ok) {
      return { error: `GitHub API error: ${res.statusText}` };
    }

    const issue = await res.json();
    return { success: true, issueNumber: issue.number, htmlUrl: issue.html_url };
  } catch (err: any) {
    return { error: err.message || "Failed to create issue" };
  }
}

// ─── 9. Get GitHub Audit Logs ─────────────────────────────────
export async function getGitHubAuditLogs() {
  const session = await auth();
  if (!session?.user?.id) return [];
  
  return await prisma.gitHubAuditLog.findMany({
    where: { userId: session.user.id },
    orderBy: { timestamp: "desc" },
    take: 50,
  });
}

// ─── 10. AI Voice-to-Issue Dynamic Drafting ────────────────────
export async function draftIssueFromVoice(transcript: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  try {
    // 1. Get connection and active repos
    const integration = await prisma.gitHubIntegration.findUnique({
      where: { userId },
    });
    if (!integration) {
      return { error: "GitHub integration not connected." };
    }

    const repos = integration.selectedRepos;
    if (repos.length === 0) {
      return { error: "Please configure and select at least one repository first." };
    }

    // 2. Fetch AI settings
    const aiSettings = await prisma.aISettings.findUnique({
      where: { userId },
    });
    if (!aiSettings || !aiSettings.apiKey) {
      return { error: "Please configure your AI brain key in Settings → AI Intelligence." };
    }

    const prompt = `You are an expert software developer and technical project assistant.
A user has dictated a voice note containing an issue, idea, or bug report.
Your tasks are:
1. Identify which repository from the user's active repositories the user is referring to.
2. Formulate a clear, concise, and professional GitHub Issue Title.
3. Formulate a rich, well-structured GitHub Issue Body in beautiful GitHub Flavored Markdown format. Follow standard software engineering patterns:
   - For bug reports: Include "Description", "Steps to Reproduce", "Expected Behavior".
   - For enhancements/features: Include "Detailed Description", "Use Case", "Proposed Solution".
4. Recommend appropriate labels (choose from: "bug", "enhancement", "documentation", "question").

User's Active Repositories (list of full names):
${repos.map((r: string) => `- ${r}`).join("\n")}

Voice Note Transcript:
"${transcript}"

    Provide the response strictly as a JSON object, with no markdown code blocks wrapping it, matching the following format.
CRITICAL: Inside the JSON string values (especially the "body" field), any literal newlines MUST be escaped as the sequence "\\n" (not actual line breaks), so that the output is 100% valid JSON parseable by JSON.parse().

{
  "targetRepo": "exact repo full name from list, or null if absolutely no match is found",
  "title": "Clear and professional title",
  "body": "Markdown string containing description etc.",
  "labels": ["bug" or "enhancement" etc]
}`;

    let responseText = "";

    if (aiSettings.provider === "GEMINI") {
      const genAI = new GoogleGenerativeAI(aiSettings.apiKey);
      const model = genAI.getGenerativeModel({ model: aiSettings.modelName || "gemini-1.5-pro" });
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    } else {
      // Default to OpenAI / custom baseUrl (Groq, OpenRouter, NVIDIA etc.)
      const isGroq = aiSettings.provider === "GROQ";
      const client = new OpenAI({
        apiKey: aiSettings.apiKey,
        baseURL: isGroq && !aiSettings.baseUrl ? "https://api.groq.com/openai/v1" : (aiSettings.baseUrl || undefined),
      });

      const response = await client.chat.completions.create({
        model: aiSettings.modelName || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });
      responseText = response.choices[0]?.message?.content || "";
    }

    // Clean response text just in case it contains markdown wrapper ```json
    let cleaned = responseText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.substring(7);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    let resultData: any;
    try {
      resultData = JSON.parse(cleaned);
    } catch (err) {
      console.warn("⚠️ Standard JSON.parse failed, attempting resilient cleanup on AI output:", err);
      try {
        // Replace literal control characters (like actual newlines) inside quotes with escaped versions
        const sanitized = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
          return match.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
        });
        resultData = JSON.parse(sanitized);
      } catch (nestedErr: any) {
        throw new Error(`AI generated invalid JSON: ${nestedErr.message}\nRaw Output: ${responseText}`);
      }
    }

    return { success: true, data: resultData };
  } catch (err: any) {
    console.error("❌ draftIssueFromVoice error:", err);
    return { error: err.message || "Failed to generate draft issue from voice" };
  }
}
