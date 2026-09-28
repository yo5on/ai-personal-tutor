"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonStyles } from "@/components/ui";

interface Option {
  id: number;
  title: string;
  topic: string;
}

export function QuizSetup({
  materials,
  topics,
  initialMaterialId,
  initialTopic,
}: {
  materials: Option[];
  topics: string[];
  initialMaterialId: number | null;
  initialTopic: string;
}) {
  const router = useRouter();
  const [source, setSource] = useState<"material" | "topic">(
    initialTopic || materials.length === 0 ? "topic" : "material",
  );
  const [materialId, setMaterialId] = useState<number | null>(initialMaterialId ?? materials[0]?.id ?? null);
  const [topic, setTopic] = useState(initialTopic);
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (source === "topic" && !topic.trim()) return setError("Enter a topic for the quiz.");
    if (source === "material" && !materialId) return setError("Choose a material.");

    setBusy(true);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          source === "material" ? { materialId, count } : { topic: topic.trim(), count },
        ),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.quizId) {
        setError(json?.error ?? "The quiz couldn't be generated. Please try again.");
        setBusy(false);
        return;
      }
      router.push(`/quiz/${json.quizId}`);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  const input =
    "mt-1 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-navy";
  const tab = (active: boolean) =>
    `flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
    }`;

  return (
    <form onSubmit={generate} className="space-y-5 px-5 py-5">
      <div className="flex gap-1 rounded-md bg-subtle p-1" role="tablist">
        <button type="button" role="tab" aria-selected={source === "material"} className={tab(source === "material")} onClick={() => setSource("material")}>
          From a material
        </button>
        <button type="button" role="tab" aria-selected={source === "topic"} className={tab(source === "topic")} onClick={() => setSource("topic")}>
          Any topic
        </button>
      </div>

      {source === "material" ? (
        materials.length ? (
          <div>
            <label htmlFor="quiz-material" className="text-sm font-medium text-ink">
              Material
            </label>
            <select
              id="quiz-material"
              value={materialId ?? ""}
              onChange={(e) => setMaterialId(Number(e.target.value))}
              className={input}
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-muted">Upload a material first, or switch to “Any topic”.</p>
        )
      ) : (
        <div>
          <label htmlFor="quiz-topic" className="text-sm font-medium text-ink">
            Topic
          </label>
          <input
            id="quiz-topic"
            list="quiz-topics"
            value={topic}
            maxLength={80}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Binary Trees"
            className={input}
          />
          <datalist id="quiz-topics">
            {[...new Set(topics)].map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
      )}

      <fieldset>
        <legend className="text-sm font-medium text-ink">Number of questions</legend>
        <div className="mt-1.5 flex gap-2">
          {[5, 10].map((n) => (
            <label
              key={n}
              className={`cursor-pointer rounded-md border px-4 py-1.5 text-sm font-medium ${
                count === n ? "border-navy bg-navy-soft text-navy" : "border-line-strong text-ink-soft hover:bg-subtle"
              }`}
            >
              <input type="radio" name="count" value={n} checked={count === n} onChange={() => setCount(n)} className="sr-only" />
              {n}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button className={buttonStyles.primary} disabled={busy}>
          {busy ? "Writing your questions…" : "Generate quiz"}
        </button>
        {busy && <span className="text-sm text-muted">This usually takes a few seconds.</span>}
      </div>
    </form>
  );
}
