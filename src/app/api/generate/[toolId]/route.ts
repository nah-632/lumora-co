/**
 * POST /api/generate/[toolId]
 *
 * Generates one AI artefact for the signed-in teacher. The browser sends only
 * `{ options: {...} }`; the prompt is assembled server-side from the registry and
 * never accepted from the client.
 *
 * Order of operations matters and is deliberate:
 *
 *   1. Session check first. An unauthenticated request must not be able to spend
 *      provider quota, so it is refused before the body is even parsed.
 *   2. Provider configuration second. If no key is set there is nothing to do,
 *      and answering 503 here is cheaper and more honest than a failed call.
 *   3. Validation third, then rate limiting, then generation.
 *
 * Every failure returns the same envelope `{ ok: false, code }` with a code from
 * a closed set. A provider message, a stack trace or a zod issue never reaches
 * the client.
 */

import { NextResponse } from "next/server";
import { requireUser, readSupabaseEnv, restRequest } from "@/server/supabase";
import { resolveProvider } from "@/lib/ai/gateway";
import { httpGenerator } from "@/lib/ai/http-generator";
import {
  ERROR_STATUS,
  generate,
  parseOptions,
  parseRequestEnvelope,
  type GenerateErrorCode,
  type TextGenerator,
} from "@/lib/ai/generate";
import { getRateLimiter, serverLogger } from "@/lib/ai/limit";
import { isToolId } from "@/lib/ai/tools";
import { ProviderError, classifyResponseBody } from "@/lib/ai/provider-errors";
import {
  buildCurriculumContext,
  buildReferences,
  ensureGroundingLabel,
  stripModelUrls,
  type CurriculumMatch,
} from "@/lib/ai/curriculum";
import { SessionCurriculumQuery, gradeToLevel } from "@/lib/ai/curriculum-query";
import type { OutputLanguage } from "@/lib/ai/tools";

export const runtime = "nodejs";
/** Generation is per-request and user-scoped; nothing about it is cacheable. */
export const dynamic = "force-dynamic";

/**
 * Wall-clock budget for one generation request.
 *
 * A lesson plan takes 8–30 s on the providers measured, and a reasoning model
 * that truncates and retries can approach a minute. The platform default would
 * kill the function long before that, so the ceiling is stated here rather than
 * inherited: 60 s is the maximum a Hobby deployment can be given, and this is
 * the route that needs it.
 *
 * This value and the request timeout below are a pair. The abort must fire
 * BEFORE the platform kills the function, so the caller gets a classified
 * `provider_unavailable` from our code instead of an opaque platform timeout
 * with no body. Keeping the abort longer than the budget would make our own
 * error handling unreachable on exactly the slow requests it exists for.
 */
export const maxDuration = 60;

/**
 * The tool ids whose output is a written artefact a teacher may hand out.
 *
 * Only these get curriculum grounding and a references block. `questions` is a
 * set of items with no prose for a citation to attach to, and grounding it would
 * put a source heading above an exam paper, which reads as "these questions come
 * from the curriculum" — a claim this pipeline cannot support.
 */
const GROUNDED_TOOLS = new Set(["lesson-plan", "remedial-plan"]);

export async function POST(req: Request, context: { params: { toolId: string } }) {
  const toolId = context.params.toolId;

  // 1. Session. The client-supplied tool id is not trusted for anything beyond
  //    being a lookup key, and an unknown one is a 400 below — but it is checked
  //    here too so a bad URL is not reported as a missing session.
  const session = await requireUser();
  if (!session) {
    return json({ ok: false, code: "unauthorized" }, 401);
  }

  if (!isToolId(toolId)) {
    return json({ ok: false, code: "invalid_input" }, 400);
  }

  // 2. Provider availability. A missing key is a state, not a crash, and it is
  //    cheaper to answer here than to start a request that cannot succeed.
  const provider = resolveProvider();
  if (!provider) {
    return json({ ok: false, code: "ai_not_configured" }, ERROR_STATUS.ai_not_configured);
  }

  // 3. Body. A malformed body is a 400, never a 500.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: "invalid_input" }, 400);
  }

  const envelope = parseRequestEnvelope(toolId, body);
  if (!envelope.ok) {
    return json({ ok: false, code: "invalid_input" }, 400);
  }

  const options = parseOptions(toolId, envelope.options);
  if (!options) {
    return json({ ok: false, code: "invalid_input" }, 400);
  }

  const logger = serverLogger();

  // 4. Curriculum retrieval, BEFORE the first provider call.
  //
  //    This is the only network read in the request that is not the model call,
  //    and it happens here so the pipeline stays a pure two-call module. A
  //    failure inside it returns no matches and the request proceeds ungrounded:
  //    a lesson plan written from general standards is a valid product, and a 500
  //    because a lookup table was unreachable is not.
  const grounding = GROUNDED_TOOLS.has(toolId)
    ? await resolveGrounding(options, session.token, logger)
    : undefined;

  // 5. Generate. Rate limiting happens inside, before the first provider call.
  const generator = httpGenerator(provider);
  const result = await generate({
    toolId,
    options,
    userId: session.user.id,
    generator,
    limiter: getRateLimiter(),
    logger,
    grounding: grounding ? { block: grounding.block, hasText: grounding.hasText } : undefined,
  });

  if (!result.ok) {
    const headers: Record<string, string> = {};
    if (result.retryAfterSeconds !== undefined) {
      headers["Retry-After"] = String(result.retryAfterSeconds);
    }
    return json({ ok: false, code: result.code }, result.status, headers);
  }

  // 6. Post-process. Every URL a teacher sees comes from here, not from the model.
  const language = options.outputLanguage as OutputLanguage;
  const { data, urlsRemoved } = finaliseOutput(
    result.data,
    grounding?.matches ?? [],
    grounding?.hasText ?? false,
    language,
  );

  // The count is logged, the URLs are not: a model-emitted URL is a signal that
  // the prompt was ignored, and writing the URL itself into a log would make a
  // hallucinated destination look like a recorded reference.
  if (urlsRemoved > 0) {
    logger.warn({ code: "model_emitted_urls_stripped", toolId, count: urlsRemoved, status: 200 });
  }

  return json({ ok: true, data }, 200);
}

