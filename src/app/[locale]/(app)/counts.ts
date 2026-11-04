import { createSessionClient } from "@/lib/auth/server";

/**
 * The two numbers the shell needs, in one place.
 *
 * WHY THIS RETURNS ZEROS INSTEAD OF THROWING:
 * the badge counts a table that may not exist yet in a given environment — the
 * teaching-artefact migration is deliberately not applied to production. If this
 * threw, or if the failure propagated, the entire shell would fail to render and
 * every page under it would 500 because of a number in a nav badge. A badge is
 * decoration; it must never be load-bearing.
 *
 * It is also the reason this is a separate module rather than inline in the
 * layout: the layout should read as structure, and the "what happens when the
 * database is unreachable" decision belongs somewhere it can be read on its own.
 */
export interface ShellCounts {
  stagedFeedback: number;
}

export async function loadShellCounts(): Promise<ShellCounts> {
  const empty: ShellCounts = { stagedFeedback: 0 };

  try {
    const supabase = await createSessionClient();
    if (!supabase) return empty;

    // `head: true` + `count: 'exact'` asks Postgres for a count, not for rows:
    // the badge needs one integer and there is no reason to transfer every
    // staged note to compute it. RLS still applies, so this counts the caller's
    // own rows and nobody else's.
    const { count, error } = await supabase
      .from("feedback_notes")
      .select("id", { count: "exact", head: true })
      .eq("status", "staged");

    if (error) return empty;
    return { stagedFeedback: count ?? 0 };
  } catch {
    return empty;
  }
}
