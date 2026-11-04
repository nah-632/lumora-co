import { NextResponse } from "next/server";
import { listFeedback } from "@/lib/artefacts/queries";

/**
 * GET /api/feedback?status=staged|approved|published
 *
 * The review queue. `staged` is the default because it is the only state that
 * asks the teacher to do something; a queue that opens on "published" hides the
 * work behind a tab.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const param = url.searchParams.get("status");
  const status =
    param === "approved" || param === "published" || param === "discarded" ? param : "staged";

  const notes = await listFeedback(status);
  return NextResponse.json({ ok: true, notes });
}