/**
 * Resolves the curriculum context for a request.
 *
 * The retrieval call is wrapped because a throw here must not become a 500. The
 * fields it needs are read defensively: `grade` and `subject` are enum-validated
 * by the registry, but this function also runs in tests that pass a bare object.
 *
 * The request runs on the CALLER'S OWN TOKEN, so the verified-only RLS policies
 * are what decide which rows come back — this function does not re-implement the
 * authorisation decision. See the header of `curriculum-query.ts`.
 */
async function resolveGrounding(
  options: Record<string, unknown>,
  token: string,
  logger: ReturnType<typeof serverLogger>,
) {
  const env = readSupabaseEnv();
  if (!env) return buildCurriculumContext([]);

  const subject = typeof options.subject === "string" ? options.subject : "";
  const grade = typeof options.grade === "string" ? options.grade : "";
  const topic = typeof options.topic === "string" && options.topic !== "" ? options.topic : null;

  if (!subject || !grade) {
    // Nothing to query on. The honest answer is "no curriculum text", not an
    // exception and not a guess at a subject.
    return buildCurriculumContext([]);
  }

  const query = new SessionCurriculumQuery(
    (path, body) =>
      restRequest(env, token, path, {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
      }),
    logger,
  );

  const matches = await query.search({
    subject,
    gradeLevel: gradeToLevel(grade),
    lessonTopic: topic,
    term: null,
    limit: 3,
  });

  return buildCurriculumContext(matches);
}

/**
 * Strips model-generated URLs from every prose field, then appends the
 * server-built references block.
 *
 * The walk is generic because the two grounded tools have different output
 * shapes (`lesson-plan` has `stages`, `remedial-plan` has `sessions`), and a
 * field-by-field version would silently miss a field added later. Strings are
 * transformed and everything else is passed through — numbers, booleans and
 * nulls cannot contain a URL.
 */
function finaliseOutput(
  data: unknown,
  matches: CurriculumMatch[],
  hasText: boolean,
  language: OutputLanguage,
): { data: unknown; urlsRemoved: number } {
  let urlsRemoved = 0;

  const walk = (value: unknown): unknown => {
    if (typeof value === "string") {
      const stripped = stripModelUrls(value);
      urlsRemoved += stripped.removed;
      return stripped.text;
    }
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
        out[key] = walk(inner);
      }
      return out;
    }
    return value;
  };

  const stripped = walk(data) as Record<string, unknown>;

  // The grounding label is applied AFTER stripping, so a model that emitted the
  // disclaimer wrapped around a URL does not end up with a mangled sentence.
  if (typeof stripped?.title === "string") {
    stripped.title = ensureGroundingLabel(stripped.title, hasText, language);
  }

  const references = buildReferences(matches, language);
  if (references) {
    stripped.references = references;
  }

  return { data: stripped, urlsRemoved };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function json(payload: unknown, status: number, headers: Record<string, string> = {}) {
  const code =
    typeof payload === "object" && payload !== null && "code" in payload
      ? (payload as { code: GenerateErrorCode }).code
      : undefined;
  return NextResponse.json(payload, {
    status,
    headers: {
      ...headers,
      // A generation result is user-specific and per-request.
      "Cache-Control": "no-store",
      ...(code ? { "X-Lumora-Error": code } : {}),
    },
  });
}

