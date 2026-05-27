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

    // 3. Expense Details Extraction (LLM)
    const prompt = `
      You are an expert personal finance assistant. Your job is to analyze a spoken expense "brain dump" transcript and extract structured parameters for an expense tracker module.

      TODAY IS: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

      RULES:
      1. FORMAT: You MUST return ONLY a JSON object with the following fields:
         - "amount": (number) The total numerical money spent or received (e.g. 50, 1200.5). If not mentioned, set to 0.
         - "description": (string) A clean, concise description of the expense or item (e.g. "Potato", "Taxi Fare", "Internet Bill"). Capitalize nicely.
         - "category": (string) Categorize it into EXACTLY one of: ["Food", "Travel", "Utilities", "Shopping", "Entertainment", "Health", "Investment", "Others"].
         - "date": (string) YYYY-MM-DD formatted date. If they specify "yesterday" or a past day, map it relative to TODAY. If not specified, default to today's date: "${new Date().toISOString().split('T')[0]}".
         - "quantity": (string) The amount/weight/count of the items (e.g., "1 kg", "2 packs", "3 units"). If not specified, set to "?".
         - "location": (string) The store, merchant, or location (e.g. "DMart", "Omaxe Market", "Ludhiana"). If not specified, set to "?".
         - "type": (string) "DEBIT" if they spent money (default), or "CREDIT" if they earned or received money (e.g. "salary received", "earned cash").
         - "paymentMode": (string) The payment method. Classify as one of: ["CASH", "UPI", "CARD", "BANK_TRANSFER"]. Deduce based on clues (e.g. "Google Pay" or "PhonePe" or "scanned UPI" -> "UPI", "credit card" -> "CARD", default to "CASH" if unclear).

      EXAMPLE TRANSCRIPT:
      "I bought fifty rupees potato from DMart today"
      EXAMPLE OUTPUT:
      {
        "amount": 50,
        "description": "Potato",
        "category": "Food",
        "date": "${new Date().toISOString().split('T')[0]}",
        "quantity": "?",
        "location": "DMart",
        "type": "DEBIT",
        "paymentMode": "CASH"
      }

      EXAMPLE TRANSCRIPT:
      "paid five hundred rupees for taxi fare via google pay yesterday"
      EXAMPLE OUTPUT:
      {
        "amount": 500,
        "description": "Taxi Fare",
        "category": "Travel",
        "date": "${new Date(Date.now() - 86400000).toISOString().split('T')[0]}",
        "quantity": "?",
        "location": "?",
        "type": "DEBIT",
        "paymentMode": "UPI"
      }

      TRANSCRIPT TO PROCESS:
      "${transcript}"
    `;

    let extractedExpense = null;

    if (provider === "OPENAI" || provider === "OPENROUTER" || provider === "NVIDIA" || provider === "GROQ") {
      const isGroq = provider === "GROQ" || settings.baseUrl?.includes("groq");
      const openai = new OpenAI({ apiKey: apiKey, baseURL: isGroq ? "https://api.groq.com/openai/v1" : (settings.baseUrl || undefined) });
      const response = await openai.chat.completions.create({
        model: isGroq && (!settings.modelName || settings.modelName === "gpt-4o") ? "llama3-70b-8192" : (settings.modelName || "gpt-4o"),
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const content = response.choices[0].message.content || "{}";
      extractedExpense = JSON.parse(content);
    } else if (provider === "GEMINI") {
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = settings.modelName?.includes("gemini") ? settings.modelName : "gemini-1.5-flash-latest";
      const model = genAI.getGenerativeModel({ model: geminiModel });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.replace(/```json|```/g, "").trim();
      extractedExpense = JSON.parse(jsonStr);
    } else if (provider === "CLAUDE") {
      const anthropic = new Anthropic({ apiKey: apiKey });
      const response = await anthropic.messages.create({
        model: settings.modelName || "claude-3-sonnet-20240229",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      const text = (response.content[0] as any).text;
      extractedExpense = JSON.parse(text);
    }

    return NextResponse.json({ transcript, expense: extractedExpense });

  } catch (error: any) {
    console.error("❌ Error processing AI expense request:", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
