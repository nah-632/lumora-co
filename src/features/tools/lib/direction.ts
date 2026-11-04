/**
 * Re-export. The implementation moved to `src/lib/direction.ts` so the design
 * system's result container can use it without depending on a feature.
 *
 * This file is kept — rather than every importer being updated — because the
 * move is a refactor and not a behaviour change, and a refactor that forces
 * twelve call sites to change in the same commit is a refactor that hides its
 * own mistakes. Delete it once nothing imports it.
 */
export { directionFor, documentAttributes } from "@/lib/direction";
export type { Language, DocumentAttributes } from "@/lib/direction";
