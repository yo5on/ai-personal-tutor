import "server-only";
import { getDb, nowIso } from "@/lib/db";
import type {
  ChatMessage,
  ContentSource,
  Material,
  QuizAnswer,
  QuizQuestion,
  QuizSummary,
  StudySession,
  Workspace,
} from "@/types";

type Row = Record<string, unknown>;

// ---------- settings ----------

export function getSetting(ws: Workspace, key: string): string | null {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE workspace = ? AND key = ?")
    .get(ws, key) as Row | undefined;
  return row ? String(row.value) : null;
}

export function setSetting(ws: Workspace, key: string, value: string) {
  getDb()
    .prepare(
      "INSERT INTO settings (workspace, key, value) VALUES (?, ?, ?) ON CONFLICT(workspace, key) DO UPDATE SET value = excluded.value",
    )
    .run(ws, key, value);
}

// ---------- materials ----------

function toMaterial(r: Row): Material {
  return {
    id: Number(r.id),
    title: String(r.title),
    fileName: String(r.file_name),
    fileType: r.file_type === "pdf" ? "pdf" : "txt",
    subject: String(r.subject),
    topic: String(r.topic),
    charCount: Number(r.char_count ?? 0),
    createdAt: String(r.created_at),
  };
}

const MATERIAL_COLUMNS =
  "id, title, file_name, file_type, subject, topic, length(content) AS char_count, created_at";

export function listMaterials(ws: Workspace): Material[] {
  return (
    getDb()
      .prepare(`SELECT ${MATERIAL_COLUMNS} FROM materials WHERE workspace = ? ORDER BY created_at DESC, id DESC`)
      .all(ws) as Row[]
  ).map(toMaterial);
}

export function getMaterial(ws: Workspace, id: number): (Material & { content: string }) | null {
  const r = getDb()
    .prepare(`SELECT ${MATERIAL_COLUMNS}, content FROM materials WHERE workspace = ? AND id = ?`)
    .get(ws, id) as Row | undefined;
  return r ? { ...toMaterial(r), content: String(r.content) } : null;
}

