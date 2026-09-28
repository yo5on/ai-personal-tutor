"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { buttonStyles } from "@/components/ui";

const MAX_BYTES = 10 * 1024 * 1024;

export function UploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function pick(f: File | null) {
    setError(null);
    setSuccess(null);
    if (!f) return setFile(null);
    const ext = f.name.toLowerCase().split(".").pop();
    if (ext !== "pdf" && ext !== "txt") {
      setFile(null);
      return setError("Only PDF and TXT files are supported.");
    }
    if (f.size > MAX_BYTES) {
      setFile(null);
      return setError("That file is larger than 10 MB. Try a smaller file.");
    }
    setFile(f);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return setError("Choose a PDF or TXT file to upload.");
    setBusy(true);
    setError(null);
    try {
      const data = new FormData(e.currentTarget);
      data.set("file", file);
      const res = await fetch("/api/materials", { method: "POST", body: data });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Upload failed. Please try again.");
        return;
      }
      setSuccess(`“${file.name}” was added.`);
      setFile(null);
      formRef.current?.reset();
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-navy";

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4 px-5 py-5">
      <label
        className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-line-strong bg-canvas px-4 py-6 text-center transition-colors hover:border-navy"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        <Upload size={20} className="text-muted" />
        <span className="mt-2 text-sm font-medium text-ink">{file ? file.name : "Choose a file or drop it here"}</span>
        <span className="mt-0.5 text-xs text-muted">PDF or TXT, up to 10 MB</span>
        <input
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="up-subject" className="text-sm font-medium text-ink">
            Subject
          </label>
          <input id="up-subject" name="subject" maxLength={80} placeholder="e.g. Biology" className={input} />
        </div>
        <div>
          <label htmlFor="up-topic" className="text-sm font-medium text-ink">
            Topic
          </label>
          <input id="up-topic" name="topic" maxLength={80} placeholder="e.g. Cell division" className={input} />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}
      {success && <p className="rounded-md bg-good-soft px-3 py-2 text-sm text-good">{success}</p>}

      <button className={buttonStyles.primary} disabled={busy || !file}>
        {busy ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
