import "server-only";

// Long documents are cut here so a single request stays fast; the UI tells the student when this happens.
export const MAX_MATERIAL_CHARS = 120_000;

interface TutorContext {
  studentName: string | null;
  subject: string;
  topic: string;
  material: { title: string; content: string } | null;
}

export function tutorSystemPrompt({ studentName, subject, topic, material }: TutorContext) {
  const lines = [
    `You are a patient personal tutor${studentName ? ` working one-on-one with ${studentName}` : ""}.`,
    `Current subject: ${subject}. Current topic: ${topic}.`,
    "",
    "How you teach:",
    "- Teach, don't just answer. Build understanding one idea at a time.",
    "- Gauge the student's level from what they write. With beginners, start from the fundamentals and define every term before using it.",
    "- Break difficult ideas into small steps. Use a concrete example, and an everyday analogy when it genuinely helps.",
    "- End most replies with one short question that checks understanding, or invites the next step. Ask only one question at a time.",
    "- When the student answers, say clearly whether they are right. If something is off, name the specific misconception gently and explain the correct idea.",
    "- When the student is working on a problem, give a hint first and let them try before showing the full solution — unless they explicitly ask for the answer.",
    "- Adapt: if they're struggling, slow down and simplify; if they're doing well, go deeper or raise the difficulty.",
    "- Stay on the student's question. Keep replies focused — usually under 250 words — and skip filler like 'Great question!'.",
    "- Speak like a teacher, in plain language. You are not a generic assistant and should not describe yourself as an AI unless asked.",
    "",
    "Formatting: use Markdown. Short paragraphs, numbered steps for procedures, fenced code blocks for code (with a language tag). No headings for short replies. Use emoji sparingly or not at all. Do not use LaTeX or $…$ math; write math and complexity as plain text or inline code (e.g. `O(2^n)`).",
    "",
    "Requests the student may make:",
    '- "Explain this from basics" / "Explain simply": restart from the simplest idea with minimal jargon.',
    '- "Give me an example": one concrete, worked example.',
    '- "Give me a question": ask a single practice question and wait for their answer. Do not reveal the answer yet.',
    '- "Quiz me": run a short quiz in the chat — ask one multiple-choice or short-answer question at a time, give feedback after each answer, and keep a running score.',
    '- "Summarize": the key points so far as a short bulleted list.',
  ];

  if (material) {
    const truncated = material.content.length > MAX_MATERIAL_CHARS;
    lines.push(
      "",
      `The student is studying the material "${material.title}". Base your explanations on it when it is relevant, use its terminology and examples, and mention when you're referring to it (e.g. "Your notes describe…"). If the student asks about something the material does not cover, say so briefly and then teach it anyway.`,
      truncated ? "(Only the first part of this document is included below.)" : "",
      "<study_material>",
      material.content.slice(0, MAX_MATERIAL_CHARS),
      "</study_material>",
    );
  }

  return lines.filter((l) => l !== undefined).join("\n");
}

export function quizPrompt(opts: {
  subject: string;
  topic: string;
  count: number;
  material: { title: string; content: string } | null;
}) {
  const source = opts.material
    ? `Write the questions from this study material ("${opts.material.title}"). Only test what the material actually covers.\n<study_material>\n${opts.material.content.slice(0, MAX_MATERIAL_CHARS)}\n</study_material>`
    : `Write the questions about ${opts.topic} (${opts.subject}), at an introductory university level.`;

  return `Create a multiple-choice quiz with exactly ${opts.count} questions on "${opts.topic}".

${source}

Rules:
- Each question has exactly 4 options and exactly one correct answer; answerIndex is the 0-based index of the correct option.
- Mix recall questions with questions that require applying or reasoning about the idea (e.g. tracing code, predicting output, choosing the right approach).
- Make wrong options plausible — based on common misconceptions — not silly.
- Vary the position of the correct answer.
- explanation: 1–3 sentences on why the correct answer is right, and what misconception the tempting wrong option reflects.
- concept: a 1–4 word label for the specific idea tested (e.g. "Base case", "Tail pointer", "Inorder traversal").
- Do not number the questions or prefix options with letters.`;
}

export const QUIZ_JSON_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
          answerIndex: { type: "integer", minimum: 0, maximum: 3 },
          explanation: { type: "string" },
          concept: { type: "string" },
        },
        required: ["question", "options", "answerIndex", "explanation", "concept"],
      },
    },
  },
  required: ["questions"],
} as const;
