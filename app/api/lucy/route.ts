import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

const systemPrompt = `You are Lucy, Vibe With Tribe's AI assistant. Be warm, thoughtful, concise, and helpful. You are an AI, not a human; never imply that you have a body, personal life, or human feelings. Reply in the language the user uses: English for English, Telugu for Telugu, and a natural mix when the user mixes them. Introduce yourself as Lucy if asked who you are. Be supportive without presenting yourself as a therapist or emergency service.`;

export function GET() {
  return NextResponse.json(
    { configured: Boolean(process.env.OPENAI_API_KEY) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Lucy is not configured yet. Add OPENAI_API_KEY to the server environment to enable AI replies." },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a valid chat request." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || !("messages" in payload) || !Array.isArray(payload.messages)) {
    return NextResponse.json({ error: "Chat history must be a list of messages." }, { status: 400 });
  }

  if (payload.messages.length === 0 || payload.messages.length > 16) {
    return NextResponse.json({ error: "Keep a conversation to 16 messages or fewer." }, { status: 400 });
  }

  const messages: ChatMessage[] = [];
  let totalCharacters = 0;
  for (const message of payload.messages) {
    if (
      !message ||
      typeof message !== "object" ||
      !("role" in message) ||
      !("content" in message) ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" ||
      message.content.length > 4000
    ) {
      return NextResponse.json({ error: "One of those messages is invalid or too long." }, { status: 400 });
    }
    totalCharacters += message.content.length;
    messages.push({ role: message.role, content: message.content });
  }

  if (totalCharacters > 12000 || messages[messages.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "The conversation is too long or is missing a new message." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_completion_tokens: 500,
        stream: true,
      }),
      signal: request.signal,
    });
  } catch {
    return NextResponse.json({ error: "Lucy couldn't reach the AI service. Check the server connection and try again." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Lucy couldn't get a reply right now. Please try again shortly." }, { status: 502 });
  }

  const textStream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";
        let finished = false;

        const readEvent = (line: string) => {
          if (!line.startsWith("data:")) return;
          const data = line.slice(5).trim();
          if (data === "[DONE]") { finished = true; return; }
          try {
            const event = JSON.parse(data) as { choices?: Array<{ delta?: { content?: unknown } }> };
            const token = event.choices?.[0]?.delta?.content;
            if (typeof token === "string") controller.enqueue(encoder.encode(token));
          } catch {
            // Ignore incomplete or non-content upstream events.
          }
        };

        try {
          while (!finished) {
            const { done, value } = await reader.read();
            buffer += decoder.decode(value, { stream: !done });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? "";
            for (const line of lines) readEvent(line);
            if (done) {
              if (buffer) readEvent(buffer);
              break;
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      })();
    },
  });

  return new Response(textStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}