export function createMaterial(
  ws: Workspace,
  m: { title: string; fileName: string; fileType: "pdf" | "txt"; subject: string; topic: string; content: string; createdAt?: string },
): number {
  const res = getDb()
    .prepare(
      "INSERT INTO materials (workspace, title, file_name, file_type, subject, topic, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(ws, m.title, m.fileName, m.fileType, m.subject, m.topic, m.content, m.createdAt ?? nowIso());
  return Number(res.lastInsertRowid);
}

export function deleteMaterial(ws: Workspace, id: number) {
  const db = getDb();
  db.prepare("UPDATE study_sessions SET material_id = NULL WHERE workspace = ? AND material_id = ?").run(ws, id);
  db.prepare("UPDATE quizzes SET material_id = NULL WHERE workspace = ? AND material_id = ?").run(ws, id);
  db.prepare("DELETE FROM materials WHERE workspace = ? AND id = ?").run(ws, id);
}

// ---------- study sessions & messages ----------

function toSession(r: Row): StudySession {
  return {
    id: Number(r.id),
    subject: String(r.subject),
    topic: String(r.topic),
    materialId: r.material_id == null ? null : Number(r.material_id),
    materialTitle: r.material_title == null ? null : String(r.material_title),
    activeSeconds: Number(r.active_seconds),
    createdAt: String(r.created_at),
    lastActiveAt: String(r.last_active_at),
  };
}

const SESSION_SELECT = `SELECT s.*, m.title AS material_title FROM study_sessions s
  LEFT JOIN materials m ON m.id = s.material_id`;

export function listSessions(ws: Workspace, limit = 20): StudySession[] {
  return (
    getDb()
      .prepare(`${SESSION_SELECT} WHERE s.workspace = ? ORDER BY s.last_active_at DESC LIMIT ?`)
      .all(ws, limit) as Row[]
  ).map(toSession);
}

export function getSession(ws: Workspace, id: number): StudySession | null {
  const r = getDb()
    .prepare(`${SESSION_SELECT} WHERE s.workspace = ? AND s.id = ?`)
    .get(ws, id) as Row | undefined;
  return r ? toSession(r) : null;
}

export function createSession(
  ws: Workspace,
  s: { subject: string; topic: string; materialId: number | null },
): number {
  const now = nowIso();
  const res = getDb()
    .prepare(
      "INSERT INTO study_sessions (workspace, subject, topic, material_id, created_at, last_active_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(ws, s.subject, s.topic, s.materialId, now, now);
  return Number(res.lastInsertRowid);
}

/** Count time between messages as study time, ignoring long idle gaps. */
export function touchSession(sessionId: number) {
  const db = getDb();
  const row = db.prepare("SELECT last_active_at FROM study_sessions WHERE id = ?").get(sessionId) as Row | undefined;
  if (!row) return;
  const now = new Date();
  const gap = Math.max(0, (now.getTime() - new Date(String(row.last_active_at)).getTime()) / 1000);
  const credit = gap > 15 * 60 ? 60 : Math.round(gap);
  db.prepare("UPDATE study_sessions SET last_active_at = ?, active_seconds = active_seconds + ? WHERE id = ?").run(
    now.toISOString(),
    credit,
    sessionId,
  );
}

export function listMessages(sessionId: number): ChatMessage[] {
  return (
    getDb().prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY id").all(sessionId) as Row[]
  ).map((r) => ({
    id: Number(r.id),
    role: r.role === "user" ? "user" : "tutor",
    content: String(r.content),
    source: toSource(r.source),
    createdAt: String(r.created_at),
  }));
}

function toSource(v: unknown): ContentSource | null {
  return v === "gemini" || v === "prepared" || v === "seed" ? v : null;
}

export function addMessage(
  sessionId: number,
  role: "user" | "tutor",
  content: string,
  opts: { source?: ContentSource; createdAt?: string } = {},
): number {
  const res = getDb()
    .prepare("INSERT INTO messages (session_id, role, content, source, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(sessionId, role, content, opts.source ?? null, opts.createdAt ?? nowIso());
  return Number(res.lastInsertRowid);
}

export function deleteMessage(id: number) {
  getDb().prepare("DELETE FROM messages WHERE id = ?").run(id);
}

// ---------- quizzes ----------

function toQuizSummary(r: Row): QuizSummary {
  return {
    id: Number(r.id),
    subject: String(r.subject),
    topic: String(r.topic),
    total: Number(r.total),
    score: r.score == null ? null : Number(r.score),
    createdAt: String(r.created_at),
    completedAt: r.completed_at == null ? null : String(r.completed_at),
  };
}

export function createQuiz(
  ws: Workspace,
  q: {
    subject: string;
    topic: string;
    materialId: number | null;
    questions: QuizQuestion[];
    source: ContentSource;
    createdAt?: string;
  },
): number {
  const res = getDb()
    .prepare(
      "INSERT INTO quizzes (workspace, subject, topic, material_id, questions, total, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      ws,
      q.subject,
      q.topic,
      q.materialId,
      JSON.stringify(q.questions),
      q.questions.length,
      q.source,
      q.createdAt ?? nowIso(),
    );
  return Number(res.lastInsertRowid);
}

export function getQuiz(
  ws: Workspace,
  id: number,
): (QuizSummary & { materialId: number | null; source: ContentSource | null; questions: QuizQuestion[] }) | null {
  const r = getDb().prepare("SELECT * FROM quizzes WHERE workspace = ? AND id = ?").get(ws, id) as Row | undefined;
  if (!r) return null;
  return {
    ...toQuizSummary(r),
    materialId: r.material_id == null ? null : Number(r.material_id),
    source: toSource(r.source),
    questions: JSON.parse(String(r.questions)) as QuizQuestion[],
  };
}

export function listQuizzes(ws: Workspace, limit = 20): QuizSummary[] {
  return (
    getDb()
      .prepare("SELECT * FROM quizzes WHERE workspace = ? ORDER BY created_at DESC, id DESC LIMIT ?")
      .all(ws, limit) as Row[]
  ).map(toQuizSummary);
}

export function listAnswers(quizId: number, questions: QuizQuestion[]): QuizAnswer[] {
  return (
    getDb().prepare("SELECT * FROM quiz_answers WHERE quiz_id = ? ORDER BY question_index").all(quizId) as Row[]
  ).map((r) => {
    const q = questions[Number(r.question_index)];
    return {
      questionIndex: Number(r.question_index),
      selected: Number(r.selected),
      isCorrect: Number(r.is_correct) === 1,
      answerIndex: q.answerIndex,
      explanation: q.explanation,
    };
  });
}

export function recordAnswer(
  quizId: number,
  a: { questionIndex: number; concept: string; selected: number; isCorrect: boolean; createdAt?: string },
) {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO quiz_answers (quiz_id, question_index, concept, selected, is_correct, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(quizId, a.questionIndex, a.concept, a.selected, a.isCorrect ? 1 : 0, a.createdAt ?? nowIso());
}

/** Marks the quiz complete once every question has an answer. Returns the final score if completed. */
export function completeQuizIfDone(quizId: number, total: number, completedAt = nowIso()): number | null {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS n, COALESCE(SUM(is_correct), 0) AS correct FROM quiz_answers WHERE quiz_id = ?")
    .get(quizId) as Row;
  if (Number(row.n) < total) return null;
  const score = Number(row.correct);
  db.prepare("UPDATE quizzes SET score = ?, completed_at = COALESCE(completed_at, ?) WHERE id = ?").run(
    score,
    completedAt,
    quizId,
  );
  return score;
}

// ---------- topics ----------

/**
 * Distinct topic names for topic pickers, most recently used first. The same topic can be
 * studied under several subjects or typed with different casing ("Recursion" / "recursion"),
 * so names are grouped case-insensitively and the most recently used spelling is kept
 * (SQLite takes bare columns from the row that holds MAX()).
 */
export function listTopicNames(ws: Workspace): string[] {
  const rows = getDb()
    .prepare(
      `SELECT trim(topic) AS topic, MAX(t) AS latest FROM (
         SELECT topic, created_at AS t FROM materials WHERE workspace = ?
         UNION ALL SELECT topic, last_active_at FROM study_sessions WHERE workspace = ?
         UNION ALL SELECT topic, created_at FROM quizzes WHERE workspace = ?
       ) WHERE trim(topic) <> '' GROUP BY lower(trim(topic)) ORDER BY latest DESC`,
    )
    .all(ws, ws, ws) as Row[];
  return rows.map((r) => String(r.topic));
}

// ---------- workspace reset (demo) ----------

export function clearWorkspace(ws: Workspace) {
  const db = getDb();
  db.prepare(
    "DELETE FROM quiz_answers WHERE quiz_id IN (SELECT id FROM quizzes WHERE workspace = ?)",
  ).run(ws);
  db.prepare("DELETE FROM quizzes WHERE workspace = ?").run(ws);
  db.prepare(
    "DELETE FROM messages WHERE session_id IN (SELECT id FROM study_sessions WHERE workspace = ?)",
  ).run(ws);
  db.prepare("DELETE FROM study_sessions WHERE workspace = ?").run(ws);
  db.prepare("DELETE FROM materials WHERE workspace = ?").run(ws);
  db.prepare("DELETE FROM settings WHERE workspace = ?").run(ws);
}
