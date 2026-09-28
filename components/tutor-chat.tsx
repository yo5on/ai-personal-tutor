"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { STREAM_ERROR_MARKER } from "@/lib/stream";
import type { ChatMessage, ContentSource } from "@/types";

const ACTIONS = [
  { label: "Explain simply", prompt: "Explain this more simply." },
  { label: "Give an example", prompt: "Give me an example." },
  { label: "Give me a question", prompt: "Give me a practice question." },
  { label: "Quiz me", prompt: "Quiz me on this topic." },
  { label: "Summarize", prompt: "Summarize what we've covered so far." },
];

interface UiMessage {
  key: string;
  role: "user" | "tutor";
  content: string;
  source?: ContentSource | null;
  pending?: boolean;
}

export function TutorChat({
  sessionId,
  topic,
  studentName,
  initialMessages,
}: {
  sessionId: number;
  topic: string;
  studentName: string | null;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<UiMessage[]>(
    initialMessages.map((m) => ({ key: String(m.id), role: m.role, content: m.content, source: m.source })),
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const keyCounter = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send(text: string) {
    const message = text.trim();
    if (!message) {
      setError("Type a question or pick one of the suggestions first.");
      return;
    }
    if (sending) return;

    setError(null);
    setSending(true);
    setInput("");
    const n = ++keyCounter.current;
    const userKey = `u-${n}`;
    const tutorKey = `t-${n}`;
    setMessages((prev) => [
      ...prev,
      { key: userKey, role: "user", content: message },
      { key: tutorKey, role: "tutor", content: "", pending: true },
    ]);

    let source: ContentSource | null = null;
    const updateTutor = (content: string, pending: boolean) =>
      setMessages((prev) => prev.map((m) => (m.key === tutorKey ? { ...m, content, pending, source } : m)));
    const rollback = (msg: string) => {
      setMessages((prev) => prev.filter((m) => m.key !== userKey && m.key !== tutorKey));
      setInput(message);
      setError(msg);
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        rollback(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      // The server says whether this reply is live Gemini or a prepared demo fallback.
      source = res.headers.get("X-Tutor-Source") === "prepared" ? "prepared" : "gemini";
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const markerAt = text.indexOf(STREAM_ERROR_MARKER);
        updateTutor(markerAt === -1 ? text : text.slice(0, markerAt), true);
      }

      const markerAt = text.indexOf(STREAM_ERROR_MARKER);
      if (markerAt !== -1) {
        const reply = text.slice(0, markerAt).trim();
        const msg = text.slice(markerAt + STREAM_ERROR_MARKER.length);
        if (reply) {
          updateTutor(reply, false);
          setError(`The reply was cut short. ${msg}`);
        } else {
          rollback(msg);
        }
      } else {
        updateTutor(text, false);
      }
    } catch {
      rollback("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  const starters = [
    `Explain ${topic} from the basics`,
    `What are the most important ideas in ${topic}?`,
    `What mistakes do students usually make with ${topic}?`,
  ];

  return (
    <div className="flex h-[calc(100dvh-22rem)] min-h-[360px] min-w-0 flex-col sm:h-[calc(100dvh-20rem)] rounded-lg border border-line bg-surface lg:h-[calc(100vh-11rem)]">
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-md py-8 text-center">
            <p className="font-serif text-lg font-semibold text-ink">
              {studentName ? `Ready when you are, ${studentName}.` : "Ready when you are."}
            </p>
            <p className="mt-1 text-sm text-muted">Ask anything about {topic}, or start with one of these:</p>
            <div className="mt-5 flex flex-col gap-2">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border border-line px-4 py-2.5 text-left text-sm text-ink-soft transition-colors hover:border-line-strong hover:bg-subtle hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.key} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-navy-soft px-4 py-2.5 text-ink">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.key} className="flex gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-navy font-serif text-xs font-semibold text-white">
                    T
                  </span>
                  <div className="min-w-0 flex-1">
                    {m.content ? (
                      <>
                        <Markdown>{m.content}</Markdown>
                        {m.source === "prepared" && !m.pending && (
                          <p className="mt-2 inline-block rounded border border-accent/30 bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                            Demo fallback — prepared response
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex gap-1 py-2" aria-label="Tutor is writing">
                        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
                        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
                        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
                      </span>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-line px-3 pb-3 pt-2.5 sm:px-4">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => send(a.prompt)}
              disabled={sending}
              className="shrink-0 rounded-md border border-line bg-surface px-2.5 py-1 text-[13px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:bg-subtle hover:text-ink disabled:opacity-50"
            >
              {a.label}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mb-2 rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
            {error}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 rounded-md border border-line-strong bg-surface px-3 py-2 focus-within:border-navy"
        >
          <label htmlFor="tutor-input" className="sr-only">
            Message the tutor
          </label>
          <textarea
            id="tutor-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder={`Ask about ${topic}…`}
            className="max-h-40 min-h-[1.75rem] flex-1 resize-none bg-transparent py-0.5 text-[15px] outline-none placeholder:text-muted"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-navy text-white transition-colors hover:bg-navy-hover disabled:opacity-40"
          >
            <ArrowUp size={17} />
          </button>
        </form>
        <p className="mt-1.5 hidden text-xs text-muted sm:block">Enter to send · Shift + Enter for a new line</p>
      </div>
    </div>
  );
}
