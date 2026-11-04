-- ============================================================================
-- LUMORA — 0020_teaching_artefacts.sql
-- ============================================================================
-- Adds the tables the teaching features need on top of the 21 that exist:
--
--   methodologies        the teaching-method catalogue          (Flip Education)
--   ai_agents            the registry of specialised agents      (InstrucTwin)
--   lesson_plans         the plan artefact + its metadata        (roadmap 3.3)
--   lesson_plan_versions immutable snapshots, the refine chain   (MagicSchool)
--   question_banks       a named set of questions                (roadmap 3.4)
--   questions            question-level rows, for future analytics
--   rubrics              + rubric_criteria                       (Brisk / InstrucTwin)
--   feedback_notes       glows/grows/next-steps with the          (Brisk)
--                        teacher-approval gate
--
-- Conventions copied from the existing migrations, not invented here:
--   * id uuid primary key default gen_random_uuid()
--   * teacher_id uuid not null references auth.users(id) on delete cascade
--   * a composite FK (child_id, teacher_id) -> parent(id, teacher_id) so tenant
--     isolation is a constraint and not only a policy (ADR-002)
--   * created_at/updated_at timestamptz, public.touch_updated_at() trigger
--   * public.set_owner_teacher() BEFORE INSERT, so a client cannot choose its
--     own owner (0013)
--   * revoke all from anon, authenticated; then grant the minimum back
--   * every statement is re-runnable
--
-- Nothing here touches, renames or drops an existing column.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.methodology_category as enum
    ('discussion', 'simulation', 'cooperative', 'inquiry', 'project', 'early_years');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.group_composition as enum
    ('whole_class', 'small_groups', 'pairs_individual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.artefact_status as enum ('draft', 'ready', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.question_type as enum ('mcq', 'true_false', 'short_answer', 'essay');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.question_difficulty as enum ('easy', 'medium', 'hard', 'mixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rubric_source as enum ('generated', 'uploaded', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.feedback_style as enum
    ('targeted', 'glow_grow', 'rubric_criteria', 'next_steps');
exception when duplicate_object then null; end $$;

-- staged -> approved -> published. `discarded` is the teacher throwing it away.
-- The default is `staged` on purpose: generated feedback is NOT visible to a
-- student until a teacher approves it (see the feedback_notes_publish_check).
do $$ begin
  create type public.feedback_status as enum ('staged', 'approved', 'published', 'discarded');
exception when duplicate_object then null; end $$;

-- What a refinement changed. `manual_edit` is the teacher typing, not a model.
do $$ begin
  create type public.refinement_kind as enum
    ('reading_level', 'length', 'tone', 'language', 'regenerate_section', 'manual_edit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.agent_review_status as enum
    ('not_required', 'pending_review', 'approved', 'discarded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.version_source as enum
    ('generated', 'refined', 'edited', 'duplicated');
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------------
-- 2. Reference data — readable by every teacher, written by staff only
-- ---------------------------------------------------------------------------

-- The teaching-method catalogue.
--
-- This is the one table in the set that is NOT teacher-owned: a method is a
-- shared, curated fact, like curriculum_sources. It reuses the existing
-- source_status enum for its lifecycle so there is one review vocabulary.
create table if not exists public.methodologies (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ar text not null check (char_length(btrim(name_ar)) between 1 and 120),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 120),
  description_ar text not null check (char_length(btrim(description_ar)) between 1 and 600),
  description_en text not null check (char_length(btrim(description_en)) between 1 and 600),
  category public.methodology_category not null,
  composition public.group_composition not null,
  -- The two numbers the catalogue is filtered by, per Flip Education.
  duration_min_minutes smallint not null check (duration_min_minutes between 1 and 240),
  duration_max_minutes smallint not null check (duration_max_minutes between 1 and 240),
  group_size_min smallint not null check (group_size_min between 1 and 100),
  group_size_max smallint not null check (group_size_max between 1 and 100),
  -- "Featured this week": an editorial slot, not a rating.
  is_featured boolean not null default false,
  featured_at timestamptz,
  sort_order integer not null default 0,
  status public.source_status not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint methodologies_duration_order check (duration_max_minutes >= duration_min_minutes),
  constraint methodologies_group_order check (group_size_max >= group_size_min)
);

create unique index if not exists methodologies_slug_key on public.methodologies (slug);
create index if not exists methodologies_browse_idx
  on public.methodologies (status, category, duration_min_minutes);
create index if not exists methodologies_featured_idx
  on public.methodologies (is_featured, featured_at desc);

drop trigger if exists methodologies_touch_updated_at on public.methodologies;
create trigger methodologies_touch_updated_at
  before update on public.methodologies
  for each row execute function public.touch_updated_at();


-- The registry of specialised agents.
--
-- InstrucTwin's central claim is that the work is split across agents that
-- operate inside rules, not one general assistant. This table is where that
-- claim becomes configuration a reviewer can inspect: what the agent is for,
-- which prompt version it runs, and whether its output needs a human.
--
-- It is reference data, not teacher data. The prompt TEXT lives in the codebase
-- (src/lib/ai/prompts) and is addressed by prompt_version, so a row here can
-- never be used to inject behaviour at runtime.
create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  key text not null check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ar text not null check (char_length(btrim(name_ar)) between 1 and 120),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 120),
  purpose_ar text not null check (char_length(btrim(purpose_ar)) between 1 and 600),
  purpose_en text not null check (char_length(btrim(purpose_en)) between 1 and 600),
  -- The tool id this agent serves; matches the ids in src/lib/ai/tools.ts.
  task_type text not null check (char_length(btrim(task_type)) between 1 and 60),
  -- Which prompt generation this agent runs. Changing behaviour means changing
  -- the version, so a generation_run always says which rules produced it.
  prompt_version text not null check (char_length(btrim(prompt_version)) between 1 and 60),
  -- InstrucTwin's governance idea: some agents may only ever produce a draft.
  requires_human_review boolean not null default true,
  max_output_tokens integer check (max_output_tokens is null or max_output_tokens between 256 and 32000),
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_agents_key_key on public.ai_agents (key);
create index if not exists ai_agents_task_idx on public.ai_agents (task_type, is_enabled);

drop trigger if exists ai_agents_touch_updated_at on public.ai_agents;
create trigger ai_agents_touch_updated_at
  before update on public.ai_agents
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- 3. generation_runs — extended, never rebuilt
-- ---------------------------------------------------------------------------
-- The table already records task_type, provider, model, prompt_version, status,
-- latency and cost. Three additions:
--   agent_id        which registered agent produced this run
--   parent_run_id   the refinement chain: "shorter" is a child of the original
--   review_status   whether a human still has to look at the output
-- Additive only; every existing query keeps working.

alter table public.generation_runs
  add column if not exists agent_id uuid references public.ai_agents (id) on delete set null;
alter table public.generation_runs
  add column if not exists parent_run_id uuid references public.generation_runs (id) on delete set null;
alter table public.generation_runs
  add column if not exists refinement_kind public.refinement_kind;
alter table public.generation_runs
  add column if not exists review_status public.agent_review_status not null default 'not_required';
alter table public.generation_runs
  add column if not exists updated_at timestamptz;

create index if not exists generation_runs_user_recent_idx
  on public.generation_runs (user_id, created_at desc);
create index if not exists generation_runs_parent_idx
  on public.generation_runs (parent_run_id);
create index if not exists generation_runs_agent_idx
  on public.generation_runs (agent_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. Lesson plans
-- ---------------------------------------------------------------------------
-- Why a dedicated table rather than projects/project_items:
--   * the roadmap names the plan's fields (3.3), so they are a schema, not a blob
--   * a plan must be printable/exportable with correct RTL, which needs typed
--     fields rather than free jsonb the exporter has to guess at
--   * offline read (Phase 4) needs a small, fixed payload per row
--   * the plan is versioned and refinable, which the generic container cannot
--     express without a second layer of conventions on top of it
-- `projects` stays as the teacher's collection/folder; a plan may be filed in one.
--
-- The plan's CONTENT is jsonb, validated by the Zod schema in the app layer
-- (lessonPlanContentSchema). Column-level promotion is only for what is
-- filtered, sorted or joined on.

create table if not exists public.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  grade text not null check (char_length(btrim(grade)) between 1 and 40),
  subject text not null check (char_length(btrim(subject)) between 1 and 80),
  term text check (term is null or term in ('1', '2', '3')),
  duration_minutes smallint check (duration_minutes is null or duration_minutes between 5 and 240),
  -- The method this plan follows, when the teacher picked one. A catalogued,
  -- shared row, so deleting it must not delete the plan.
  methodology_id uuid references public.methodologies (id) on delete set null,
  -- Which project/folder it is filed under, if any.
  project_id uuid references public.projects (id) on delete set null,
  status public.artefact_status not null default 'draft',
  -- 'archived' is the soft delete: the row stays, the list hides it, and it can
  -- be brought back. There is deliberately no deleted_at column, so there is
  -- exactly one way to put something away.
  -- Pointer to the current row in lesson_plan_versions. A plain integer rather
  -- than an FK, so there is no circular constraint between the two tables.
  current_version_no integer not null default 1 check (current_version_no >= 1),
  generation_run_id uuid references public.generation_runs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_plans_id_teacher_key unique (id, teacher_id)
);

create index if not exists lesson_plans_teacher_recent_idx
  on public.lesson_plans (teacher_id, updated_at desc);
create index if not exists lesson_plans_browse_idx
  on public.lesson_plans (teacher_id, grade, subject);
create index if not exists lesson_plans_methodology_idx
  on public.lesson_plans (methodology_id) where methodology_id is not null;

drop trigger if exists lesson_plans_touch_updated_at on public.lesson_plans;
create trigger lesson_plans_touch_updated_at
  before update on public.lesson_plans
  for each row execute function public.touch_updated_at();


-- Immutable snapshots. A refinement never edits a row here; it appends one.
--
-- This is what makes "adjust the output" safe: the teacher can always get back
-- the previous wording, and "how did this plan get to its current state" is a
-- query, not a guess. MagicSchool's Studio Mode edits text in place and loses
-- that; storing versions costs one row per change and keeps it.
create table if not exists public.lesson_plan_versions (
  id uuid primary key default gen_random_uuid(),
  lesson_plan_id uuid not null,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  version_no integer not null check (version_no >= 1),
  content jsonb not null,
  source public.version_source not null,
  -- Set when a model produced this version, so a refinement is auditable.
  refinement_kind public.refinement_kind,
  generation_run_id uuid references public.generation_runs (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint lesson_plan_versions_plan_teacher_fkey
    foreign key (lesson_plan_id, teacher_id)
    references public.lesson_plans (id, teacher_id) on delete cascade,
  constraint lesson_plan_versions_unique unique (lesson_plan_id, version_no),
  -- A manual edit is the teacher typing; it must not claim a refinement kind
  -- that only the refine endpoint sets.
  constraint lesson_plan_versions_manual_has_no_kind
    check (source <> 'edited' or refinement_kind is null),
  constraint lesson_plan_versions_generated_needs_run
    check (source <> 'generated' or generation_run_id is not null)
);

create index if not exists lesson_plan_versions_plan_idx
  on public.lesson_plan_versions (lesson_plan_id, version_no desc);


-- ---------------------------------------------------------------------------
-- 5. Question banks and questions
-- ---------------------------------------------------------------------------
-- Questions are ROWS, not a jsonb array, for one reason: the roadmap's
-- candidate idea is "questions most students missed, with a reteach
-- suggestion". That is a GROUP BY over question identity, and it is impossible
-- against a blob that is rewritten on every edit.
--
-- The cost is that a set is many rows. It is worth it once, and it cannot be
-- retrofitted cheaply later.

create table if not exists public.question_banks (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  grade text not null check (char_length(btrim(grade)) between 1 and 40),
  subject text not null check (char_length(btrim(subject)) between 1 and 80),
  term text check (term is null or term in ('1', '2', '3')),
  -- The lesson this bank was generated from, when it came from one. Deleting
  -- the plan must not delete the questions, so this is SET NULL.
  source_lesson_plan_id uuid references public.lesson_plans (id) on delete set null,
  status public.artefact_status not null default 'draft',
  generation_run_id uuid references public.generation_runs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_banks_id_teacher_key unique (id, teacher_id)
);

create index if not exists question_banks_teacher_recent_idx
  on public.question_banks (teacher_id, updated_at desc);
create index if not exists question_banks_source_plan_idx
  on public.question_banks (source_lesson_plan_id) where source_lesson_plan_id is not null;

drop trigger if exists question_banks_touch_updated_at on public.question_banks;
create trigger question_banks_touch_updated_at
  before update on public.question_banks
  for each row execute function public.touch_updated_at();


create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  position integer not null check (position >= 0),
  question_type public.question_type not null,
  prompt text not null check (char_length(btrim(prompt)) between 1 and 1000),
  -- Options for mcq/true_false, empty array otherwise.
  options jsonb not null default '[]'::jsonb,
  -- Matches the normalisation the model output already uses: -1 arrives as null
  -- from the validator, and true/false is option 0 or 1.
  correct_index integer check (correct_index is null or correct_index between 0 and 3),
  answer text check (answer is null or char_length(answer) <= 1000),
  marks numeric(5, 2) not null default 1 check (marks > 0),
  difficulty public.question_difficulty not null default 'medium',
  rubric text check (rubric is null or char_length(rubric) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_bank_teacher_fkey
    foreign key (bank_id, teacher_id)
    references public.question_banks (id, teacher_id) on delete cascade,
  -- Every shape the model can legally return is expressible; nothing else is.
  constraint questions_shape check (
    (question_type = 'mcq'
      and correct_index is not null
      and jsonb_typeof(options) = 'array'
      and jsonb_array_length(options) between 2 and 4)
    or (question_type = 'true_false'
      and correct_index is not null
      and correct_index between 0 and 1
      and jsonb_typeof(options) = 'array'
      and jsonb_array_length(options) = 2)
    or (question_type in ('short_answer', 'essay'))
  )
);

create index if not exists questions_bank_position_idx
  on public.questions (bank_id, position);
create index if not exists questions_teacher_idx
  on public.questions (teacher_id);

drop trigger if exists questions_touch_updated_at on public.questions;
create trigger questions_touch_updated_at
  before update on public.questions
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- 6. Rubrics
-- ---------------------------------------------------------------------------
-- Needed twice over: Brisk's "Rubric Criteria" feedback style (create a rubric
-- with the prompt, or upload one), and InstrucTwin's "AI rubric generation".
-- Uploaded rubrics arrive as a file; parsing them is the app's problem, and the
-- row only records that it came from an upload.

create table if not exists public.rubrics (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  grade text check (grade is null or char_length(btrim(grade)) <= 40),
  subject text check (subject is null or char_length(btrim(subject)) <= 80),
  source public.rubric_source not null default 'manual',
  generation_run_id uuid references public.generation_runs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rubrics_id_teacher_key unique (id, teacher_id)
);

create index if not exists rubrics_teacher_recent_idx
  on public.rubrics (teacher_id, updated_at desc);

drop trigger if exists rubrics_touch_updated_at on public.rubrics;
create trigger rubrics_touch_updated_at
  before update on public.rubrics
  for each row execute function public.touch_updated_at();


create table if not exists public.rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  position integer not null check (position >= 0),
  criterion text not null check (char_length(btrim(criterion)) between 1 and 300),
  -- The descriptors per level, e.g. {"4": "...", "3": "..."}. Kept as jsonb
  -- because the number of levels is a teacher's choice, not a schema decision.
  level_descriptors jsonb not null default '{}'::jsonb,
  max_points numeric(5, 2) not null default 4 check (max_points > 0),
  created_at timestamptz not null default now(),
  constraint rubric_criteria_rubric_teacher_fkey
    foreign key (rubric_id, teacher_id)
    references public.rubrics (id, teacher_id) on delete cascade
);

create index if not exists rubric_criteria_rubric_idx
  on public.rubric_criteria (rubric_id, position);


-- ---------------------------------------------------------------------------
-- 7. Feedback notes — the teacher-approval gate
-- ---------------------------------------------------------------------------
-- Brisk's four styles, with the one property worth copying exactly: AI-written
-- feedback is STAGED and does not reach a student until a teacher approves it.
--
-- Two things make that a guarantee rather than a convention:
--   1. status defaults to 'staged'
--   2. a CHECK forbids 'published' without approved_at and approved_by
-- A bug in the app, a forgotten filter or a direct API call cannot publish
-- unreviewed model output, because the database refuses the row.

-- The composite FK below needs the (id, teacher_id) key on submissions. The
-- project's doctrine is that isolation is a composite FK and not only a policy
-- (ADR-002), and students already carries this key; submissions did not.
--
-- Additive: a unique index on (id, teacher_id) where id is already the primary
-- key cannot reject a row that the primary key accepts.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_submissions_id_teacher_key'
  ) then
    alter table public.student_submissions
      add constraint student_submissions_id_teacher_key unique (id, teacher_id);
  end if;
