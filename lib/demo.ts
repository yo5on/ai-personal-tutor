import "server-only";
import { DEMO_MATERIALS, DEMO_SUBJECT } from "@/data/demo-materials";
import { DEMO_QUESTION_BANK } from "@/data/demo-questions";
import { DEMO_REPLIES, GENERIC_REPLY } from "@/data/demo-replies";
import {
  addMessage,
  clearWorkspace,
  completeQuizIfDone,
  createMaterial,
  createQuiz,
  createSession,
  recordAnswer,
  setSetting,
} from "@/lib/data";
import { getDb, transaction } from "@/lib/db";
import type { ChatMessage } from "@/types";

export const DEMO_STUDENT_NAME = "Yoson";

function ago(days: number, hours = 0, minutes = 0) {
  return new Date(Date.now() - ((days * 24 + hours) * 60 + minutes) * 60_000).toISOString();
}

interface SeedSession {
  topic: string;
  daysAgo: number;
  minutes: number;
  messages: [role: "user" | "tutor", text: string][];
}

const SEED_SESSIONS: SeedSession[] = [
  {
    topic: "Arrays",
    daysAgo: 11,
    minutes: 18,
    messages: [
      ["user", "Why is inserting at the start of an array slow?"],
      [
        "tutor",
        "Because an array keeps its elements side by side. To make room at index 0, every existing element has to shift one position to the right — for *n* elements that's *n* moves, so it's **O(n)**.\n\nQuick check: what about inserting at the *end* of a dynamic array?",
      ],
      ["user", "That's O(1) most of the time?"],
      [
        "tutor",
        "Exactly — **O(1) amortized**. Occasionally the array is full and has to be copied to a bigger block, but because the capacity doubles, that happens rarely enough to average out.",
      ],
    ],
  },
  {
    topic: "Linked Lists",
    daysAgo: 8,
    minutes: 32,
    messages: [
      ["user", "How do I delete a node from a linked list?"],
      [
        "tutor",
        "You don't remove it directly — you make the previous node *skip over* it:\n\n```python\nprev.next = prev.next.next\n```\n\nOnce nothing points to the node, it's gone. Which node do you need a reference to before you can do this?",
      ],
      ["user", "The one before it"],
      ["tutor", "Right — that's why deleting in a singly linked list usually means walking from the head to find `prev` first."],
    ],
  },
  {
    topic: "Binary Trees",
    daysAgo: 2,
    minutes: 15,
    messages: [
      ["user", "What's the difference between height and depth?"],
      [
        "tutor",
        "They measure in opposite directions:\n\n- **Depth** of a node: edges from the *root down to that node*.\n- **Height** of a node: edges from that node *down to its deepest leaf*.\n\nThe root has depth 0; a leaf has height 0. What is the depth of the root's left child?",
      ],
    ],
  },
  {
    topic: "Recursion",
    daysAgo: 0,
    minutes: 24,
    messages: [
      ["user", "I get confused tracing recursive functions"],
      [
        "tutor",
        "That's very common. Let's use one reliable technique: write each call on its own line, indenting as you go deeper, then fill in return values **from the bottom up**.\n\n```\nfactorial(3)\n  factorial(2)\n    factorial(1)\n      factorial(0) → 1\n    → 1 × 1 = 1\n  → 2 × 1 = 2\n→ 3 × 2 = 6\n```\n\nWant to try one yourself? What does `factorial(4)` return?",
      ],
      ["user", "24"],
      ["tutor", "Correct — 4 × 6 = 24. Notice you reused the answer for `factorial(3)`. That's the \"leap of faith\": trust the smaller call and build on it."],
    ],
  },
];

// Which questions (by index in the bank) the demo student got wrong.
const SEED_QUIZZES: { topic: string; daysAgo: number; wrong: number[] }[] = [
  { topic: "Arrays", daysAgo: 10, wrong: [3] },
  { topic: "Linked Lists", daysAgo: 7, wrong: [2, 4] },
  { topic: "Binary Trees", daysAgo: 2, wrong: [1, 2] },
  { topic: "Recursion", daysAgo: 1, wrong: [2, 3, 4] },
];

