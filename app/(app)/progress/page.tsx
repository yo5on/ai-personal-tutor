import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, CardHeader, EmptyState, PageHeader, ProgressBar, Stat, scoreTone } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { WEAK_THRESHOLD, getMissedQuestions, getProgress } from "@/lib/progress";
import { getWorkspace } from "@/lib/workspace";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage() {
  const ws = await getWorkspace();
  const p = getProgress(ws);
  const missed = getMissedQuestions(ws, 8);
  const scores = [...p.recentScores].reverse(); // oldest first for the chart

  return (
    <div>
      <PageHeader title="Progress" description="How your practice is going, and what to focus on next." />

      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-6 px-5 py-5 sm:grid-cols-4">
          <Stat
            label="Overall accuracy"
            value={p.accuracy === null ? "—" : `${p.accuracy}%`}
            hint={p.questionsAttempted ? `${p.correctAnswers} of ${p.questionsAttempted} correct` : "No answers yet"}
          />
          <Stat label="Questions attempted" value={p.questionsAttempted} hint={`${p.quizzesCompleted} quizzes completed`} />
          <Stat label="Topics studied" value={p.topicsStudied} />
          <Stat label="Study time" value={p.studyMinutes} hint="minutes with the tutor" />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent quiz scores" />
          {scores.length ? (
            <div className="px-5 py-5">
              <div className="flex h-40 items-end gap-2 border-b border-line" aria-hidden>
                {scores.map((s) => (
                  <div key={s.id} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[11px] text-muted">{s.percent}%</span>
                    <div
                      className={`w-full max-w-10 rounded-t-sm ${
                        { good: "bg-good", accent: "bg-accent", bad: "bg-bad" }[scoreTone(s.percent)]
                      }`}
                      style={{ height: `${Math.max(4, s.percent)}%` }}
                    />
                  </div>
                ))}
              </div>
              <ul className="mt-4 divide-y divide-line text-sm">
                {p.recentScores.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <Link href={`/quiz/${s.id}`} className="flex justify-between py-2 hover:text-navy">
                      <span className="text-ink">
                        {s.topic} <span className="text-muted">· {formatDate(s.at)}</span>
                      </span>
                      <span className="font-medium text-ink-soft">
                        {s.score}/{s.total} ({s.percent}%)
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState title="No completed quizzes" action={<ButtonLink href="/quiz">Take a quiz</ButtonLink>}>
              Finish a quiz to see your scores here.
            </EmptyState>
          )}
        </Card>

        <Card>
          <CardHeader title="Accuracy by topic" />
          {p.topicStats.length ? (
            <ul className="space-y-4 px-5 py-5">
              {p.topicStats.map((t) => (
                <li key={t.topic}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">{t.topic}</span>
                    <span className="text-muted">
                      {t.correct}/{t.attempted} · <span className="font-medium text-ink-soft">{t.accuracy}%</span>
                    </span>
                  </div>
                  <ProgressBar value={t.accuracy} tone={scoreTone(t.accuracy)} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing to show yet">Topic accuracy appears after your first quiz.</EmptyState>
          )}
        </Card>

        <Card>
          <CardHeader title="Weak topics" />
          {p.weakTopics.length ? (
            <ul className="divide-y divide-line">
              {p.weakTopics.map((t) => (
                <li key={t.topic} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span>
                    <span className="block text-sm font-medium text-ink">{t.topic}</span>
                    <span className="text-xs text-muted">{t.accuracy}% accuracy over {t.attempted} questions</span>
                  </span>
                  <ButtonLink href={`/quiz?topic=${encodeURIComponent(t.topic)}`} variant="secondary" className="px-3 py-1.5">
                    Practice
                  </ButtonLink>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No weak topics">
              Topics show up here when your accuracy is below {WEAK_THRESHOLD}% after at least 3 questions.
            </EmptyState>
          )}
        </Card>

        <Card>
          <CardHeader title="Questions to review" />
          {missed.length ? (
            <ul className="divide-y divide-line">
              {missed.map((m, i) => (
                <li key={i} className="px-5 py-3.5">
                  <p className="text-xs text-muted">
                    {m.topic} · {m.concept}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-ink">{m.question}</p>
                  <p className="mt-1 text-sm text-good">Answer: {m.correctAnswer}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing to review">Questions you get wrong are collected here.</EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}
