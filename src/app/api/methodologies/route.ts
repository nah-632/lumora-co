import { NextResponse } from "next/server";
import { listMethodologies } from "@/lib/artefacts/queries";

/**
 * GET /api/methodologies
 *
 * The faceted catalogue. Filters are read from the query string, validated
 * loosely and passed to the query layer — a bad filter value is ignored rather
 * than a 400, because a catalogue that refuses to render because a URL was
 * hand-edited makes the filter look broken instead of the link.
 *
 * The situation → method suggestions are NOT fetched from a table: they are the
 * three worked examples from the recon, and they live here so they can be
 * changed without a migration. Each names a method by slug and gives a message
 * KEY for the reason, not a sentence — the copy has to exist in Arabic and
 * English, and a half-translated suggestion is worse than none.
 */
export const dynamic = "force-dynamic";

const SUGGESTIONS = [
  { situationKey: "everyoneSpeaks", methodologySlug: "chalk-talk", reasonKey: "everyoneSpeaks" },
  { situationKey: "denseContent", methodologySlug: "jigsaw", reasonKey: "denseContent" },
  { situationKey: "examineEvidence", methodologySlug: "document-mystery", reasonKey: "examineEvidence" },
];

const DURATIONS = ["any", "under_15", "15_to_30", "over_30"] as const;
type Duration = (typeof DURATIONS)[number];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams;

  const durationParam = q.get("duration");
  const duration: Duration = DURATIONS.includes(durationParam as Duration)
    ? (durationParam as Duration)
    : "any";

  const classSizeRaw = Number(q.get("classSize"));
  const classSize =
    Number.isInteger(classSizeRaw) && classSizeRaw > 0 && classSizeRaw <= 60 ? classSizeRaw : undefined;

  const methods = await listMethodologies({
    category: q.get("category") ?? undefined,
    composition: q.get("composition") ?? undefined,
    duration,
    classSize,
  });

  return NextResponse.json({
    ok: true,
    featured: methods.find((m) => m.isFeatured) ?? null,
    methods,
    suggestions: SUGGESTIONS,
    total: methods.length,
  });
}
