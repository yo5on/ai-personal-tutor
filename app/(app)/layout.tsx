import Link from "next/link";
import { resetDemo, startLearning } from "@/app/actions";
import { MobileNav, SidebarNav } from "@/components/app-nav";
import { Logo } from "@/components/logo";
import { hasGeminiKey } from "@/lib/gemini";
import { getWorkspace } from "@/lib/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ws = await getWorkspace();
  const demo = ws === "demo";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="hidden border-r border-line bg-surface lg:flex lg:h-screen lg:flex-col lg:sticky lg:top-0">
        <div className="px-5 pb-5 pt-6">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>
        <div className="px-3">
          <SidebarNav />
        </div>
        <div className="mt-auto border-t border-line px-5 py-4 text-xs text-muted">
          {demo ? (
            <>
              <p className="font-medium text-ink-soft">Demo workspace</p>
              <p className="mt-0.5">Sample data, kept separate from your own.</p>
            </>
          ) : (
            <>
              <p className="font-medium text-ink-soft">Your workspace</p>
              <p className="mt-0.5">Stored on this server.</p>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </header>

        {demo && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-accent/25 bg-accent-soft px-4 py-2 text-sm text-ink-soft sm:px-8">
            <span>
              <span className="font-semibold text-accent">Demo Mode</span> — you&apos;re exploring a sample Data
              Structures workspace.
              {!hasGeminiKey() && " The tutor is using prepared sample answers."}
            </span>
            <span className="ml-auto flex gap-3">
              <form action={resetDemo}>
                <button className="font-medium text-ink underline-offset-2 hover:underline">Reset demo</button>
              </form>
              <form action={startLearning}>
                <button className="font-medium text-ink underline-offset-2 hover:underline">Exit demo</button>
              </form>
            </span>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-8 sm:pt-8 lg:pb-12">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}
