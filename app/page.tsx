import { BarChart3, BookOpen, ListChecks } from "lucide-react";
import { enterDemo, startLearning } from "@/app/actions";
import { Logo } from "@/components/logo";
import { buttonStyles } from "@/components/ui";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Learn",
    body: "Ask questions and get step-by-step explanations that start from the basics, with examples and quick checks along the way. Upload your own notes and the tutor teaches from them.",
  },
  {
    icon: ListChecks,
    title: "Practice",
    body: "Generate multiple-choice quizzes from any topic or document. Each answer comes with a short explanation of why it's right — or what went wrong.",
  },
  {
    icon: BarChart3,
    title: "Track progress",
    body: "See your accuracy, recent quiz scores and the topics that need more work, so you know what to revise next.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-8">
          <Logo />
          <form action={enterDemo}>
            <button className={buttonStyles.ghost}>Try Demo</button>
          </form>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 pb-14 pt-16 sm:px-8 sm:pt-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">AI Personal Tutor</p>
          <h1 className="mt-3 max-w-2xl font-serif text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Learn at your own pace.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            A study space with a patient tutor that explains things from the ground up, quizzes you on what you&apos;ve
            covered, and keeps track of where you need more practice.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <form action={startLearning}>
              <button className={`${buttonStyles.primary} px-5 py-2.5 text-[15px]`}>Start Learning</button>
            </form>
            <form action={enterDemo}>
              <button className={`${buttonStyles.secondary} px-5 py-2.5 text-[15px]`}>Try Demo</button>
            </form>
          </div>
          <p className="mt-3 text-sm text-muted">
            The demo opens a sample Data Structures course — no setup or account needed.
          </p>
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:grid-cols-3 sm:px-8">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <Icon size={20} className="text-navy" strokeWidth={1.8} />
                <h2 className="mt-3 font-semibold text-ink">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted sm:px-8">AI Personal Tutor</div>
      </footer>
    </div>
  );
}
