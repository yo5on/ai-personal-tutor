import type { Metadata } from "next";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { removeMaterial, startStudySession } from "@/app/actions";
import { UploadForm } from "@/components/upload-form";
import { Card, CardHeader, EmptyState, PageHeader, buttonStyles } from "@/components/ui";
import { listMaterials } from "@/lib/data";
import { formatDate, formatSize } from "@/lib/format";
import { getWorkspace } from "@/lib/workspace";

export const metadata: Metadata = { title: "Materials" };

export default async function MaterialsPage() {
  const ws = await getWorkspace();
  const materials = listMaterials(ws);

  return (
    <div>
      <PageHeader
        title="Materials"
        description="Upload lecture notes or readings. The tutor and quizzes will use them when you study that material."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="order-2 lg:order-1">
          <CardHeader title={`Your materials (${materials.length})`} />
          {materials.length ? (
            <>
              <div className="hidden grid-cols-[minmax(0,1fr)_60px_110px_auto] gap-4 border-b border-line px-5 py-2 text-xs font-medium uppercase tracking-wide text-muted xl:grid">
                <span>Name</span>
                <span>Type</span>
                <span>Uploaded</span>
                <span className="w-[132px]" />
              </div>
              <ul className="divide-y divide-line">
                {materials.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-col gap-3 px-5 py-3.5 xl:grid xl:grid-cols-[minmax(0,1fr)_60px_110px_auto] xl:items-center xl:gap-4"
                  >
                    <div className="min-w-0">
                      <Link href={`/materials/${m.id}`} className="block truncate font-medium text-ink hover:text-navy hover:underline">
                        {m.title}
                      </Link>
                      <p className="truncate text-xs text-muted">
                        <span className="xl:hidden">
                          {m.fileType.toUpperCase()} · {formatDate(m.createdAt)} ·{" "}
                        </span>
                        {m.subject} · {m.topic} · {formatSize(m.charCount)}
                      </p>
                    </div>
                    <span className="hidden xl:block">
                      <span className="rounded border border-line px-1.5 py-0.5 text-xs font-medium uppercase text-ink-soft">
                        {m.fileType}
                      </span>
                    </span>
                    <span className="hidden text-sm text-ink-soft xl:block">{formatDate(m.createdAt)}</span>
                    <div className="flex items-center gap-1.5">
                      <form action={startStudySession}>
                        <input type="hidden" name="materialId" value={m.id} />
                        <button className={buttonStyles.primary + " px-3 py-1.5"}>Study</button>
                      </form>
                      <Link href={`/materials/${m.id}`} className={buttonStyles.ghost}>
                        View
                      </Link>
                      <form action={removeMaterial}>
                        <input type="hidden" name="materialId" value={m.id} />
                        <button className={buttonStyles.ghost + " px-2"} aria-label={`Delete ${m.title}`} title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState title="No materials yet">
              Upload a PDF or text file of your notes to study it with the tutor.
            </EmptyState>
          )}
        </Card>

        <Card className="order-1 h-fit lg:order-2">
          <CardHeader title="Upload material" />
          <UploadForm />
        </Card>
      </div>
    </div>
  );
}
