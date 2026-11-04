import { AiResult, Card, CardTitle, CardDescription, CardBody, EmptyState, Icons } from "@/components/ui";
import type { LessonPlanContent, LessonPlanVersion } from "@/lib/artefacts/queries";

/**
 * Renders a plan's current text, inside the AI result container.
 *
 * The container is what sets `dir` and the FONT FAMILY from the draft's language,
 * not the interface's — so an Arabic plan opened in an English interface renders
 * right-to-left in the Arabic face. Nothing here decides direction; passing
 * `outputLanguage` down is the whole contract.
 *
 * The stages are rendered as an ordered sequence because the order IS the lesson.
 * Flip Education's finding applies: the arc is what makes a generated plan read
 * as authored rather than assembled, and a plan whose phases run backwards is
 * visible at a glance even when every individual step is correct.
 */

export interface PlanViewLabels {
  versionLabel: string;
  current: string;
  objectives: string;
  materials: string;
  stages: string;
  assessment: string;
  homework: string;
  minutes: string;
  emptyVersion: string;
  emptyTitle: string;
  emptyBody: string;
}

interface Props {
  content: LessonPlanContent | null;
  version: LessonPlanVersion | null;
  outputLanguage: "ar" | "en";
  locale: "ar" | "en";
  labels: PlanViewLabels;
  meta?: React.ReactNode;
}

const PHASE_LABEL: Record<string, { ar: string; en: string }> = {
  spark: { ar: "تهيئة", en: "Spark" },
  briefing: { ar: "تعريف", en: "Briefing" },
  action: { ar: "نشاط", en: "Action" },
  debrief: { ar: "تقويم ختامي", en: "Debrief" },
};

export function PlanView({ content, version, outputLanguage, locale, labels, meta }: Props) {
  const ar = outputLanguage === "ar";

  if (!content) {
    return (
      <Card>
        <EmptyState
          icon={<Icons.FileText size={24} />}
          title={labels.emptyTitle}
          description={labels.emptyBody}
        />
      </Card>
    );
  }

  const stages = content.stages ?? [];

  return (
    <AiResult
      outputLanguage={outputLanguage}
      locale={locale}
      draft
      draftLabel={ar ? "مسودة — راجعها قبل الاستخدام" : "Draft — review before you use it"}
      meta={
        <span className="flex flex-wrap items-center gap-s3">
          <span>{labels.versionLabel.replace("{n}", String(version?.versionNo ?? 1))}</span>
          {version?.source ? <span className="text-ink-muted">· {version.source}</span> : null}
          {meta}
        </span>
      }
    >
      <h2 className="text-xl font-semibold">{content.title}</h2>

      {content.objectives?.length ? (
        <section className="mt-s4">
          <h3 className="text-sm font-semibold text-ink-soft">{labels.objectives}</h3>
          <ul className="mt-s2 flex list-disc flex-col gap-s1 ps-s4 text-sm">
            {content.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {stages.length ? (
        <section className="mt-s4">
          <h3 className="text-sm font-semibold text-ink-soft">{labels.stages}</h3>
          <ol className="mt-s2 flex flex-col gap-s3">
            {stages.map((stage, i) => (
              <li key={i} className="border-s-2 border-line ps-s3">
                <div className="flex flex-wrap items-baseline gap-s2">
                  <span className="text-sm font-medium">{stage.name}</span>
                  {stage.phase && PHASE_LABEL[stage.phase] ? (
                    <span className="rounded-pill bg-surface-accent px-s2 text-xs text-purple">
                      {PHASE_LABEL[stage.phase][ar ? "ar" : "en"]}
                    </span>
                  ) : null}
                  <span className="text-xs text-ink-muted tnum">
                    {labels.minutes.replace("{n}", String(stage.minutes))}
                  </span>
                </div>
                <p className="mt-s1 text-sm text-ink-soft">{stage.description}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {content.materials?.length ? (
        <section className="mt-s4">
          <h3 className="text-sm font-semibold text-ink-soft">{labels.materials}</h3>
          <ul className="mt-s2 flex list-disc flex-col gap-s1 ps-s4 text-sm">
            {content.materials.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.assessment ? (
        <section className="mt-s4">
          <h3 className="text-sm font-semibold text-ink-soft">{labels.assessment}</h3>
          <p className="mt-s1 text-sm">{content.assessment}</p>
        </section>
      ) : null}

      {content.homework ? (
        <section className="mt-s4">
          <h3 className="text-sm font-semibold text-ink-soft">{labels.homework}</h3>
          <p className="mt-s1 text-sm">{content.homework}</p>
        </section>
      ) : null}
    </AiResult>
  );
}
