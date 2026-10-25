import "server-only";
import { cookies } from "next/headers";
import type { Workspace } from "@/types";

export const MODE_COOKIE = "tutor_mode";
export const USER_WORKSPACE_COOKIE = "tutor_workspace";

const WORKSPACE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Demo data is deliberately shared sample content. Personal workspaces are separated by a
 * random, HttpOnly browser cookie; never fall back to the old shared "user" workspace.
 *
 * A visitor without an initialized personal cookie sees the demo until they choose Start Learning.
 * This fails closed instead of exposing records that older deployments stored in one shared bucket.
 */
export async function getWorkspace(): Promise<Workspace> {
  const store = await cookies();
  if (store.get(MODE_COOKIE)?.value === "demo") return "demo";

  const id = store.get(USER_WORKSPACE_COOKIE)?.value;
  if (!id || !WORKSPACE_ID_PATTERN.test(id)) return "demo";

  return `user:${id}`;
}

export function isPersonalWorkspace(ws: Workspace): ws is `user:${string}` {
  return ws.startsWith("user:");
}
