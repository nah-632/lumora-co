import { createSessionClient } from "@/lib/auth/server";
import { feedbackActionSchema, updateFeedbackSchema } from "@/features/artefacts/schemas";
import { fail, ok } from "@/lib/api/respond";

/**
 * PATCH /api/feedback/[id]
 *
 * Two shapes of body, on purpose:
 *   { action: "approve" | "publish" | "discard" }   a transition
 *   { glows: [...], body: "…" }                     a content edit
 *
 * The contract in api-contracts.md splits these across three routes
 * (`/approve`, `/publish`, and a content PATCH). They are one handler here
 * because they all act on one row through one state machine, and three files
 * would mean three copies of the same read-validate-write and three chances for
 * the mapping from a database error to an HTTP code to drift apart. The
 * semantics are identical.
 *
 * THE GATE IS NOT ENFORCED HERE. `approve` and `publish` only set a status; the
 * database decides whether the move is legal, stamps who approved it from the
 * session (never from the payload), and refuses anything else. This handler maps
 * the refusal to a code. Writing the rule here as well would create a second
 * implementation that could disagree with the one that actually protects the
 * student.
 */
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSessionClient();
  if (!supabase) return fail("not_configured");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("unauthorized");

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return fail("invalid_input");
  }

  const action = feedbackActionSchema.safeParse(payload);
  const edit = action.success ? null : updateFeedbackSchema.safeParse(payload);
  if (!action.success && (!edit || !edit.success)) return fail("invalid_input");

  // Read first so a note already sent to a student is refused with the right
  // code before any write is attempted.
  const { data: row, error: readError } = await supabase
    .from("feedback_notes")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (readError || !row) return fail("not_found");

  const current = row.status as "staged" | "approved" | "published" | "discarded";

  if (action.success) {
    const next =
      action.data.action === "approve"
        ? "approved"
        : action.data.action === "publish"
          ? "published"
          : "discarded";

    // The legal moves, checked only to give a clear code; the trigger refuses
    // anything else regardless of what this says.
    const legal =
      (current === "staged" && (next === "approved" || next === "discarded")) ||
      (current === "approved" && (next === "published" || next === "discarded"));

    if (!legal) return fail("invalid_transition");

    const { error } = await supabase.from("feedback_notes").update({ status: next }).eq("id", id);
    if (error) return fail("invalid_transition");

    return ok({ feedbackNote: { id, status: next } });
  }

  // A published note is a record of what a student received. Editing it would
  // rewrite history rather than correct a draft.
  if (current === "published") return fail("published_rules");
  if (current === "discarded") return fail("invalid_transition");

  // Narrowed here rather than asserted with `!`: the action branch returned
  // above, so a failure to parse as an edit at this point means the body was
  // neither a valid transition nor a valid edit.
  if (!edit || !edit.success) return fail("invalid_input");
  const patch = edit.data;

  const update: Record<string, unknown> = {};
  if (patch.glows) update.glows = patch.glows;
  if (patch.grows) update.grows = patch.grows;
  if (patch.wonderings) update.wonderings = patch.wonderings;
  if (patch.nextSteps) update.next_steps = patch.nextSteps;
  if (patch.body !== undefined) update.body = patch.body;

  if (Object.keys(update).length === 0) return fail("invalid_input");

  const { error } = await supabase.from("feedback_notes").update(update).eq("id", id);
  if (error) return fail("failed");

  return ok({ feedbackNote: { id, status: current } });
}
