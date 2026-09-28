"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { startStudySession } from "@/app/actions";
import { ProgressBar, buttonStyles, scoreTone } from "@/components/ui";
import type { PublicQuizQuestion, QuizAnswer } from "@/types";

export function QuizRunner({
  quizId,
  topic,
  subject,
  materialId,
  questions,
  initialAnswers,
}: {
  quizId: number;
  topic: string;
  subject: string;
  materialId: number | null;
  questions: PublicQuizQuestion[];
  initialAnswers: QuizAnswer[];
}) {
  const [answers, setAnswers] = useState<Record<number, QuizAnswer>>(
    Object.fromEntries(initialAnswers.map((a) => [a.questionIndex, a])),
  );
  const firstUnanswered = questions.findIndex((_, i) => !answers[i]);
  const [index, setIndex] = useState(firstUnanswered === -1 ? questions.length : firstUnanswered);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = questions.length;
  const done = index >= total;

  async function submit() {
    if (selected === null) return setError("Select an answer first.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quiz/${quizId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex: index, selected }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Couldn't check that answer. Please try again.");
        return;
      }
      setAnswers((prev) => ({
        ...prev,
        [index]: {
          questionIndex: index,
          selected,
          isCorrect: json.isCorrect,
          answerIndex: json.answerIndex,
          explanation: json.explanation,
        },
      }));
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setSelected(null);
    setError(null);
    setIndex((i) => i + 1);
  }

  if (done) {
    return <QuizResults {...{ topic, subject, materialId, questions, answers }} />;
  }

  const q = questions[index];
  const answer = answers[index];
  const letter = (i: number) => String.fromCharCode(65 + i);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-ink-soft">
          Question {index + 1} of {total}
        </span>
        <span className="text-muted">{q.concept}</span>
      </div>
      <ProgressBar value={(index / total) * 100} />

      <div className="mt-6 rounded-lg border border-line bg-surface px-5 py-6 sm:px-7">
        <h2 className="text-lg font-semibold leading-snug text-ink">{q.question}</h2>

        <div className="mt-5 flex flex-col gap-2" role="radiogroup" aria-label="Answer options">
          {q.options.map((opt, i) => {
            const isChosen = answer ? answer.selected === i : selected === i;
            const isRight = answer && answer.answerIndex === i;
            const isWrongChoice = answer && answer.selected === i && !answer.isCorrect;
            let style = "border-line hover:border-line-strong hover:bg-subtle";
            if (!answer && isChosen) style = "border-navy bg-navy-soft";
            if (isRight) style = "border-good bg-good-soft";
            if (isWrongChoice) style = "border-bad bg-bad-soft";
            if (answer && !isRight && !isWrongChoice) style = "border-line opacity-70";

            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={isChosen}
                disabled={Boolean(answer) || busy}
                onClick={() => setSelected(i)}
                className={`flex items-start gap-3 rounded-md border px-4 py-3 text-left text-[15px] transition-colors ${style}`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] font-semibold ${
                    isChosen && !answer ? "border-navy bg-navy text-white" : "border-line-strong text-muted"
                  }`}
                >
                  {isRight ? <Check size={12} className="text-good" /> : isWrongChoice ? <X size={12} className="text-bad" /> : letter(i)}
                </span>
                <span className="text-ink">{opt}</span>
              </button>
            );
          })}
        </div>

        {answer && (
          <div className={`mt-5 rounded-md px-4 py-3 ${answer.isCorrect ? "bg-good-soft" : "bg-bad-soft"}`}>
            <p className={`font-semibold ${answer.isCorrect ? "text-good" : "text-bad"}`}>
              {answer.isCorrect ? "Correct" : `Incorrect — the answer is ${letter(answer.answerIndex)}`}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{answer.explanation}</p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-bad">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end">
          {answer ? (
            <button onClick={next} className={buttonStyles.primary}>
              {index + 1 === total ? "See results" : "Next question"}
            </button>
          ) : (
            <button onClick={submit} disabled={busy || selected === null} className={buttonStyles.primary}>
              {busy ? "Checking…" : "Submit answer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizResults({
  topic,
  subject,
  materialId,
  questions,
  answers,
}: {
  topic: string;
  subject: string;
  materialId: number | null;
  questions: PublicQuizQuestion[];
  answers: Record<number, QuizAnswer>;
}) {
  const total = questions.length;
  const correct = Object.values(answers).filter((a) => a.isCorrect).length;
  const percent = Math.round((correct / Math.max(1, total)) * 100);
  const missed = questions.map((q, i) => ({ q, a: answers[i], i })).filter((x) => x.a && !x.a.isCorrect);
  const revise = [...new Set(missed.map((m) => m.q.concept))];

  const verdict =
    percent >= 80 ? "Strong result." : percent >= 60 ? "Solid, with a few gaps." : "Worth another pass with the tutor.";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-lg border border-line bg-surface px-5 py-6 sm:px-7">
        <p className="text-sm text-muted">
          {subject} · {topic}
        </p>
        <div className="mt-2 flex items-end gap-3">
          <span className="font-serif text-5xl font-semibold text-ink">{percent}%</span>
          <span className="pb-1.5 text-ink-soft">{verdict}</span>
        </div>
        <div className="mt-4">
          <ProgressBar value={percent} tone={scoreTone(percent)} />
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5 text-center">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Score</dt>
            <dd className="mt-1 text-xl font-semibold text-ink">
              {correct}/{total}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Correct</dt>
            <dd className="mt-1 text-xl font-semibold text-good">{correct}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Incorrect</dt>
            <dd className="mt-1 text-xl font-semibold text-bad">{total - correct}</dd>
          </div>
        </dl>

        {revise.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-ink">Topics to revise</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {revise.map((c) => (
                <span key={c} className="rounded border border-accent/30 bg-accent-soft px-2 py-0.5 text-sm text-accent">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-2">
          <form action={startStudySession}>
            {materialId ? (
              <input type="hidden" name="materialId" value={materialId} />
            ) : (
              <>
                <input type="hidden" name="topic" value={topic} />
                <input type="hidden" name="subject" value={subject} />
              </>
            )}
            <button className={buttonStyles.primary}>Review with the tutor</button>
          </form>
          <Link href={materialId ? `/quiz?material=${materialId}` : `/quiz?topic=${encodeURIComponent(topic)}`} className={buttonStyles.secondary}>
            New quiz
          </Link>
          <Link href="/progress" className={buttonStyles.ghost}>
            View progress
          </Link>
        </div>
      </div>

      {missed.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-ink">Questions you missed</h3>
          <ul className="space-y-3">
            {missed.map(({ q, a, i }) => (
              <li key={i} className="rounded-lg border border-line bg-surface px-5 py-4">
                <p className="font-medium text-ink">{q.question}</p>
                <p className="mt-2 text-sm text-bad">Your answer: {q.options[a.selected]}</p>
                <p className="text-sm text-good">Correct answer: {q.options[a.answerIndex]}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{a.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
