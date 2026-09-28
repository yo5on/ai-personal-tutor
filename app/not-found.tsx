import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-serif text-xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 text-muted">It may have been deleted, or it belongs to a different workspace (demo or personal).</p>
      <ButtonLink href="/dashboard" className="mt-6">
        Go to dashboard
      </ButtonLink>
    </div>
  );
}
