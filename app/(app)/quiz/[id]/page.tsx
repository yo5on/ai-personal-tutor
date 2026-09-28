import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QuizRunner } from "@/components/quiz-runner";
import { getQuiz, listAnswers } from "@/lib/data";
import { getWorkspace } from "@/lib/workspace";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizRunPage({ params }: PageProps<"/quiz/[id]">) {
  const { id } = await params;
  const ws = await getWorkspace();
  const quiz = getQuiz(ws, Number(id));
  if (!quiz) notFound();


  return (
    <div>
      <Link href="/quiz" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} /> All quizzes
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">{quiz.topic} quiz</h1>
        {quiz.source === "prepared" && (
          <span className="rounded border border-accent/30 bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
            Demo fallback — prepared questions
          </span>
        )}
      </div>
      <QuizRunner
        quizId={quiz.id}
        topic={quiz.topic}
        subject={quiz.subject}
        materialId={quiz.materialId}
        // Strip the answer key before it reaches the browser.
        questions={quiz.questions.map(({ question, options, concept }) => ({ question, options, concept }))}
        initialAnswers={listAnswers(quiz.id, quiz.questions)}
      />
    </div>
  );
}
