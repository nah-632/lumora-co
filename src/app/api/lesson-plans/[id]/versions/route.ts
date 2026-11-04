import { createSessionClient } from "@/lib/auth/server";
import { appendVersionSchema } from "@/features/artefacts/schemas";
import { fail, ok } from "@/lib/api/respond";

/**
 * POST /api/lesson-plans/[id]/versions
 *
 * Appends an immutable version. This is the ONLY way the text of a plan changes:
 * there is no PUT on the plan, and `lesson_plan_versions` has no UPDATE policy at
 * all, so a stored version cannot be rewritten even by a direct API call. The
 * history is the feature — it is what makes "adjust the output" safe.
 *
 * TWO GUARDS, AND WHY BOTH:
 *
 * 1. `baseVersionNo` is compared to the plan's current version before the write.
 *    If they differ, another device refined the plan while this one was open, and
 *    the caller gets `conflict` with the current number so the UI can offer a
 *    reload instead of silently discarding someone's edit.
 *
 * 2. The append itself goes through `append_lesson_plan_version`, which takes
 *    `FOR UPDATE` on the plan row and computes the next number inside the same
 *    transaction. That is what stops two concurrent refinements writing the same
 *    `version_no`; the base check above does not, and is a courtesy to the user,
 *    not a concurrency control.
 *
 * The function is SECURITY INVOKER, so RLS still applies and a teacher cannot
 * append to a plan they do not own even by calling it with someone else's id.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const parsed = appendVersionSchema.safeParse(payload);
  if (!parsed.success) return fail("invalid_input");
  const { content, baseVersionNo } = parsed.data;

  // The read is RLS-scoped, so another teacher's plan is indistinguishable from
  // a plan that does not exist — which is the answer we want to give.
  const { data: plan, error: readError } = await supabase
    .from("lesson_plans")
    .select("id, current_version_no, status")
    .eq("id", id)
    .maybeSingle();

  if (readError || !plan) return fail("not_found");
  if (plan.status === "archived") return fail("invalid_input");
  if (plan.current_version_no !== baseVersionNo) {
    return fail("conflict", { currentVersionNo: plan.current_version_no });
  }

  const { data: versionNo, error: rpcError } = await supabase.rpc("append_lesson_plan_version", {
    p_lesson_plan_id: id,
    p_content: content,
    // A manual edit is the teacher typing. It carries no refinement kind, which
    // `lesson_plan_versions_manual_has_no_kind` enforces.
    p_source: "edited",
    p_refinement_kind: null,
    p_generation_run_id: null,
  });

  if (rpcError) return fail("failed");

  return ok({ lessonPlan: { id, versionNo } });
}
