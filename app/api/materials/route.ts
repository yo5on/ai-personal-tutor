import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import { createMaterial } from "@/lib/data";
import { getWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_STORED_CHARS = 500_000;

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function titleFromFileName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export async function POST(req: Request) {
  const ws = await getWorkspace();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("The upload didn't come through. Please try again.");
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a PDF or TXT file to upload.");
  if (file.size > MAX_FILE_BYTES) return fail("That file is larger than 10 MB. Try a smaller file.");

  const ext = file.name.toLowerCase().split(".").pop();
  if (ext !== "pdf" && ext !== "txt") return fail("Only PDF and TXT files are supported.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;

  if (ext === "pdf") {
    // Reject files that are named .pdf but aren't PDFs.
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
      return fail("That file doesn't look like a valid PDF.");
    }
    try {
      const result = await extractText(bytes, { mergePages: true });
      text = result.text;
    } catch (err) {
      console.error("[materials] PDF extraction failed:", err instanceof Error ? err.message : err);
      return fail("We couldn't read that PDF. It may be damaged or password-protected.");
    }
  } else {
    text = new TextDecoder("utf-8").decode(bytes);
    if (text.includes("\u0000")) return fail("That file doesn't look like plain text.");
  }

  text = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 20) {
    return fail(
      ext === "pdf"
        ? "We couldn't find any text in this PDF. Scanned PDFs (images of pages) aren't supported yet."
        : "This file is empty.",
    );
  }
  if (text.length > MAX_STORED_CHARS) {
    return fail("This document is too long (over ~250 pages). Split it into smaller files, e.g. one per chapter.");
  }

  const clean = (v: FormDataEntryValue | null, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const title = clean(form.get("title"), 120) || titleFromFileName(file.name);
  const subject = clean(form.get("subject"), 80) || "General";
  const topic = clean(form.get("topic"), 80) || title;

  const id = createMaterial(ws, {
    title,
    fileName: file.name.slice(0, 200),
    fileType: ext,
    subject,
    topic,
    content: text,
  });

  return NextResponse.json({ id });
}
