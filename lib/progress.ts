import "server-only";
import { getDb } from "@/lib/db";
import type { QuizQuestion, Workspace } from "@/types";

type Row = Record<string, unknown>;

export interface TopicStat {
  subject: string;
  topic: string;
  attempted: number;
  correct: number;
  accuracy: number; // 0–100
}

export interface ActivityItem {
  kind: "quiz" | "study" | "material";
  label: string;
  detail: string;
  at: string;
  href: string;
}

export interface MissedQuestion {
  quizId: number;
  topic: string;
  concept: string;
  question: string;
  yourAnswer: string;
  correctAnswer: string;
  explanation: string;
  at: string;
}

export interface ProgressSummary {
  topicsStudied: number;
  questionsAttempted: number;
  correctAnswers: number;
  accuracy: number | null;
  studyMinutes: number;
  quizzesCompleted: number;
  topicStats: TopicStat[];
  weakTopics: TopicStat[];
  recentScores: { id: number; topic: string; score: number; total: number; percent: number; at: string }[];
  recentActivity: ActivityItem[];
}

export const WEAK_THRESHOLD = 70;

export function getProgress(ws: Workspace): ProgressSummary {
  const db = getDb();

  const topicsStudied = Number(
    (
      db
        .prepare(
          `SELECT COUNT(*) AS n FROM (
             SELECT lower(topic) AS t FROM study_sessions WHERE workspace = ?
             UNION SELECT lower(topic) FROM quizzes WHERE workspace = ?)`,
        )
        .get(ws, ws) as Row
    ).n,
  );

  const totals = db
    .prepare(
      `SELECT COUNT(a.id) AS attempted, COALESCE(SUM(a.is_correct), 0) AS correct
       FROM quiz_answers a JOIN quizzes q ON q.id = a.quiz_id WHERE q.workspace = ?`,
    )
    .get(ws) as Row;
  const questionsAttempted = Number(totals.attempted);
  const correctAnswers = Number(totals.correct);

  const studySeconds = Number(
    (db.prepare("SELECT COALESCE(SUM(active_seconds), 0) AS s FROM study_sessions WHERE workspace = ?").get(ws) as Row).s,
  );

  const topicStats: TopicStat[] = (
    db
      .prepare(
        `SELECT q.subject, q.topic, COUNT(a.id) AS attempted, COALESCE(SUM(a.is_correct), 0) AS correct
         FROM quiz_answers a JOIN quizzes q ON q.id = a.quiz_id
         WHERE q.workspace = ? GROUP BY lower(q.topic) ORDER BY q.topic`,
      )
      .all(ws) as Row[]
  ).map((r) => {
    const attempted = Number(r.attempted);
    const correct = Number(r.correct);
    return {
      subject: String(r.subject),
      topic: String(r.topic),
      attempted,
      correct,
      accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
    };
  });

  const weakTopics = topicStats
    .filter((t) => t.attempted >= 3 && t.accuracy < WEAK_THRESHOLD)
    .sort((a, b) => a.accuracy - b.accuracy);

  const completed = db
    .prepare(
      `SELECT id, topic, score, total, completed_at FROM quizzes
       WHERE workspace = ? AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 10`,
    )
    .all(ws) as Row[];
  const recentScores = completed.map((r) => ({
    id: Number(r.id),
    topic: String(r.topic),
    score: Number(r.score),
    total: Number(r.total),
    percent: Math.round((Number(r.score) / Math.max(1, Number(r.total))) * 100),
    at: String(r.completed_at),
  }));
  const quizzesCompleted = Number(
    (db.prepare("SELECT COUNT(*) AS n FROM quizzes WHERE workspace = ? AND completed_at IS NOT NULL").get(ws) as Row).n,
  );

  const activity: ActivityItem[] = [
    ...recentScores.map((q) => ({
      kind: "quiz" as const,
      label: `${q.topic} quiz`,
      detail: `${q.percent}%`,
      at: q.at,
      href: `/quiz/${q.id}`,
    })),
    ...(
      db
        .prepare(
          `SELECT id, topic, active_seconds, last_active_at FROM study_sessions
           WHERE workspace = ? AND active_seconds > 0 ORDER BY last_active_at DESC LIMIT 10`,
        )
        .all(ws) as Row[]
    ).map((r) => ({
      kind: "study" as const,
      label: String(r.topic),
      detail: formatMinutes(Number(r.active_seconds)),
      at: String(r.last_active_at),
      href: `/tutor?session=${r.id}`,
    })),
    ...(
      db
        .prepare("SELECT id, title, created_at FROM materials WHERE workspace = ? ORDER BY created_at DESC LIMIT 5")
        .all(ws) as Row[]
    ).map((r) => ({
      kind: "material" as const,
      label: String(r.title),
      detail: "Uploaded",
      at: String(r.created_at),
      href: "/materials",
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return {
    topicsStudied,
    questionsAttempted,
    correctAnswers,
    accuracy: questionsAttempted ? Math.round((correctAnswers / questionsAttempted) * 100) : null,
    studyMinutes: Math.round(studySeconds / 60),
    quizzesCompleted,
    topicStats,
    weakTopics,
    recentScores,
    recentActivity: activity,
  };
}

export function getMissedQuestions(ws: Workspace, limit = 12): MissedQuestion[] {
  const rows = getDb()
    .prepare(
      `SELECT a.quiz_id, a.question_index, a.selected, a.concept, a.created_at, q.topic, q.questions
       FROM quiz_answers a JOIN quizzes q ON q.id = a.quiz_id
       WHERE q.workspace = ? AND a.is_correct = 0 ORDER BY a.created_at DESC LIMIT ?`,
    )
    .all(ws, limit) as Row[];
  return rows.map((r) => {
    const q = (JSON.parse(String(r.questions)) as QuizQuestion[])[Number(r.question_index)];
    return {
      quizId: Number(r.quiz_id),
      topic: String(r.topic),
      concept: String(r.concept),
      question: q.question,
      yourAnswer: q.options[Number(r.selected)] ?? "—",
      correctAnswer: q.options[q.answerIndex],
      explanation: q.explanation,
      at: String(r.created_at),
    };
  });
}

export function formatMinutes(seconds: number) {
  const m = Math.max(1, Math.round(seconds / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}
