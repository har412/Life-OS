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
    const settings = await prisma.aiSettings.findUnique({
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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const result = await model.generateContent([
        {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: audioFile.type
          }
        },
        "Transcribe this audio exactly as spoken."
      ]);
      transcript = result.response.text();
    } else {
      return new NextResponse(`STT not implemented for ${provider} yet.`, { status: 400 });
    }

    // 3. Task Extraction (LLM)
    const prompt = `
      You are a task management assistant. Analyze the following transcript from a "Think Aloud" session and extract a list of actionable tasks.
      
      RULES:
      - Extract: Title (concise), Description (context), DueDate (YYYY-MM-DD), Time (HH:mm), CategoryId (WORK, HEALTH, HOME, PERSONAL), and Priority (LOW, MEDIUM, HIGH, URGENT).
      - If no specific date is mentioned, leave DueDate as null.
      - If a day is mentioned (e.g. "this Saturday"), calculate the date relative to TODAY: ${new Date().toISOString().split('T')[0]}.
      - Output ONLY a JSON array of objects.
      
      TRANSCRIPT:
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
      const model = genAI.getGenerativeModel({ model: settings.modelName || "gemini-1.5-flash" });
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
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
