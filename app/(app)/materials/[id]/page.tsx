import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { startStudySession } from "@/app/actions";
import { ButtonLink, Card, buttonStyles } from "@/components/ui";
import { getMaterial } from "@/lib/data";
import { formatDate, formatSize } from "@/lib/format";
import { getWorkspace } from "@/lib/workspace";

export const metadata: Metadata = { title: "Material" };

export default async function MaterialPage({ params }: PageProps<"/materials/[id]">) {
  const { id } = await params;
  const ws = await getWorkspace();
  const material = getMaterial(ws, Number(id));
  if (!material) notFound();

  return (
    <div>
      <Link href="/materials" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} /> Materials
      </Link>
      <div className="mb-6 mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">{material.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {material.subject} · {material.topic} · {material.fileName} · {formatSize(material.charCount)} · Added{" "}
            {formatDate(material.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href={`/quiz?material=${material.id}`} variant="secondary">
            Quiz me on this
          </ButtonLink>
          <form action={startStudySession}>
            <input type="hidden" name="materialId" value={material.id} />
            <button className={buttonStyles.primary}>Study with tutor</button>
          </form>
        </div>
      </div>

      <Card className="px-5 py-6 sm:px-8">
        <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed text-ink">
          {material.content}
        </pre>
      </Card>
    </div>
  );
}
