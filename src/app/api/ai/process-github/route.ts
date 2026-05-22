import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { draftIssueFromVoice } from "@/app/actions/github";

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
      return new NextResponse("AI settings not configured. Please add your API key in Settings → AI Intelligence.", { status: 400 });
    }

    let transcript = "";
    const provider = settings.provider;
    const apiKey = settings.apiKey;

    // 2. STT (Speech-to-Text)
    if (provider === "OPENAI" || provider === "OPENROUTER" || provider === "NVIDIA" || provider === "GROQ") {
      const isGroq = provider === "GROQ" || settings.baseUrl?.includes("groq");
      const openai = new OpenAI({ apiKey: apiKey, baseURL: isGroq ? "https://api.groq.com/openai/v1" : (settings.baseUrl || undefined) });
      
      const file = new File([audioFile], "audio.webm", { type: audioFile.type });
      
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: isGroq ? "whisper-large-v3" : "whisper-1",
      });
      transcript = transcription.text;
    } else if (provider === "GEMINI") {
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = settings.modelName?.includes("gemini") ? settings.modelName : "gemini-1.5-flash-latest";
      const model = genAI.getGenerativeModel({ model: geminiModel });
      
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const result = await model.generateContent([
        {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: "audio/webm"
          }
        },
        "Transcribe this audio exactly as spoken. If there is no speech, return an empty string."
      ]);
      transcript = result.response.text();
    } else {
      return new NextResponse(`STT not implemented for ${provider} yet.`, { status: 400 });
    }

    if (!transcript.trim()) {
      return new NextResponse("No speech detected in the audio.", { status: 400 });
    }

    // 3. Draft GitHub Issue dynamically
    const draftRes = await draftIssueFromVoice(transcript);
    
    if (draftRes.error) {
      return new NextResponse(draftRes.error, { status: 400 });
    }

    return NextResponse.json({
      transcript,
      draft: draftRes.data,
    });

  } catch (error: any) {
    console.error("❌ Error processing GitHub Voice AI request:", error);
    
    const isRateLimit = error.status === 429 || 
                       error.message?.includes("429") || 
                       error.message?.includes("Too Many Requests") ||
                       error.message?.includes("quota");

    if (isRateLimit) {
      return new NextResponse("Rate limit exceeded. Please wait a moment or switch to a different AI model.", { status: 429 });
    }

    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
