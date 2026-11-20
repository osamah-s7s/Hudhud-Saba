"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteResponse } from "@/lib/responses";

export type DeleteResult = { ok: true } | { ok: false; error: string };

/** Permanently deletes one response, then refreshes the dashboard. */
export async function deleteResponseAction(id: string): Promise<DeleteResult> {
  // Server actions are public endpoints: authorise before anything else.
  // (Outside the try block, so the redirect to the login page is not swallowed.)
  await requireAdmin();

  if (typeof id !== "string" || id.length === 0 || id.length > 100) {
    return { ok: false, error: "That response could not be found." };
  }

  try {
    await deleteResponse(id);
  } catch (error) {
    console.error("[admin] could not delete a response:", error instanceof Error ? error.message : "unknown error");
    return { ok: false, error: "The response could not be deleted. Please try again." };
  }

  refresh();
  return { ok: true };
}
