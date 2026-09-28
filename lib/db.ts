import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// SQLite via Node's built-in driver: one file, no native dependencies.
// Serverless hosts (e.g. Vercel) only allow writes to /tmp, which is not persistent.
function resolveDbPath() {
  const dir =
    process.env.DATABASE_DIR ||
    (process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "data", "db"));
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "tutor.db");
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  workspace TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (workspace, key)
);
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace TEXT NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  material_id INTEGER,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  material_id INTEGER,
  questions TEXT NOT NULL,
  total INTEGER NOT NULL,
  score INTEGER,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS quiz_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  question_index INTEGER NOT NULL,
  concept TEXT NOT NULL,
  selected INTEGER NOT NULL,
  is_correct INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (quiz_id, question_index)
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages (session_id);
CREATE INDEX IF NOT EXISTS idx_answers_quiz ON quiz_answers (quiz_id);
`;

const globalForDb = globalThis as unknown as { tutorDb?: DatabaseSync };

// Module-level (not global) so it re-runs when this file is reloaded in development, even
// though the connection itself is reused across reloads.
let migrated = false;

export function getDb(): DatabaseSync {
  if (!globalForDb.tutorDb) {
    const db = new DatabaseSync(resolveDbPath());
    db.exec("PRAGMA journal_mode = WAL;");
    globalForDb.tutorDb = db;
  }
  const db = globalForDb.tutorDb;
  if (!migrated) {
    db.exec(SCHEMA);
    // Where a tutor reply or quiz came from: 'gemini', 'prepared' (demo fallback) or 'seed' (demo history).
    addColumnIfMissing(db, "messages", "source", "TEXT");
    addColumnIfMissing(db, "quizzes", "source", "TEXT");
    migrated = true;
  }
  return db;
}

/** Small migration helper so databases created before a column existed keep working. */
function addColumnIfMissing(db: DatabaseSync, table: string, column: string, type: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function nowIso() {
  return new Date().toISOString();
}
