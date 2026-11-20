import { isAdmin } from "@/lib/admin-auth";
import { buildResponsesCsv } from "@/lib/admin-csv";
import { dayKey } from "@/lib/admin-stats";
import { isSupabaseConfigured, listResponses, type StoredResponse } from "@/lib/responses";

const plain = (message: string, status: number) =>
  new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

/** Every response as a CSV download. Admin only. */
export async function GET() {
  // Route handlers are public endpoints: check the session before touching data.
  if (!(await isAdmin())) return plain("Unauthorized", 401);
  if (!isSupabaseConfigured()) return plain("The response database is not configured.", 503);

  let responses: StoredResponse[];
  try {
    responses = await listResponses();
  } catch (error) {
    console.error("[admin/export] could not load responses:", error instanceof Error ? error.message : "unknown error");
    return plain("The responses could not be loaded. Please try again.", 502);
  }

  const today = dayKey(new Date()) ?? "export";
  return new Response(buildResponsesCsv(responses), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hudhud-saba-responses-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
