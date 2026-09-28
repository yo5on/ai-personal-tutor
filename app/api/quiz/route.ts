import { NextResponse } from "next/server";
import { z } from "zod";
import { pickDemoQuestions } from "@/data/demo-questions";
import { createQuiz, getMaterial } from "@/lib/data";
import {
  AiNotConfiguredError,
  callGemini,
  GeminiSkippedError,
  getGemini,
  hasGeminiKey,
  toFriendlyError,
  type TimeBudget,
} from "@/lib/gemini";
import { QUIZ_JSON_SCHEMA, quizPrompt } from "@/lib/prompts";
import { getWorkspace } from "@/lib/workspace";
import type { QuizQuestion } from "@/types";

export const runtime = "nodejs";

const RequestSchema = z.object({
  materialId: z.number().int().positive().nullable().optional(),
  topic: z.string().trim().max(80).optional(),
  subject: z.string().trim().max(80).optional(),
  count: z.number().int().min(3).max(10).default(5),
});

const QuestionSchema = z.object({
  question: z.string().trim().min(5),
  options: z.array(z.string().trim().min(1)).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(5),
  concept: z.string().trim().min(1).max(60),
});

const QuizSchema = z.object({ questions: z.array(z.unknown()) });

// A quiz arrives in one response (not streamed), so these bound the whole generation across the
// model chain. A live quiz takes ~8–18 s, so in Demo Mode one model may use the full 15 s; fast
// failures (429/503) still leave time for the next model before the prepared question bank.
// totalMs leaves ~0.5 s for server overhead so the quiz appears within 15 s end to end.
const DEMO_BUDGET: TimeBudget = { perModelMs: 14_400, totalMs: 14_400 };
const PERSONAL_BUDGET: TimeBudget = { perModelMs: 30_000, totalMs: 60_000 };

async function generateWithGemini(mode: "demo" | "personal", prompt: string, count: number): Promise<QuizQuestion[]> {
  const response = await callGemini(
    mode,
    mode === "demo" ? DEMO_BUDGET : PERSONAL_BUDGET,
    (model, signal) =>
      getGemini().models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: QUIZ_JSON_SCHEMA,
          temperature: 0.6,
          abortSignal: signal,
        },
      }),
  );
  const raw = QuizSchema.parse(JSON.parse(response.text ?? ""));
  // Keep every well-formed question and drop any the model got wrong, rather than failing the quiz.
  const questions = raw.questions.flatMap((q) => {
    const parsed = QuestionSchema.safeParse(q);
    return parsed.success && new Set(parsed.data.options).size === 4 ? [parsed.data] : [];
  });
  if (questions.length < Math.min(3, count)) throw new Error("Quiz response had too few valid questions");
  return questions.slice(0, count);
}

export async function POST(req: Request) {
  const ws = await getWorkspace();

  let input: z.infer<typeof RequestSchema>;
  try {
    input = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Pick a topic or material for the quiz." }, { status: 400 });
  }

  const material = input.materialId ? getMaterial(ws, input.materialId) : null;
  if (input.materialId && !material) {
    return NextResponse.json({ error: "That material was not found. It may have been deleted." }, { status: 404 });
  }
  const topic = material?.topic ?? input.topic;
  const subject = material?.subject ?? (input.subject || "General");
  if (!topic) {
    return NextResponse.json({ error: "Pick a topic or material for the quiz." }, { status: 400 });
  }

  let questions: QuizQuestion[] | null = null;
  let source: "gemini" | "prepared" = "gemini";

  if (hasGeminiKey()) {
    try {
      questions = await generateWithGemini(
        ws === "demo" ? "demo" : "personal",
        quizPrompt({
          subject,
          topic,
          count: input.count,
          material: material ? { title: material.title, content: material.content } : null,
        }),
        input.count,
      );
    } catch (err) {
      if (ws !== "demo") {
        if (err instanceof SyntaxError || err instanceof z.ZodError || (err instanceof Error && err.message.startsWith("Quiz response"))) {
          console.error("[quiz] invalid quiz JSON from Gemini:", err.message);
          return NextResponse.json(
            { error: "The quiz came back incomplete. Please try generating it again." },
            { status: 502 },
          );
        }
        const { message, status } = toFriendlyError(err);
        return NextResponse.json({ error: message }, { status });
      }
      // In Demo Mode, fall through to the prepared question bank.
      if (!(err instanceof GeminiSkippedError)) {
        console.warn("[quiz] Gemini unavailable in demo mode, using prepared questions");
      }
    }
  } else if (ws !== "demo") {
    const { message, status } = toFriendlyError(new AiNotConfiguredError());
    return NextResponse.json({ error: message }, { status });
  }

  if (!questions) {
    questions = pickDemoQuestions(topic, input.count);
    source = "prepared";
    if (!questions) {
      return NextResponse.json(
        {
          error:
            "Gemini is unavailable right now, and prepared demo quizzes only cover Arrays, Linked Lists, Recursion and Binary Trees. Pick one of those.",
        },
        { status: 400 },
      );
    }
  }

  const quizId = createQuiz(ws, { subject, topic, materialId: material?.id ?? null, questions, source });
  return NextResponse.json({ quizId, source });
}
