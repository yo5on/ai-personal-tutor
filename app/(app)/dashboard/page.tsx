import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, FileText, ListChecks } from "lucide-react";
import { saveName } from "@/app/actions";
import { Greeting } from "@/components/greeting";
import { ButtonLink, Card, CardHeader, EmptyState, ProgressBar, Stat, buttonStyles, scoreTone } from "@/components/ui";
import { getSetting, listSessions } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { getProgress } from "@/lib/progress";
import { getWorkspace } from "@/lib/workspace";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ws = await getWorkspace();
  const name = getSetting(ws, "name");
  const [latest] = listSessions(ws, 1);
  const progress = getProgress(ws);
  const focus = progress.weakTopics.length
    ? progress.weakTopics
    : [...progress.topicStats].sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);

  return (
    <div>
      <div className="mb-7">
        <Greeting name={name} />
        {!name && ws === "user" ? (
          <form action={saveName} className="mt-2 flex max-w-sm gap-2">
            <label htmlFor="name" className="sr-only">
              Your name
            </label>
            <input
              id="name"
              name="name"
              placeholder="What should the tutor call you?"
              className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm outline-none focus:border-navy"
            />
            <button className={buttonStyles.secondary + " py-1.5"}>Save</button>
          </form>
        ) : (
          <p className="mt-1 text-muted">Here&apos;s where you left off.</p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Continue learning" />
          {latest ? (
            <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted">{latest.subject}</p>
                <p className="mt-0.5 font-serif text-xl font-semibold text-ink">{latest.topic}</p>
                <p className="mt-1 text-sm text-muted">
                  {latest.materialTitle ? `Using “${latest.materialTitle}” · ` : ""}Last studied {timeAgo(latest.lastActiveAt)}
                </p>
              </div>
              <ButtonLink href={`/tutor?session=${latest.id}`}>
                Continue <ArrowRight size={16} />
              </ButtonLink>
            </div>
          ) : (
            <EmptyState
              title="Nothing in progress yet"
              action={<ButtonLink href="/tutor">Start a study session</ButtonLink>}
            >
              Pick a topic or upload your notes, and the tutor will take it from there.
            </EmptyState>
          )}
        </Card>

        <Card>
          <CardHeader title="Quick start" />
          <div className="flex flex-col p-2">
            {[
              { href: "/tutor", icon: BookOpen, label: "Ask the tutor" },
              { href: "/materials", icon: FileText, label: "Upload study material" },
              { href: "/quiz", icon: ListChecks, label: "Take a quiz" },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-subtle hover:text-ink"
              >
                <Icon size={17} className="text-navy" strokeWidth={1.8} />
                {label}
              </Link>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Your progress" action={<Link href="/progress" className="text-sm font-medium text-navy hover:underline">Details</Link>} />
          <div className="grid grid-cols-2 gap-6 px-5 py-5 sm:grid-cols-4">
            <Stat label="Topics studied" value={progress.topicsStudied} />
            <Stat label="Quiz accuracy" value={progress.accuracy === null ? "—" : `${progress.accuracy}%`} />
            <Stat label="Questions answered" value={progress.questionsAttempted} />
            <Stat label="Study time" value={`${progress.studyMinutes}`} hint="minutes with the tutor" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Focus areas" />
          {focus.length ? (
            <ul className="space-y-4 px-5 py-5">
              {focus.map((t) => (
                <li key={t.topic}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-ink">{t.topic}</span>
                    <span className="text-muted">{t.accuracy}%</span>
                  </div>
                  <ProgressBar value={t.accuracy} tone={scoreTone(t.accuracy)} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No quiz results yet">Take a quiz to see which topics need more practice.</EmptyState>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Recent activity" />
          {progress.recentActivity.length ? (
            <ul className="divide-y divide-line">
              {progress.recentActivity.slice(0, 6).map((a, i) => (
                <li key={i}>
                  <Link href={a.href} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-subtle">
                    <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
                      {a.kind === "quiz" ? "Quiz" : a.kind === "study" ? "Studied" : "Added"}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">{a.label}</span>
                    <span className="shrink-0 text-ink-soft">{a.detail}</span>
                    <span className="hidden w-24 shrink-0 text-right text-xs text-muted sm:block">{timeAgo(a.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No activity yet">Your study sessions and quiz results will show up here.</EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}
