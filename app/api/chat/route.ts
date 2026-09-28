import type { Content } from "@google/genai";
import { NextResponse } from "next/server";
import { addMessage, deleteMessage, getMaterial, getSession, getSetting, listMessages, touchSession } from "@/lib/data";
import { offlineDemoReply } from "@/lib/demo";
import {
  callGemini,
  GeminiSkippedError,
  getGemini,
  hasGeminiKey,
  toFriendlyError,
  type TimeBudget,
} from "@/lib/gemini";
import { tutorSystemPrompt } from "@/lib/prompts";
import { STREAM_ERROR_MARKER } from "@/lib/stream";
import { getWorkspace } from "@/lib/workspace";
import type { ChatMessage } from "@/types";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 4000;
const HISTORY_LIMIT = 40;
// How long to wait for Gemini's first words, across the whole model chain. Demo Mode switches
// to a prepared reply within 8 s; Personal Mode waits longer before reporting that Gemini is
// unavailable. Per-model limits leave room to try the next model if one stalls.
// totalMs leaves ~0.5 s for server overhead so the student sees a reply within 8 s end to end.
const DEMO_BUDGET: TimeBudget = { perModelMs: 5_000, totalMs: 7_400 };
const PERSONAL_BUDGET: TimeBudget = { perModelMs: 15_000, totalMs: 40_000 };

function toGeminiContents(history: ChatMessage[], message: string): Content[] {
  const contents: Content[] = [];
  for (const m of [...history.slice(-HISTORY_LIMIT), { role: "user" as const, content: message }]) {
    const role = m.role === "user" ? "user" : "model";
    if (contents.length === 0 && role === "model") continue; // conversation must open with the student
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts!.push({ text: m.content });
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }
  return contents;
}

function textResponse(body: ReadableStream<Uint8Array> | string, source: "gemini" | "prepared") {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Tutor-Source": source,
    },
  });
}

export async function POST(req: Request) {
  const ws = await getWorkspace();

  let body: { sessionId?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Type a question or pick one of the suggestions first." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `That message is too long. Keep it under ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const session = getSession(ws, Number(body.sessionId));
  if (!session) {
    return NextResponse.json({ error: "This study session no longer exists. Start a new one." }, { status: 404 });
  }

  const history = listMessages(session.id);
  const material = session.materialId ? getMaterial(ws, session.materialId) : null;
  const userMessageId = addMessage(session.id, "user", message);

  // Demo fallback: a prepared reply, stored and labelled as such so it is never passed off as Gemini.
  const replyPrepared = () => {
    const reply = offlineDemoReply(session.topic, message, history);
    addMessage(session.id, "tutor", reply, { source: "prepared" });
    touchSession(session.id);
    return textResponse(reply, "prepared");
  };

  // Demo Mode keeps working without a key so a presentation never dead-ends.
  if (ws === "demo" && !hasGeminiKey()) return replyPrepared();

  let stream: AsyncGenerator<{ text?: string }>;
  let firstChunk: IteratorResult<{ text?: string }>;
  try {
    const contents = toGeminiContents(history, message);
    const systemInstruction = tutorSystemPrompt({
      studentName: getSetting(ws, "name"),
      subject: session.subject,
      topic: session.topic,
      material: material ? { title: material.title, content: material.content } : null,
    });
    // Resolve only once the first chunk arrives, so the deadline covers a model that accepts
    // the request but then stalls.
    ({ stream, firstChunk } = await callGemini(
      ws === "demo" ? "demo" : "personal",
      ws === "demo" ? DEMO_BUDGET : PERSONAL_BUDGET,
      async (model, signal) => {
        const s = await getGemini().models.generateContentStream({
          model,
          contents,
          config: { systemInstruction, temperature: 0.7, abortSignal: signal },
        });
        return { stream: s, firstChunk: await s.next() };
      },
    ));
  } catch (err) {
    if (ws === "demo") {
      if (!(err instanceof GeminiSkippedError)) console.warn("[chat] Gemini unavailable in demo, using prepared reply");
      return replyPrepared();
    }
    deleteMessage(userMessageId); // let the student resend without a dangling message
    const { message: error, status } = toFriendlyError(err);
    return NextResponse.json({ error }, { status });
  }

  const encoder = new TextEncoder();
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      const push = (text: string | undefined) => {
        if (!text) return;
        full += text;
        controller.enqueue(encoder.encode(text));
      };
      try {
        if (!firstChunk.done) push(firstChunk.value.text);
        for await (const chunk of stream) push(chunk.text);
        if (!full.trim()) {
          controller.enqueue(
            encoder.encode(`${STREAM_ERROR_MARKER}The tutor couldn't answer that one. Try rephrasing your question.`),
          );
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`${STREAM_ERROR_MARKER}${toFriendlyError(err).message}`));
      } finally {
        if (full.trim()) {
          addMessage(session.id, "tutor", full, { source: "gemini" });
          touchSession(session.id);
        } else {
          deleteMessage(userMessageId);
        }
        controller.close();
      }
    },
  });

  return textResponse(body$, "gemini");
}
