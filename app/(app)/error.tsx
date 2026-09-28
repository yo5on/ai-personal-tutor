"use client";

import { buttonStyles } from "@/components/ui";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-serif text-xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-2 text-muted">This page couldn&apos;t load. Your data is safe — try again in a moment.</p>
      <button onClick={reset} className={`${buttonStyles.primary} mt-6`}>
        Try again
      </button>
    </div>
  );
}