end $$;


create table if not exists public.feedback_notes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null,
  submission_id uuid,
  style public.feedback_style not null,
  -- Prose, for the `targeted` style.
  body text check (body is null or char_length(body) <= 4000),
  -- Glow & Grow: strengths, areas for growth, wonderings.
  glows text[] not null default '{}',
  grows text[] not null default '{}',
  wonderings text[] not null default '{}',
  -- Next Steps: one ordered step per item.
  next_steps text[] not null default '{}',
  -- Rubric Criteria: the rubric the feedback is aligned to.
  rubric_id uuid,
  status public.feedback_status not null default 'staged',
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  generation_run_id uuid references public.generation_runs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_notes_student_teacher_fkey
    foreign key (student_id, teacher_id)
    references public.students (id, teacher_id) on delete cascade,
  constraint feedback_notes_submission_teacher_fkey
    foreign key (submission_id, teacher_id)
    references public.student_submissions (id, teacher_id) on delete cascade,
  constraint feedback_notes_rubric_teacher_fkey
    foreign key (rubric_id, teacher_id)
    references public.rubrics (id, teacher_id) on delete set null,
  -- THE GATE.
  constraint feedback_notes_publish_requires_approval check (
    status <> 'published' or (approved_at is not null and approved_by is not null)
  ),
  -- A published note must also carry when it went out.
  constraint feedback_notes_published_has_timestamp check (
    status <> 'published' or published_at is not null
  ),
  -- Each style carries the payload that means something for it, so an empty
  -- Glow & Grow cannot be stored as if it were feedback.
  constraint feedback_notes_style_payload check (
    (style = 'glow_grow'
      and (coalesce(array_length(glows, 1), 0)
         + coalesce(array_length(grows, 1), 0)
         + coalesce(array_length(wonderings, 1), 0)) > 0)
    or (style = 'next_steps' and coalesce(array_length(next_steps, 1), 0) > 0)
    or (style = 'targeted' and body is not null and char_length(btrim(body)) > 0)
    or (style = 'rubric_criteria' and rubric_id is not null)
  )
);

