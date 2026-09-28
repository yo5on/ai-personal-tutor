import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";

// The key is read only on the server. Nothing in this file is imported by client components.
//
// Ordered chain of live models, verified against the project's key (2026-09-28). The app tries
// them in order and moves on quickly when one is busy, over quota or slow:
//   1. gemini-3.8-flash       newest stable Flash (free tier: 20 requests/day)
//   2. gemini-3.7-flash       previous stable Flash
//   3. gemini-3.5-flash-lite  lightweight, usually the least loaded
// Not used: gemini-2.5-flash / gemini-2.5-flash-lite (404 for new keys), -preview and -latest
// models (can change or disappear without notice).
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
const DEFAULT_FALLBACK_MODELS = "gemini-3.7-flash,gemini-3.5-flash-lite";
/** Comma-separated; set GEMINI_FALLBACK_MODELS= (empty) to use only GEMINI_MODEL. */
export const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS ?? DEFAULT_FALLBACK_MODELS)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const MODEL_CHAIN = [...new Set([GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS])];

export class AiNotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set");
  }
}

let client: GoogleGenAI | null = null;

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getGemini(): GoogleGenAI {
  if (!hasGeminiKey()) throw new AiNotConfiguredError();
  client ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!.trim(),
    // No SDK retries: callGemini moves on to the next model instead, which is faster than
    // waiting out a busy one. This timeout is only a safety cap on a whole streamed reply;
    // the limits that matter for waiting are callGemini's time budgets.
    httpOptions: { timeout: 60_000 },
  });
  return client;
}

/** Thrown when Demo Mode skips Gemini because every model failed recently. */
export class GeminiSkippedError extends Error {
  constructor() {
    super("Gemini skipped: all models failed recently");
    this.name = "GeminiSkippedError";
  }
}

/** Thrown when every live model in the chain failed (or the time budget ran out). */
export class GeminiUnavailableError extends Error {
  constructor(readonly failures: { model: string; reason: string }[]) {
    super(`All Gemini models failed: ${failures.map((f) => `${f.model} (${f.reason})`).join(", ")}`);
    this.name = "GeminiUnavailableError";
  }
}

function isKeyProblem(err: unknown) {
  return (
    err instanceof ApiError && (err.status === 401 || err.status === 403 || /api[_ ]?key/i.test(err.message))
  );
}

/** Failures worth moving to the next model for. Anything else (bad key, bad request) is final. */
function canFailOver(err: unknown) {
  if (err instanceof AiNotConfiguredError || isKeyProblem(err)) return false;
  if (err instanceof ApiError) return [404, 429, 500, 502, 503, 504].includes(err.status);
  return true; // timeouts and network errors (e.g. "fetch failed")
}

// A model that just failed is skipped for a while, so later requests don't wait on it again.
const unavailableUntil = new Map<string, number>();

function markUnavailable(model: string, err: unknown) {
  const status = err instanceof ApiError ? err.status : 0;
  const pause =
    status === 404
      ? 60 * 60_000 // model not offered to this key
      : status === 429
        ? 10 * 60_000 // free tier: usually the daily quota
        : 60_000; // busy, 5xx, timeout or network
  unavailableUntil.set(model, Date.now() + pause);
}

function modelsToTry(mode: "demo" | "personal"): string[] {
  const ready = MODEL_CHAIN.filter((m) => (unavailableUntil.get(m) ?? 0) <= Date.now());
  // Demo: only healthy models; if none, prepared content right away.
  if (mode === "demo") return ready;
  // Personal: healthy models first; if all failed recently, try them all anyway rather than refusing.
  return ready.length ? ready : MODEL_CHAIN;
}

function describeFailure(err: unknown) {
  if (err instanceof ApiError) return String(err.status);
  return err instanceof Error ? err.name : "error";
}

export interface TimeBudget {
  /** Longest wait for any one model to produce its first output. */
  perModelMs: number;
  /** Longest total wait across the whole chain before giving up. */
  totalMs: number;
}

/**
 * Calls Gemini through the model chain within a time budget. `call` gets the model and an
 * AbortSignal that fires when that model's share of the budget runs out; it should resolve as
 * soon as it has the first output (for streams, the first chunk), after which no deadline
 * applies. Fast failures (429/503 usually arrive in under a second) move straight on to the
 * next model; there are no retries of the same model.
 */
export async function callGemini<T>(
  mode: "demo" | "personal",
  budget: TimeBudget,
  call: (model: string, signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const models = modelsToTry(mode);
  if (models.length === 0) throw new GeminiSkippedError();

  const deadline = Date.now() + budget.totalMs;
  const failures: { model: string; reason: string }[] = [];

  for (const model of models) {
    const remaining = deadline - Date.now();
    if (remaining < 1_000) break; // not enough time left for a real attempt
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(budget.perModelMs, remaining));
    try {
      const result = await call(model, controller.signal);
      unavailableUntil.delete(model);
      return result;
    } catch (err) {
      if (!canFailOver(err)) throw err;
      markUnavailable(model, err);
      const reason = describeFailure(err);
      console.warn(`[gemini] ${model} failed (${reason}), trying next model`);
      failures.push({ model, reason });
    } finally {
      clearTimeout(timer);
    }
  }
  throw new GeminiUnavailableError(failures);
}

export interface FriendlyError {
  message: string;
  status: number;
}

/** Map any failure from the Gemini call path to a message that is safe to show a student. */
export function toFriendlyError(err: unknown): FriendlyError {
  if (err instanceof AiNotConfiguredError) {
    return {
      status: 503,
      message:
        "The tutor isn't connected yet. Add GEMINI_API_KEY to .env.local and restart the server, or try Demo Mode.",
    };
  }

  if (err instanceof GeminiUnavailableError) {
    console.error(`[gemini] ${err.message}`);
    const allQuota = err.failures.length > 0 && err.failures.every((f) => f.reason === "429");
    return allQuota
      ? {
          status: 429,
          message:
            "The tutor has reached its Gemini usage limit on every available model. Free keys have a daily limit — try again later.",
        }
      : {
          status: 503,
          message:
            "Gemini is unavailable right now — every live model is busy or not responding. Please try again in a minute.",
        };
  }

  if (err instanceof ApiError) {
    console.error(`[gemini] API error ${err.status}: ${err.message.slice(0, 300)}`);
    // Gemini reports an invalid key as 400 INVALID_ARGUMENT, so check the reason text too.
    if (isKeyProblem(err)) {
      return {
        status: 502,
        message: "Gemini rejected the API key. Check GEMINI_API_KEY in .env.local.",
      };
    }
    if (err.status === 429) {
      return {
        status: 429,
        message:
          "The tutor has reached its Gemini usage limit for now. Try again in a little while — free keys have a daily limit.",
      };
    }
    if (err.status === 404) {
      return {
        status: 502,
        message: `The Gemini model "${GEMINI_MODEL}" isn't available for this key. Set GEMINI_MODEL to a model you can use.`,
      };
    }
    if (err.status >= 500) {
      return {
        status: 502,
        message: "Gemini is temporarily unavailable. Please try again in a moment.",
      };
    }
    return { status: 502, message: "The tutor couldn't process that request. Try rephrasing it." };
  }

  console.error("[gemini] request failed:", err instanceof Error ? err.message : err);
  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
    return { status: 504, message: "The tutor took too long to respond. Please try again." };
  }
  return {
    status: 502,
    message: "Couldn't reach the tutor service. Check your internet connection and try again.",
  };
}