/** Rebuilds the demo workspace from scratch. Never touches the "user" workspace. */
export function resetDemoWorkspace() {
  transaction(() => {
    clearWorkspace("demo");
    setSetting("demo", "name", DEMO_STUDENT_NAME);

    const materialIds = new Map<string, number>();
    for (const m of DEMO_MATERIALS) {
      materialIds.set(
        m.topic,
        createMaterial("demo", {
          title: m.title,
          fileName: m.fileName,
          fileType: "txt",
          subject: DEMO_SUBJECT,
          topic: m.topic,
          content: m.content,
          createdAt: ago(m.daysAgo, 2),
        }),
      );
    }

    const db = getDb();
    for (const s of SEED_SESSIONS) {
      const id = createSession("demo", { subject: DEMO_SUBJECT, topic: s.topic, materialId: materialIds.get(s.topic) ?? null });
      const start = ago(s.daysAgo, 1, s.minutes);
      const end = ago(s.daysAgo, 1);
      db.prepare("UPDATE study_sessions SET created_at = ?, last_active_at = ?, active_seconds = ? WHERE id = ?").run(
        start,
        end,
        s.minutes * 60,
        id,
      );
      s.messages.forEach(([role, text], i) => {
        const t = new Date(new Date(start).getTime() + ((s.minutes * 60_000) / s.messages.length) * i).toISOString();
        addMessage(id, role, text, { source: role === "tutor" ? "seed" : undefined, createdAt: t });
      });
    }

    for (const q of SEED_QUIZZES) {
      const questions = DEMO_QUESTION_BANK[q.topic];
      const createdAt = ago(q.daysAgo, 3);
      const quizId = createQuiz("demo", {
        subject: DEMO_SUBJECT,
        topic: q.topic,
        materialId: materialIds.get(q.topic) ?? null,
        questions,
        source: "seed",
        createdAt,
      });
      questions.forEach((question, i) => {
        const wrong = q.wrong.includes(i);
        recordAnswer(quizId, {
          questionIndex: i,
          concept: question.concept,
          selected: wrong ? (question.answerIndex + 1) % question.options.length : question.answerIndex,
          isCorrect: !wrong,
          createdAt,
        });
      });
      completeQuizIfDone(quizId, questions.length, ago(q.daysAgo, 2, 50));
    }
  });
}

/**
 * Prepared reply for Demo Mode when Gemini isn't available. Picks an explanation style
 * from the student's wording, or gives feedback on a practice question it asked earlier.
 */
export function offlineDemoReply(topic: string, message: string, history: ChatMessage[]): string {
  const text = message.toLowerCase();
  const replies = DEMO_REPLIES[Object.keys(DEMO_REPLIES).find((k) => k.toLowerCase() === topic.toLowerCase()) ?? ""];
  const bank = DEMO_QUESTION_BANK[Object.keys(DEMO_QUESTION_BANK).find((k) => k.toLowerCase() === topic.toLowerCase()) ?? ""];

  // Did the tutor just ask a bank question? Then treat this message as the answer.
  const lastTutor = [...history].reverse().find((m) => m.role === "tutor");
  const asked = bank?.find((q) => lastTutor?.content.includes(q.question));
  if (asked && !/explain|example|summar|quiz|question/.test(text)) {
    const correct = asked.options[asked.answerIndex];
    const letter = String.fromCharCode(65 + asked.answerIndex);
    const gotIt =
      text.trim().toLowerCase() === letter.toLowerCase() || text.includes(correct.toLowerCase().slice(0, 12));
    return `${gotIt ? "**Correct.**" : `**Not quite.** The answer is **${letter}) ${correct}**.`}\n\n${asked.explanation}\n\nWant another question, or should we go over this idea again?`;
  }

  if (/quiz|question|test me/.test(text) && bank) {
    const asked = new Set(history.filter((m) => m.role === "tutor").map((m) => m.content));
    const q = bank.find((b) => ![...asked].some((c) => c.includes(b.question))) ?? bank[0];
    const options = q.options.map((o, i) => `- **${String.fromCharCode(65 + i)})** ${o}`).join("\n");
    return `Here's a question to check your understanding:\n\n**${q.question}**\n\n${options}\n\nReply with the letter you think is right.`;
  }

  if (/summar|recap|key points/.test(text) && bank) {
    const concepts = [...new Set(bank.map((b) => b.concept))];
    return `Here are the key ideas for **${topic}**:\n\n${bank
      .slice(0, 5)
      .map((b) => `- **${b.concept}:** ${b.explanation.split(". ")[0].replace(/\.$/, "")}.`)
      .join("\n")}\n\nThe ones students most often mix up: ${concepts.slice(1, 3).join(" and ")}. Want a question on one of them?`;
  }

  if (!replies) return GENERIC_REPLY(topic);
  if (/simpl|easier|eli5|confus|don.t get|lost/.test(text)) return replies.simple;
  if (/example|show me|code|demonstrat/.test(text)) return replies.example;
  if (/explain|what is|what are|basics|how does|how do|why|teach|start/.test(text)) return replies.explain;
  return GENERIC_REPLY(topic);
}
