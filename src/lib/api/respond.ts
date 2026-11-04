import { NextResponse } from "next/server";

/**
 * The response envelope for the teaching-artefact routes.
 *
 * Every failure is `{ ok: false, code }` with a code from a closed set, matching
 * what `src/lib/ai/generate.ts` already does. A PostgREST message, a Postgres
 * error string or a Zod issue never reaches the client: `code` is the whole
 * vocabulary, and a caller can switch on it exhaustively.
 *
 * `not_found` covers "absent" and "someone else's" as one answer. RLS already
 * makes another teacher's row invisible rather than forbidden, and answering 403
 * would tell the caller the id is real — reintroducing the distinction the
 * database went to the trouble of removing.
 */
export type ArtefactErrorCode =
  | "unauthorized"        // 401 no session
  | "forbidden"           // 403 the DB refused a forged owner (42501)
  | "not_found"           // 404 absent, or not yours
  | "invalid_input"       // 400
  | "conflict"            // 409 stale base version, unique key
  | "invalid_transition"  // 409 the feedback state machine refused
  | "published_rules"     // 409 already sent to a student
  | "not_configured"      // 503 no Supabase env
  | "failed";             // 500

export const ARTEFACT_ERROR_STATUS: Record<ArtefactErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  invalid_input: 400,
  conflict: 409,
  invalid_transition: 409,
  published_rules: 409,
  not_configured: 503,
  failed: 500,
};

export function fail(code: ArtefactErrorCode, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, ...(extra ?? {}) }, { status: ARTEFACT_ERROR_STATUS[code] });
}

export function ok(data: Record<string, unknown>) {
  return NextResponse.json({ ok: true, ...data });
}

/**
 * Maps a PostgREST failure onto the closed set.
 *
 * The database is the enforcement point — RLS decides visibility, the trigger
 * refuses a forged owner, the CHECK refuses an unapproved publish — so the
 * mapping has to read the errors those layers actually raise rather than
 * assuming every failure is a 500.
 */
export function codeForStatus(status: number, body: unknown): ArtefactErrorCode {
  const text = typeof body === "string" ? body : JSON.stringify(body ?? "");

  // Raised by guard_feedback_note() and by the CHECK constraints.
  if (/invalid feedback transition/i.test(text)) return "invalid_transition";
  if (/feedback_notes_publish_requires_approval|feedback_notes_published_has_timestamp/i.test(text)) {
    return "invalid_transition";
  }
  // Raised by set_owner_teacher() when a client names another teacher (42501).
  if (/refusing to create a row owned by another teacher/i.test(text)) return "forbidden";
  if (/duplicate key|unique constraint/i.test(text)) return "conflict";
  if (/violates check constraint/i.test(text)) return "invalid_input";
  if (/violates foreign key/i.test(text)) return "invalid_input";

  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status >= 400 && status < 500) return "invalid_input";
  return "failed";
}
