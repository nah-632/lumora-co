import { createSessionClient } from "@/lib/auth/server";

/**
 * Server-side reads for the teaching artefacts.
 *
 * WHY THIS IS NOT A FETCH TO OUR OWN API ROUTES: these functions are called from
 * server components, which already have the session and the database client in
 * the same process. Fetching `/api/lesson-plans` from a page would add a round
 * trip, a second session check, and a class of failure (the internal fetch
 * failing) that has no meaning for the user. The API routes exist for the
 * interactions that genuinely happen in the browser — the adjust panel, an
 * approve button — and they share the same queries.
 *
 * EVERY READ CARRIES THE CALLER'S TOKEN, so RLS decides what comes back. There
 * is no service_role client anywhere in this file, and none is reachable from it.
 *
 * EVERY FUNCTION RETURNS A SAFE EMPTY VALUE ON FAILURE. The teaching-artefact
 * migration is deliberately not applied in every environment yet, so a missing
 * table is an expected state rather than an exception — and a page that cannot
 * list lesson plans must still render its shell, its navigation and an empty
 * state that says so.
 */

export interface LessonPlanSummary {
  id: string;
  title: string;
  grade: string;
  subject: string;
  term: string | null;
  status: "draft" | "ready" | "archived";
  currentVersionNo: number;
  methodologyId: string | null;
  methodologyName: string | null;
  updatedAt: string;
}

export interface LessonPlanVersion {
  versionNo: number;
  content: LessonPlanContent | null;
  source: "generated" | "refined" | "edited" | "duplicated";
  refinementKind: string | null;
  createdAt: string;
  runId: string | null;
}

export interface LessonStage {
  name: string;
  phase?: "spark" | "briefing" | "action" | "debrief";
  minutes: number;
  description: string;
}

/** Matches `lessonPlanContentSchema` in api-contracts.md. */
export interface LessonPlanContent {
  title?: string;
  objectives?: string[];
  prerequisites?: string[];
  materials?: string[];
  stages?: LessonStage[];
  assessment?: string;
  homework?: string;
  closingTask?: string;
  methodologySlug?: string;
}

export interface LessonPlanDetail extends LessonPlanSummary {
  versions: LessonPlanVersion[];
  projectId: string | null;
  generationRunId: string | null;
}

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" ? v : fallback);
const nullableStr = (v: unknown): string | null => (typeof v === "string" ? v : null);

const STATUSES = ["draft", "ready", "archived"] as const;
type Status = (typeof STATUSES)[number];
const asStatus = (v: unknown): Status =>
  STATUSES.includes(v as Status) ? (v as Status) : "draft";

/* -------------------------------------------------------------------------- */
/* Lesson plans                                                               */
/* -------------------------------------------------------------------------- */

export async function listLessonPlans(options?: {
  status?: Status | "all";
  search?: string;
  limit?: number;
}): Promise<LessonPlanSummary[]> {
  const supabase = await createSessionClient();
  if (!supabase) return [];

  const status = options?.status ?? "all";
  const limit = options?.limit ?? 50;

  // Archived is excluded unless explicitly asked for: it is the soft delete, and
  // a list that shows archived rows by default makes the archive meaningless.
  let query = supabase
    .from("lesson_plans")
    .select(
      "id, title, grade, subject, term, status, current_version_no, methodology_id, updated_at, methodologies(name_ar, name_en)",
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status !== "all") query = query.eq("status", status);
  else query = query.neq("status", "archived");

  if (options?.search) query = query.ilike("title", `%${options.search}%`);

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as Row[]).map((r) => {
    const method = (r.methodologies ?? null) as Row | null;
    return {
      id: str(r.id),
      title: str(r.title),
      grade: str(r.grade),
      subject: str(r.subject),
      term: nullableStr(r.term),
      status: asStatus(r.status),
      currentVersionNo: num(r.current_version_no, 1),
      methodologyId: nullableStr(r.methodology_id),
      methodologyName: method ? str(method.name_ar) || str(method.name_en) : null,
      updatedAt: str(r.updated_at),
    };
  });
}