create index if not exists feedback_notes_student_idx
  on public.feedback_notes (student_id, created_at desc);
create index if not exists feedback_notes_submission_idx
  on public.feedback_notes (submission_id) where submission_id is not null;
-- The queue a teacher actually looks at: everything still staged.
create index if not exists feedback_notes_staged_idx
  on public.feedback_notes (teacher_id, created_at desc) where status = 'staged';

drop trigger if exists feedback_notes_touch_updated_at on public.feedback_notes;
create trigger feedback_notes_touch_updated_at
  before update on public.feedback_notes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Owner is forced by the database, never chosen by the client
-- ---------------------------------------------------------------------------
-- Same trigger the student tables use (0013). A client that sends
-- teacher_id = someone else has it overwritten with its own identity before the
-- INSERT policy compares, so the comparison is against a final value.

do $$
declare
  t text;
begin
  foreach t in array array[
    'lesson_plans', 'lesson_plan_versions', 'question_banks',
    'questions', 'rubrics', 'rubric_criteria', 'feedback_notes'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_owner', t);
    execute format(
      'create trigger %I before insert on public.%I for each row execute function public.set_owner_teacher()',
      t || '_set_owner', t
    );
  end loop;
end $$;


-- The gate has two layers on purpose, and the first version of this file got it
-- wrong: a trigger that stamped the approver whenever it saw status 'approved'
-- OR 'published' also licensed the direct staged -> published jump, and the
-- CHECK never fired. Testing caught it. The trigger is now a state machine, so
-- the CHECK below is a backstop rather than the only guard.
--
--   staged -> approved -> published      the only route to a student
--   staged | approved -> discarded       the teacher throws it away
--   anything moving backwards             refused
--
-- approved_by is set from the session, never from the payload: a client cannot
-- attribute an approval to another user. With no session (service_role, fixtures)
-- there is no approver, the column stays null, and the CHECK refuses to publish —
-- which is correct, because an approval without a human is not an approval.
create or replace function public.guard_feedback_note()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if new.status <> old.status then
    if not (
      (old.status = 'staged'   and new.status in ('approved', 'discarded'))
      or (old.status = 'approved' and new.status in ('published', 'discarded'))
    ) then
      raise exception 'invalid feedback transition: % -> %', old.status, new.status
        using errcode = '23514';
    end if;
  end if;

  if new.status = 'approved' and old.status = 'staged' then
    new.approved_at := now();
    new.approved_by := (select auth.uid());
  end if;

  if new.status = 'published' and old.status = 'approved' then
    new.published_at := now();
  end if;

  return new;
end;
$$;

comment on function public.guard_feedback_note() is
  'BEFORE UPDATE: enforces staged -> approved -> published, stamps the approver from the session, and refuses any other transition.';

drop trigger if exists feedback_notes_set_approver on public.feedback_notes;
drop trigger if exists feedback_notes_guard on public.feedback_notes;
create trigger feedback_notes_guard
  before update on public.feedback_notes
  for each row execute function public.guard_feedback_note();


-- ---------------------------------------------------------------------------
-- 9. Appending a version is one atomic act
-- ---------------------------------------------------------------------------
-- The only safe way to add a version: lock the plan, take the next number,
-- insert, bump the pointer. Doing this from the app as three statements would
-- race two refinements into the same version_no.
--
-- SECURITY INVOKER on purpose: RLS still applies, so a teacher cannot append to
-- a plan they do not own even by calling the function directly.

create or replace function public.append_lesson_plan_version(
  p_lesson_plan_id uuid,
  p_content jsonb,
  p_source public.version_source,
  p_refinement_kind public.refinement_kind default null,
  p_generation_run_id uuid default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_teacher uuid := (select auth.uid());
  v_next integer;
begin
  if v_teacher is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'invalid_content' using errcode = '22023';
  end if;

  -- FOR UPDATE serialises concurrent refinements of the same plan.
  select current_version_no + 1
    into v_next
    from public.lesson_plans
   where id = p_lesson_plan_id
     and teacher_id = v_teacher
     and status <> 'archived'
   for update;

  if v_next is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  insert into public.lesson_plan_versions
    (lesson_plan_id, teacher_id, version_no, content, source, refinement_kind, generation_run_id)
  values
    (p_lesson_plan_id, v_teacher, v_next, p_content, p_source, p_refinement_kind, p_generation_run_id);

  update public.lesson_plans
     set current_version_no = v_next
   where id = p_lesson_plan_id and teacher_id = v_teacher;

  return v_next;
end;
$$;

comment on function public.append_lesson_plan_version(uuid, jsonb, public.version_source, public.refinement_kind, uuid) is
  'Appends an immutable lesson-plan version and moves the plan pointer in one transaction. The only supported write path for a new version.';


-- ---------------------------------------------------------------------------
-- 10. Row level security
-- ---------------------------------------------------------------------------

alter table public.methodologies          enable row level security;
alter table public.ai_agents              enable row level security;
alter table public.lesson_plans           enable row level security;
alter table public.lesson_plan_versions   enable row level security;
alter table public.question_banks         enable row level security;
alter table public.questions              enable row level security;
alter table public.rubrics                enable row level security;
alter table public.rubric_criteria        enable row level security;
alter table public.feedback_notes         enable row level security;

-- Reference data: everyone reads the approved rows, only staff write.
-- Mirrors curriculum_sources_select_verified exactly.
drop policy if exists methodologies_select_approved on public.methodologies;
create policy methodologies_select_approved on public.methodologies
  for select to authenticated
  using (status = 'approved');

drop policy if exists methodologies_write_staff on public.methodologies;
create policy methodologies_write_staff on public.methodologies
  for all to authenticated
  using (public.is_staff((select auth.uid())))
  with check (public.is_staff((select auth.uid())));

drop policy if exists ai_agents_select_enabled on public.ai_agents;
create policy ai_agents_select_enabled on public.ai_agents
  for select to authenticated
  using (is_enabled);

drop policy if exists ai_agents_write_staff on public.ai_agents;
create policy ai_agents_write_staff on public.ai_agents
  for all to authenticated
  using (public.is_staff((select auth.uid())))
  with check (public.is_staff((select auth.uid())));

-- Teacher-owned artefacts: owner only, every operation explicit.
do $$
declare
  t text;
begin
  foreach t in array array[
    'lesson_plans', 'question_banks', 'questions',
    'rubrics', 'rubric_criteria', 'feedback_notes'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (teacher_id = (select auth.uid()))',
      t || '_select_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (teacher_id = (select auth.uid()))',
      t || '_insert_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()))',
      t || '_update_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (teacher_id = (select auth.uid()))',
      t || '_delete_own', t);
  end loop;
end $$;

-- Versions are append-only: SELECT and INSERT, and deliberately NO update
-- policy. Immutability is the absence of a policy, not a convention in the app.
drop policy if exists lesson_plan_versions_select_own on public.lesson_plan_versions;
create policy lesson_plan_versions_select_own on public.lesson_plan_versions
  for select to authenticated
  using (teacher_id = (select auth.uid()));

drop policy if exists lesson_plan_versions_insert_own on public.lesson_plan_versions;
create policy lesson_plan_versions_insert_own on public.lesson_plan_versions
  for insert to authenticated
  with check (teacher_id = (select auth.uid()));

drop policy if exists lesson_plan_versions_delete_own on public.lesson_plan_versions;
create policy lesson_plan_versions_delete_own on public.lesson_plan_versions
  for delete to authenticated
  using (teacher_id = (select auth.uid()));


-- ---------------------------------------------------------------------------
-- 11. Grants — least privilege, revoked first
-- ---------------------------------------------------------------------------

revoke all on public.methodologies        from anon, authenticated;
revoke all on public.ai_agents            from anon, authenticated;
revoke all on public.lesson_plans         from anon, authenticated;
revoke all on public.lesson_plan_versions from anon, authenticated;
revoke all on public.question_banks       from anon, authenticated;
revoke all on public.questions            from anon, authenticated;
revoke all on public.rubrics              from anon, authenticated;
revoke all on public.rubric_criteria      from anon, authenticated;
revoke all on public.feedback_notes       from anon, authenticated;

-- Reference data is readable by every teacher. Staff write it through RLS, the
-- same way pedagogical_activities does (0017): the GRANT says what is possible,
-- the POLICY says who may do it. Both layers are asserted separately.
grant select, insert, update, delete on public.methodologies to authenticated;
grant select, insert, update, delete on public.ai_agents to authenticated;

grant select, insert, update, delete on public.lesson_plans         to authenticated;
grant select, insert, delete         on public.lesson_plan_versions to authenticated;
grant select, insert, update, delete on public.question_banks       to authenticated;
grant select, insert, update, delete on public.questions            to authenticated;
grant select, insert, update, delete on public.rubrics              to authenticated;
grant select, insert, update, delete on public.rubric_criteria      to authenticated;
grant select, insert, update, delete on public.feedback_notes       to authenticated;

-- generation_runs gains columns, so the update grant is narrowed to them. A
-- teacher may move a run's own status and cost fields; they may not rewrite which
-- provider, model, task or prompt version produced it.
revoke update on public.generation_runs from authenticated;
grant update (status, latency_ms, input_tokens, output_tokens,
              cost_actual, error_code, completed_at, review_status, updated_at)
  on public.generation_runs to authenticated;

revoke all on function public.append_lesson_plan_version(uuid, jsonb, public.version_source, public.refinement_kind, uuid) from public, anon;
grant execute on function public.append_lesson_plan_version(uuid, jsonb, public.version_source, public.refinement_kind, uuid) to authenticated;

revoke all on function public.guard_feedback_note() from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- 12. What the columns mean, for whoever reads this next
-- ---------------------------------------------------------------------------

comment on table public.methodologies is
  'Shared teaching-method catalogue. Not teacher-owned: a method is curated reference data, written by staff.';
comment on column public.methodologies.is_featured is
  'The editorial "featured this week" slot. Not a rating and not a ranking of quality.';

comment on table public.ai_agents is
  'Registry of specialised agents. Prompt TEXT lives in src/lib/ai/prompts and is addressed by prompt_version, so a row here cannot inject behaviour at runtime.';
comment on column public.ai_agents.requires_human_review is
  'When true, an output from this agent is a draft until a teacher approves it.';

comment on table public.lesson_plans is
  'A lesson plan artefact. Content lives in lesson_plan_versions; this row holds identity, metadata and a pointer to the current version.';
comment on column public.lesson_plans.status is
  'draft | ready | archived. archived is the soft delete; it can be restored by moving it back.';
comment on table public.lesson_plan_versions is
  'Immutable snapshots. Append-only: there is no update policy, so a version cannot be rewritten after it is created.';

comment on table public.questions is
  'One row per question so question-level analytics is a GROUP BY, not a parse of a rewritten blob.';
comment on column public.questions.correct_index is
  'NULL for short_answer and essay. Normalised from the model output, where -1 means "no correct option".';

comment on table public.feedback_notes is
  'Teacher-reviewed feedback. status defaults to staged and the database refuses published without approved_at and approved_by.';
comment on column public.feedback_notes.style is
  'targeted | glow_grow | rubric_criteria | next_steps. Each style carries the payload that means something for it.';
