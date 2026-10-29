"use server";

import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, deleteMaterial, getMaterial, setSetting } from "@/lib/data";
import { ensureDemoWorkspace, resetDemoWorkspace } from "@/lib/demo";
import { getWorkspace, isValidWorkspaceId, MODE_COOKIE, USER_WORKSPACE_COOKIE } from "@/lib/workspace";

const COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 180 };

export async function enterDemo() {
  ensureDemoWorkspace();
  (await cookies()).set(MODE_COOKIE, "demo", COOKIE_OPTIONS);
  redirect("/dashboard");
}

export async function startLearning() {
  const store = await cookies();
  const existingId = store.get(USER_WORKSPACE_COOKIE)?.value;
  const workspaceId = isValidWorkspaceId(existingId) ? existingId : randomUUID();

  // The mode cookie only selects demo/personal mode. The separate random workspace cookie
  // isolates this browser's study records from every other visitor on the public deployment.
  store.set(USER_WORKSPACE_COOKIE, workspaceId, COOKIE_OPTIONS);
  store.set(MODE_COOKIE, "user", COOKIE_OPTIONS);
  redirect("/dashboard");
}

export async function resetDemo() {
  if ((await getWorkspace()) !== "demo") return;
  resetDemoWorkspace();
  redirect("/dashboard");
}

export async function startStudySession(formData: FormData) {
  const ws = await getWorkspace();
  const materialId = Number(formData.get("materialId")) || null;
  const material = materialId ? getMaterial(ws, materialId) : null;

  const topic = (material?.topic ?? String(formData.get("topic") ?? "")).trim().slice(0, 80);
  const subject = (material?.subject ?? String(formData.get("subject") ?? "")).trim().slice(0, 80) || "General";
  if (!topic) redirect("/tutor?error=topic");

  const id = createSession(ws, { subject, topic, materialId: material?.id ?? null });
  redirect(`/tutor?session=${id}`);
}

export async function saveName(formData: FormData) {
  const ws = await getWorkspace();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  setSetting(ws, "name", name);
  revalidatePath("/dashboard");
}

export async function removeMaterial(formData: FormData) {
  const ws = await getWorkspace();
  const id = Number(formData.get("materialId"));
  if (id) deleteMaterial(ws, id);
  revalidatePath("/materials");
}
