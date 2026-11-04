import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/auth/server";
import { listLessonPlans } from "@/lib/artefacts/queries";
import { createLessonPlanSchema } from "@/features/artefacts/schemas";
import { fail, ok } from "@/lib/api/respond";

/**
 * GET  /api/lesson-plans   list, filtered
 * POST /api/lesson-plans   create
 *
 * The create path writes a plan and its first version. The plan row holds
 * identity and metadata; the text lives in `lesson_plan_versions`, because that
 * is what makes the history answerable and a refinement reversible.
 *
 * A NOTE ON ATOMICITY, because it is a real limitation rather than an oversight:
 * the two inserts are not in one transaction, and PostgREST cannot express one.
 * If the version insert fails, the plan row is removed as a compensating action.
 * That is correct in the ordinary case and can leave an empty plan under a
 * connection failure between the two calls. The fix is a `create_lesson_plan`
 * RPC that does both — not done here because it is a schema change and this task
 * is the UI layer.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam === "draft" || statusParam === "ready" || statusParam === "archived" || statusParam === "all"
      ? statusParam
      : "all";

  const plans = await listLessonPlans({
    status,
    search: url.searchParams.get("q") ?? undefined,
  });

  return NextResponse.json({ ok: true, plans });
}

export async function POST(req: Request) {
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

  const parsed = createLessonPlanSchema.safeParse(payload);
  if (!parsed.success) return fail("invalid_input");
  const input = parsed.data;

  const { data: created, error: planError } = await supabase
    .from("lesson_plans")
    .insert({
      // teacher_id is deliberately NOT sent: the database defaults it to
      // auth.uid(), and the trigger refuses a client that names someone else.
      title: input.title,
      grade: input.grade,
      subject: input.subject,
      term: input.term ?? null,
      duration_minutes: input.durationMinutes ?? null,
      methodology_id: input.methodologyId ?? null,
    })
    .select("id")
    .single();

  if (planError || !created) return fail("failed");
  const planId = created.id as string;

  /**
   * Version 1 is written here, directly, rather than through
   * `append_lesson_plan_version`.
   *
   * That function numbers the row `current_version_no + 1`. On a plan created at
   * version 1 it would produce version 2 with no version 1, and the invariant
   * `current_version_no == max(version_no)` would never hold. Creation is the
   * one place a version is written directly; every later one goes through the
   * function, which is what serialises concurrent refinements.
   */
  const content = input.content ?? {
    title: input.title,
    objectives: ["—", "—"],
    prerequisites: [],
    materials: [],
    stages: [
      { name: "—", minutes: 5, description: "—" },
      { name: "—", minutes: 5, description: "—" },
    ],
    assessment: "—",
    homework: "—",
  };

  const { error: versionError } = await supabase.from("lesson_plan_versions").insert({
    lesson_plan_id: planId,
    version_no: 1,
    content,
    // 'generated' is refused by a CHECK without a generation_run_id, so a
    // hand-created plan is recorded as an edit by its author.
    source: input.fromRunId ? "generated" : "edited",
    generation_run_id: input.fromRunId ?? null,
  });

  if (versionError) {
    await supabase.from("lesson_plans").delete().eq("id", planId);
    return fail("failed");
  }

  return ok({ plan: { id: planId, versionNo: 1 } });
}
