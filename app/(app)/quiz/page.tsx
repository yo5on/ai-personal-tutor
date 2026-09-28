import type { Metadata } from "next";
import Link from "next/link";
import { QuizSetup } from "@/components/quiz-setup";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { listMaterials, listQuizzes, listTopicNames } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { getWorkspace } from "@/lib/workspace";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage({ searchParams }: PageProps<"/quiz">) {
  const params = await searchParams;
  const ws = await getWorkspace();
  const materials = listMaterials(ws);
  const quizzes = listQuizzes(ws, 12);
  const topics = listTopicNames(ws);

  const requestedMaterial = Number(params.material);
  const initialMaterialId = materials.some((m) => m.id === requestedMaterial) ? requestedMaterial : null;
  const initialTopic = typeof params.topic === "string" ? params.topic.slice(0, 80) : "";

  return (
    <div>
      <PageHeader title="Quiz" description="Test yourself with multiple-choice questions, one at a time." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="h-fit">
          <CardHeader title="New quiz" />
          <QuizSetup
            materials={materials.map((m) => ({ id: m.id, title: m.title, topic: m.topic }))}
            topics={topics}
            initialMaterialId={initialMaterialId}
            initialTopic={initialTopic}
          />
        </Card>

        <Card className="h-fit">
          <CardHeader title="Previous quizzes" />
          {quizzes.length ? (
            <ul className="divide-y divide-line">
              {quizzes.map((q) => {
                const percent = q.score === null ? null : Math.round((q.score / q.total) * 100);
                return (
                  <li key={q.id}>
                    <Link href={`/quiz/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-subtle">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{q.topic}</span>
                        <span className="text-xs text-muted">
                          {q.total} questions · {timeAgo(q.completedAt ?? q.createdAt)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium text-ink-soft">
                        {percent === null ? <span className="text-accent">Resume</span> : `${percent}%`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No quizzes yet">Your quiz history will appear here.</EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}
