import { isAdmin } from "@/lib/admin-auth";
import { dayKey } from "@/lib/admin-stats";
import { buildResponsesWorkbook } from "@/lib/admin-xlsx";
import { isSupabaseConfigured, listResponses, type StoredResponse } from "@/lib/responses";

const plain = (message: string, status: number) =>
  new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

/** Every response as an Excel workbook (Responses, Summary, Suggestions). Admin only. */
export async function GET() {
  // Route handlers are public endpoints: check the session before touching data.
  if (!(await isAdmin())) return plain("Unauthorized", 401);
  if (!isSupabaseConfigured()) return plain("The response database is not configured.", 503);

  let responses: StoredResponse[];
  try {
    responses = await listResponses();
  } catch (error) {
    console.error("[admin/export/xlsx] could not load responses:", error instanceof Error ? error.message : "unknown error");
    return plain("The responses could not be loaded. Please try again.", 502);
  }

  let workbook: ArrayBuffer;
  try {
    workbook = await buildResponsesWorkbook(responses);
  } catch (error) {
    console.error("[admin/export/xlsx] could not build the workbook:", error instanceof Error ? error.message : "unknown error");
    return plain("The Excel file could not be created. Please try again.", 500);
  }

  const today = dayKey(new Date()) ?? "export";
  return new Response(workbook, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="hudhud-saba-responses-${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
