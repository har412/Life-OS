import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;
    
    if (!audioFile) {
      return new NextResponse("No audio file provided", { status: 400 });
    }

    // 1. Get User AI Settings
    const settings = await prisma.aISettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings || !settings.apiKey) {
      return new NextResponse("AI settings not configured. Please add your API key in Settings.", { status: 400 });
    }

    let transcript = "";
    const provider = settings.provider;
    const apiKey = settings.apiKey;

    // 2. STT (Speech-to-Text)
    if (provider === "OPENAI" || provider === "OPENROUTER" || provider === "NVIDIA") {
      // Use OpenAI Whisper (most providers like OpenRouter don't support Whisper directly via standard completion)
      // So we assume the user has an OpenAI key if they want high-quality STT.
      // If they use NVIDIA/OpenRouter, we might need a fallback or they must provide an OpenAI key.
      
      const openai = new OpenAI({ apiKey: apiKey, baseURL: settings.baseUrl || undefined });
      
      // OpenAI Whisper expects a File object
      const file = new File([audioFile], "audio.webm", { type: audioFile.type });
      
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
      });
      transcript = transcription.text;
    } else if (provider === "GEMINI") {
      const genAI = new GoogleGenerativeAI(apiKey);
      // Try 'gemini-1.5-flash-latest' which is often more reliable than just 'gemini-1.5-flash'
      const geminiModel = settings.modelName?.includes("gemini") ? settings.modelName : "gemini-1.5-flash-latest";
      const model = genAI.getGenerativeModel({ model: geminiModel });
      
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const result = await model.generateContent([
        {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: "audio/webm" // Force standard audio mime type
          }
        },
        "Transcribe this audio exactly as spoken. If there is no speech, return an empty string."
      ]);
      transcript = result.response.text();
    } else {
      return new NextResponse(`STT not implemented for ${provider} yet.`, { status: 400 });
    }

    // 3. Task Extraction (LLM)
    const prompt = `
      You are an expert personal assistant. Your job is to analyze a "brain dump" transcript and extract structured tasks for a productivity app.

      TODAY IS: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

      RULES:
      1. FORMAT: You MUST return ONLY a JSON object with a key named "tasks" containing an array of objects.
      2. TITLE: Create a concise title (e.g., "🛒 Buy Groceries").
      3. DESCRIPTION: Include helpful context if mentioned.
      4. CATEGORY: Pick one of: [WORK, PERSONAL, HEALTH, HOME, FINANCE]. Default to PERSONAL.
      5. PRIORITY: Pick one of: [LOW, MEDIUM, HIGH, URGENT]. Use URGENT if they sound stressed.
      6. SCHEDULING: 
         - If a date/time is mentioned, set "dueDate" (YYYY-MM-DD) and "time" (HH:mm).
         - Set "status" to "SCHEDULED" if there is a date, otherwise "BACKLOG".
      7. REMINDERS: If they mention a reminder (e.g. "30 mins before"), set "reminderOffset" to the number of minutes (e.g., 30).
      
      EXAMPLE OUTPUT:
      {
        "tasks": [
          {
            "title": "Fix bathroom leak",
            "description": "Call plumber about the leak under the sink",
            "dueDate": "2026-04-26",
            "time": "10:00",
            "categoryId": "HOME",
            "priority": "HIGH",
            "status": "SCHEDULED",
            "reminderOffset": 30
          }
        ]
      }

      TRANSCRIPT TO PROCESS:
      "${transcript}"
    `;

    let extractedTasks = [];

    if (provider === "OPENAI" || provider === "OPENROUTER" || provider === "NVIDIA") {
      const openai = new OpenAI({ apiKey: apiKey, baseURL: settings.baseUrl || undefined });
      const response = await openai.chat.completions.create({
        model: settings.modelName || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const content = response.choices[0].message.content || "{}";
      const parsed = JSON.parse(content);
      extractedTasks = parsed.tasks || parsed.items || Object.values(parsed)[0] || [];
    } else if (provider === "GEMINI") {
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = settings.modelName?.includes("gemini") ? settings.modelName : "gemini-1.5-flash-latest";
      const model = genAI.getGenerativeModel({ model: geminiModel });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      // Gemini sometimes adds markdown blocks
      const jsonStr = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      extractedTasks = parsed.tasks || parsed.items || Object.values(parsed)[0] || [];
    } else if (provider === "CLAUDE") {
      const anthropic = new Anthropic({ apiKey: apiKey });
      const response = await anthropic.messages.create({
        model: settings.modelName || "claude-3-sonnet-20240229",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      // Claude is very good at following JSON instructions
      const text = (response.content[0] as any).text;
      const parsed = JSON.parse(text);
      extractedTasks = parsed.tasks || parsed.items || Object.values(parsed)[0] || [];
    }

    return NextResponse.json({ transcript, tasks: extractedTasks });

  } catch (error: any) {
    console.error("❌ Error processing AI request:", error);
    
    // Handle Rate Limiting (429) specifically
    const isRateLimit = error.status === 429 || 
                       error.message?.includes("429") || 
                       error.message?.includes("Too Many Requests") ||
                       error.message?.includes("quota");

    if (isRateLimit) {
      return new NextResponse("Rate limit exceeded. Please wait a moment or switch to a different AI model in Settings.", { status: 429 });
    }

    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
