import { z } from "zod";

/**
 * Request schemas for the teaching-artefact routes.
 *
 * These mirror `api-contracts.md`. They are `.strict()` because that is already
 * the house style (`parseRequestEnvelope` in src/lib/ai/generate.ts), and because
 * an unknown key in a request body is either a typo or an attempt to set a field
 * the server decides — both worth refusing rather than ignoring.
 *
 * `stripControlChars` is reused from the tool registry rather than reimplemented.
 * Bidi overrides and NULs are invisible in a textarea and visible to a model, and
 * they are the usual way a pasted string breaks out of an instruction.
 */

import { stripControlChars } from "@/lib/ai/tools";

const freeText = (max: number) =>
  z
    .string()
    .transform((v) => stripControlChars(v).trim())
    .pipe(z.string().min(1).max(max));

const optionalFreeText = (max: number) =>
  freeText(max)
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : v));

export const uuid = z.string().uuid();
export const grade = z.string().min(1).max(40);
export const subject = z.string().min(1).max(80);
export const term = z.enum(["1", "2", "3"]);

/* -------------------------------------------------------------------------- */
/* Lesson plans                                                               */
/* -------------------------------------------------------------------------- */

export const lessonStageSchema = z
  .object({
    name: freeText(80),
    /** Optional: a stage may not map onto the arc, and forcing it would invent
     *  structure the content does not have. */
    phase: z.enum(["spark", "briefing", "action", "debrief"]).optional(),
    minutes: z.number().int().min(1).max(120),
    description: freeText(600),
  })
  .strict();

export const lessonPlanContentSchema = z
  .object({
    title: freeText(160),
    objectives: z.array(freeText(240)).min(2).max(6),
    prerequisites: z.array(freeText(160)).max(6).default([]),
    materials: z.array(freeText(160)).max(10),
    stages: z.array(lessonStageSchema).min(2).max(8),
    assessment: freeText(600),
    homework: freeText(400),
    closingTask: optionalFreeText(400),
    methodologySlug: optionalFreeText(60),
  })
  .strict()
  .superRefine((v, ctx) => {
    // If a plan declares a method, its stages must follow that method's arc in
    // order. A Debrief followed by an Action is not a lesson arc, and a teacher
    // comparing two plans reads it as a bug.
    if (!v.methodologySlug) return;
    const order = { spark: 0, briefing: 1, action: 2, debrief: 3 } as const;
    let last = -1;
    v.stages.forEach((stage, i) => {
      if (!stage.phase) return;
      const rank = order[stage.phase];
      if (rank < last) {
        ctx.addIssue({
          code: "custom",
          message: `stage ${i + 1}: phase order must not go backwards when a methodology is set`,
        });
      }
      last = rank;
    });
  });

export const createLessonPlanSchema = z
  .object({
    title: freeText(200),
    grade,
    subject,
    term: term.optional(),
    durationMinutes: z.number().int().min(5).max(240).optional(),
    methodologyId: uuid.optional(),
    /** Take the content from this run. Validated server-side against the caller's
     *  own runs; the client cannot hand-write "generated" content. */
    fromRunId: uuid.optional(),
    content: lessonPlanContentSchema.optional(),
  })
  .strict()
  .refine((v) => Boolean(v.fromRunId) !== Boolean(v.content), {
    message: "supply exactly one of fromRunId or content",
  });

/** PATCH touches metadata only. Content changes go through a new version. */
export const updateLessonPlanSchema = z
  .object({
    title: freeText(200).optional(),
    grade: grade.optional(),
    subject: subject.optional(),
    term: term.nullable().optional(),
    durationMinutes: z.number().int().min(5).max(240).nullable().optional(),
    methodologyId: uuid.nullable().optional(),
    status: z.enum(["draft", "ready", "archived"]).optional(),
  })
  .strict();

export const appendVersionSchema = z
  .object({
    content: lessonPlanContentSchema,
    /** The version the teacher was looking at. A mismatch is refused rather
     *  than silently overwriting another device's edit. */
    baseVersionNo: z.number().int().min(1),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* Refinement                                                                 */
/* -------------------------------------------------------------------------- */

export const refinementKindSchema = z.enum([
  "reading_level",
  "length",
  "tone",
  "language",
  "regenerate_section",
]);

export const refineRequestSchema = z
  .object({
    kind: refinementKindSchema,
    /** e.g. "6", "shorter", "formal", "en". */
    value: freeText(60),
    section: optionalFreeText(60),
    baseVersionNo: z.number().int().min(1),
    /** A refinement is about the artefact, never a pupil. */
    instruction: optionalFreeText(300),
  })
  .strict()
  .refine((v) => v.kind !== "regenerate_section" || Boolean(v.section), {
    message: "section is required to regenerate a section",
  });

/* -------------------------------------------------------------------------- */
/* Feedback — the approval gate                                               */
/* -------------------------------------------------------------------------- */

/**
 * The transitions the API accepts.
 *
 * Note what is NOT here: `staged`. There is no way to create a note that is not
 * a draft, because letting a client post `published` would make the gate a
 * suggestion. The status is decided by the state machine in the database, and
 * this enum is the vocabulary the route maps onto it.
 */
export const feedbackActionSchema = z
  .object({
    action: z.enum(["approve", "publish", "discard"]),
  })
  .strict();

export const updateFeedbackSchema = z
  .object({
    glows: z.array(freeText(300)).max(6).optional(),
    grows: z.array(freeText(300)).max(6).optional(),
    wonderings: z.array(freeText(300)).max(6).optional(),
    nextSteps: z.array(freeText(300)).max(8).optional(),
    body: optionalFreeText(4000),
  })
  .strict();

/* -------------------------------------------------------------------------- */
/* Sync                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Which entity sets a client may cache offline.
 *
 * THE ENUM IS THE PRIVACY CONTROL. `students`, `student_grades`,
 * `student_submissions` and `student_alerts` are absent from it, so a client
 * cannot ask for what must not be cached on a device — no policy has to be
 * remembered, and no reviewer has to notice.
 */
export const syncIncludeSchema = z.array(
  z.enum(["lesson_plans", "question_banks", "rubrics", "methodologies"]),
);
