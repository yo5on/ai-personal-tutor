"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, deleteMaterial, getMaterial, setSetting } from "@/lib/data";
import { resetDemoWorkspace } from "@/lib/demo";
import { getWorkspace, MODE_COOKIE } from "@/lib/workspace";

const COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 180 };

export async function enterDemo() {
  resetDemoWorkspace();
  (await cookies()).set(MODE_COOKIE, "demo", COOKIE_OPTIONS);
  redirect("/dashboard");
}

export async function startLearning() {
  (await cookies()).set(MODE_COOKIE, "user", COOKIE_OPTIONS);
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