export async function getLessonPlan(id: string): Promise<LessonPlanDetail | null> {
  const supabase = await createSessionClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("lesson_plans")
    .select(
      "id, title, grade, subject, term, status, current_version_no, methodology_id, project_id, generation_run_id, updated_at, methodologies(name_ar, name_en), lesson_plan_versions(version_no, content, source, refinement_kind, created_at, generation_run_id)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const r = data as Row;

  const versions = ((r.lesson_plan_versions ?? []) as Row[])
    .map((v) => ({
      versionNo: num(v.version_no, 1),
      content: (v.content ?? null) as LessonPlanContent | null,
      source: (["generated", "refined", "edited", "duplicated"] as const).includes(
        v.source as "generated",
      )
        ? (v.source as LessonPlanVersion["source"])
        : "edited",
      refinementKind: nullableStr(v.refinement_kind),
      createdAt: str(v.created_at),
      runId: nullableStr(v.generation_run_id),
    }))
    .sort((a, b) => b.versionNo - a.versionNo);

  const method = (r.methodologies ?? null) as Row | null;

  return {
    id: str(r.id),
    title: str(r.title),
    grade: str(r.grade),
    subject: str(r.subject),
    term: nullableStr(r.term),
    status: asStatus(r.status),
    currentVersionNo: num(r.current_version_no, 1),
    methodologyId: nullableStr(r.methodology_id),
    methodologyName: method ? str(method.name_ar) || str(method.name_en) : null,
    projectId: nullableStr(r.project_id),
    generationRunId: nullableStr(r.generation_run_id),
    updatedAt: str(r.updated_at),
    versions,
  };
}

/* -------------------------------------------------------------------------- */
/* Methodologies                                                              */
/* -------------------------------------------------------------------------- */

export interface Methodology {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: string;
  composition: string;
  durationMinMinutes: number;
  durationMaxMinutes: number;
  groupSizeMin: number;
  groupSizeMax: number;
  isFeatured: boolean;
}

export async function listMethodologies(options?: {
  category?: string;
  composition?: string;
  duration?: "any" | "under_15" | "15_to_30" | "over_30";
  classSize?: number;
}): Promise<Methodology[]> {
  const supabase = await createSessionClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("methodologies")
    .select(
      "id, slug, name_ar, name_en, description_ar, description_en, category, composition, duration_min_minutes, duration_max_minutes, group_size_min, group_size_max, is_featured",
    )
    .order("sort_order", { ascending: true });

  // RLS already limits this to status='approved'; a teacher cannot see a draft
  // method even by asking for one.
  if (error || !data) return [];

  let rows = (data as Row[]).map((r) => ({
    id: str(r.id),
    slug: str(r.slug),
    nameAr: str(r.name_ar),
    nameEn: str(r.name_en),
    descriptionAr: str(r.description_ar),
    descriptionEn: str(r.description_en),
    category: str(r.category),
    composition: str(r.composition),
    durationMinMinutes: num(r.duration_min_minutes),
    durationMaxMinutes: num(r.duration_max_minutes),
    groupSizeMin: num(r.group_size_min),
    groupSizeMax: num(r.group_size_max),
    isFeatured: r.is_featured === true,
  }));

  // Filtering in code rather than in the query: the conditions are range
  // overlaps, which PostgREST expresses awkwardly, and the catalogue is 64 rows
  // that arrive in one round trip. If it ever grows past a few hundred this
  // moves into the database, and that is the moment to change it.
  if (options?.category) rows = rows.filter((m) => m.category === options.category);
  if (options?.composition) rows = rows.filter((m) => m.composition === options.composition);
  if (options?.duration === "under_15") rows = rows.filter((m) => m.durationMinMinutes < 15);
  if (options?.duration === "15_to_30")
    rows = rows.filter((m) => m.durationMaxMinutes >= 15 && m.durationMinMinutes <= 30);
  if (options?.duration === "over_30") rows = rows.filter((m) => m.durationMaxMinutes > 30);
  if (options?.classSize)
    rows = rows.filter((m) => m.groupSizeMin <= options.classSize! && m.groupSizeMax >= options.classSize!);

  return rows;
}

/* -------------------------------------------------------------------------- */
/* Feedback                                                                   */
/* -------------------------------------------------------------------------- */

export interface FeedbackNote {
  id: string;
  studentId: string;
  studentName: string | null;
  submissionId: string | null;
  style: "targeted" | "glow_grow" | "rubric_criteria" | "next_steps";
  body: string | null;
  glows: string[];
  grows: string[];
  wonderings: string[];
  nextSteps: string[];
  rubricId: string | null;
  status: "staged" | "approved" | "published" | "discarded";
  approvedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export async function listFeedback(status: FeedbackNote["status"]): Promise<FeedbackNote[]> {
  const supabase = await createSessionClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("feedback_notes")
    .select(
      "id, student_id, submission_id, style, body, glows, grows, wonderings, next_steps, rubric_id, status, approved_at, published_at, created_at, students(name)",
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return (data as Row[]).map((r) => {
    const student = (r.students ?? null) as Row | null;
    return {
      id: str(r.id),
      studentId: str(r.student_id),
      // The name is read for the teacher's own screen only. It is never placed
      // in a prompt, and this query never leaves the server.
      studentName: student ? str(student.name) : null,
      submissionId: nullableStr(r.submission_id),
      style: (["targeted", "glow_grow", "rubric_criteria", "next_steps"] as const).includes(
        r.style as "targeted",
      )
        ? (r.style as FeedbackNote["style"])
        : "targeted",
      body: nullableStr(r.body),
      glows: asArray(r.glows),
      grows: asArray(r.grows),
      wonderings: asArray(r.wonderings),
      nextSteps: asArray(r.next_steps),
      rubricId: nullableStr(r.rubric_id),
      status: (["staged", "approved", "published", "discarded"] as const).includes(
        r.status as "staged",
      )
        ? (r.status as FeedbackNote["status"])
        : "staged",
      approvedAt: nullableStr(r.approved_at),
      publishedAt: nullableStr(r.published_at),
      createdAt: str(r.created_at),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Agents                                                                     */
/* -------------------------------------------------------------------------- */

export interface Agent {
  key: string;
  nameAr: string;
  nameEn: string;
  purposeAr: string;
  purposeEn: string;
  taskType: string;
  promptVersion: string;
  requiresHumanReview: boolean;
}

export async function listAgents(): Promise<Agent[]> {
  const supabase = await createSessionClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ai_agents")
    .select("key, name_ar, name_en, purpose_ar, purpose_en, task_type, prompt_version, requires_human_review")
    .order("task_type", { ascending: true });

  if (error || !data) return [];

  return (data as Row[]).map((r) => ({
    key: str(r.key),
    nameAr: str(r.name_ar),
    nameEn: str(r.name_en),
    purposeAr: str(r.purpose_ar),
    purposeEn: str(r.purpose_en),
    taskType: str(r.task_type),
    promptVersion: str(r.prompt_version),
    requiresHumanReview: r.requires_human_review !== false,
  }));
}
