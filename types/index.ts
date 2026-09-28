export type Workspace = "demo" | "user";

/** Where tutor content came from: live Gemini, the demo's prepared fallback, or seeded demo history. */
export type ContentSource = "gemini" | "prepared" | "seed";

export interface Material {
  id: number;
  title: string;
  fileName: string;
  fileType: "pdf" | "txt";
  subject: string;
  topic: string;
  charCount: number;
  createdAt: string;
}

export interface StudySession {
  id: number;
  subject: string;
  topic: string;
  materialId: number | null;
  materialTitle: string | null;
  activeSeconds: number;
  createdAt: string;
  lastActiveAt: string;
}

export interface ChatMessage {
  id: number;
  role: "user" | "tutor";
  content: string;
  source: ContentSource | null;
  createdAt: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  concept: string;
}

/** What the browser sees before answering: no answer key. */
export type PublicQuizQuestion = Pick<QuizQuestion, "question" | "options" | "concept">;

export interface QuizAnswer {
  questionIndex: number;
  selected: number;
  isCorrect: boolean;
  answerIndex: number;
  explanation: string;
}

export interface QuizSummary {
  id: number;
  subject: string;
  topic: string;
  total: number;
  score: number | null;
  createdAt: string;
  completedAt: string | null;
}
