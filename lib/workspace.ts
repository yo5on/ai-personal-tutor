import "server-only";
import { cookies } from "next/headers";
import type { Workspace } from "@/types";

export const MODE_COOKIE = "tutor_mode";

/** Demo data and personal data live side by side in the database, split by workspace. */
export async function getWorkspace(): Promise<Workspace> {
  const store = await cookies();
  return store.get(MODE_COOKIE)?.value === "demo" ? "demo" : "user";
}
