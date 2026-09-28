import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { startStudySession } from "@/app/actions";
import { TutorChat } from "@/components/tutor-chat";
import { ButtonLink, Card, CardHeader, EmptyState, PageHeader, buttonStyles } from "@/components/ui";
import { getMaterial, getSession, getSetting, listMaterials, listMessages, listSessions, listTopicNames } from "@/lib/data";
import { formatMinutes } from "@/lib/progress";
import { MAX_MATERIAL_CHARS } from "@/lib/prompts";
import { timeAgo } from "@/lib/format";
import { hasGeminiKey } from "@/lib/gemini";
import { getWorkspace } from "@/lib/workspace";

export const metadata: Metadata = { title: "Tutor" };

export default async function TutorPage({ searchParams }: PageProps<"/tutor">) {
  const params = await searchParams;
  const ws = await getWorkspace();
  const sessionId = Number(params.session);

  if (!sessionId) return <StartSession error={params.error === "topic"} />;

  const session = getSession(ws, sessionId);
  if (!session) notFound();
  const messages = listMessages(session.id);
  const material = session.materialId ? getMaterial(ws, session.materialId) : null;
  const offline = ws === "demo" && !hasGeminiKey();
  const quizHref = material ? `/quiz?material=${material.id}` : `/quiz?topic=${encodeURIComponent(session.topic)}`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/tutor" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ArrowLeft size={14} /> All sessions
          </Link>
          <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-ink">{session.topic}</h1>
          <p className="text-sm text-muted">{session.subject}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <TutorChat
          sessionId={session.id}
          topic={session.topic}
          studentName={getSetting(ws, "name")}
          initialMessages={messages}
        />

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Study context" />
            <dl className="space-y-3 px-5 py-4 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">Topic</dt>
                <dd className="mt-0.5 font-medium text-ink">{session.topic}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">Material</dt>
                <dd className="mt-0.5">
                  {material ? (
                    <Link href={`/materials/${material.id}`} className="inline-flex items-start gap-1.5 font-medium text-navy hover:underline">
                      <FileText size={15} className="mt-0.5 shrink-0" />
                      {material.title}
                    </Link>
                  ) : (
                    <span className="text-muted">None — general knowledge</span>
                  )}
                  {material && material.charCount > MAX_MATERIAL_CHARS && (
                    <p className="mt-1 text-xs text-muted">Long document: the tutor reads the first ~40 pages.</p>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">Time in this session</dt>
                <dd className="mt-0.5 text-ink">{session.activeSeconds ? formatMinutes(session.activeSeconds) : "Just started"}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4">
            <p className="text-sm font-medium text-ink">Ready to test yourself?</p>
            <p className="mt-0.5 text-sm text-muted">A short multiple-choice quiz on {session.topic}.</p>
            <ButtonLink href={quizHref} variant="secondary" className="mt-3 w-full">
              Take a quiz
            </ButtonLink>
          </Card>

          <p className="px-1 text-xs text-muted">
            {offline
              ? "Demo is using prepared sample answers. Add a Gemini API key for live tutoring."
              : "Answers by Google Gemini. Check important facts against your course material."}
          </p>
        </aside>
      </div>
    </div>
  );
}

async function StartSession({ error }: { error: boolean }) {
  const ws = await getWorkspace();
  const materials = listMaterials(ws);
  const sessions = listSessions(ws, 8);
  const topics = listTopicNames(ws);

  return (
    <div>
      <PageHeader title="Tutor" description="Pick what you want to study. The tutor adapts to how you respond." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Study a topic" />
          <form action={startStudySession} className="space-y-4 px-5 py-5">
            <div>
              <label htmlFor="topic" className="text-sm font-medium text-ink">
                Topic
              </label>
              <input
                id="topic"
                name="topic"
                list="known-topics"
                required
                maxLength={80}
                placeholder="e.g. Recursion, Photosynthesis, Supply and demand"
                className="mt-1 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-navy"
              />
              <datalist id="known-topics">
                {topics.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              {error && <p className="mt-1 text-sm text-bad">Enter a topic to study.</p>}
            </div>
            <div>
              <label htmlFor="subject" className="text-sm font-medium text-ink">
                Subject <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="subject"
                name="subject"
                maxLength={80}
                placeholder="e.g. Data Structures"
                className="mt-1 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-navy"
              />
            </div>
            <button className={buttonStyles.primary}>Start session</button>
          </form>

          {materials.length > 0 && (
            <div className="border-t border-line px-5 py-4">
              <p className="mb-2 text-sm font-medium text-ink">Or study one of your materials</p>
              <ul className="divide-y divide-line">
                {materials.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{m.title}</span>
                      <span className="text-xs text-muted">
                        {m.subject} · {m.topic}
                      </span>
                    </span>
                    <form action={startStudySession}>
                      <input type="hidden" name="materialId" value={m.id} />
                      <button className={buttonStyles.secondary + " px-3 py-1.5"}>Study</button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent sessions" />
          {sessions.length ? (
            <ul className="divide-y divide-line">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link href={`/tutor?session=${s.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-subtle">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{s.topic}</span>
                      <span className="block truncate text-xs text-muted">
                        {s.subject}
                        {s.materialTitle ? ` · ${s.materialTitle}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{timeAgo(s.lastActiveAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No sessions yet">Start one on the left — your conversations are saved here.</EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}
