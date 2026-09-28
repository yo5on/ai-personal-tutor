import { NextResponse } from "next/server";
import { completeQuizIfDone, getQuiz, recordAnswer } from "@/lib/data";
import { getWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

// Answers are checked on the server so the answer key never reaches the browser early.
export async function POST(req: Request, ctx: RouteContext<"/api/quiz/[id]/answer">) {
  const ws = await getWorkspace();
  const { id } = await ctx.params;
  const quiz = getQuiz(ws, Number(id));
  if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

  let body: { questionIndex?: unknown; selected?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const questionIndex = Number(body.questionIndex);
  const selected = Number(body.selected);
  const question = quiz.questions[questionIndex];
  if (!question || !Number.isInteger(selected) || selected < 0 || selected >= question.options.length) {
    return NextResponse.json({ error: "Select one of the options first." }, { status: 400 });
  }

  const isCorrect = selected === question.answerIndex;
  recordAnswer(quiz.id, { questionIndex, concept: question.concept, selected, isCorrect });
  const score = completeQuizIfDone(quiz.id, quiz.total);

  return NextResponse.json({
    isCorrect,
    answerIndex: question.answerIndex,
    explanation: question.explanation,
    completed: score !== null,
    score,
  });
}
