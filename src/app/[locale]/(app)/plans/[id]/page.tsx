import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { getLessonPlan } from "@/lib/artefacts/queries";
import { detectLanguage } from "@/lib/direction";
import { Card, CardTitle, CardBody, Icons } from "@/components/ui";
import { PlanView } from "@/features/artefacts/components/PlanView";
import { AdjustPanel } from "@/features/artefacts/components/AdjustPanel";

/**
 * One lesson plan: the text, its history, and the panel that changes it.
 *
 * THE LAYOUT IS THE ARGUMENT. The current text is the page; the adjust panel is
 * beside it, not behind a modal, because "change this" and "read this" are the
 * same activity and a teacher moves between them several times in a minute.
 *
 * The version list is shown in full rather than behind a "history" toggle. That
 * is deliberate: the value of versioning is that a teacher TRUSTS they can get
 * their previous wording back, and that trust comes from seeing the list.
 */
export const dynamic = "force-dynamic";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = raw === "en" ? "en" : "ar";
  await requireUser(locale, `/${locale}/plans/${id}`);

  const plan = await getLessonPlan(id);
  if (!plan) notFound();

  const t = await getTranslations({ locale, namespace: "plans" });
  const td = await getTranslations({ locale, namespace: "plans.detail" });
  const ta = await getTranslations({ locale, namespace: "plans.adjust" });

  const current = plan.versions.find((v) => v.versionNo === plan.currentVersionNo) ?? plan.versions[0] ?? null;

  /**
   * The draft's language, not the interface's.
   *
   * Detected from the plan's own text because there is no `output_language`
   * column yet; when the detection is not confident (`null`) it falls back to the
   * interface locale rather than guessing, since a wrong guess sets both the wrong
   * direction and the wrong font family.
   */
  const detected = detectLanguage(
    [current?.content?.title, current?.content?.assessment, current?.content?.homework]
      .filter(Boolean)
      .join(" "),
  );
  const outputLanguage: "ar" | "en" = detected ?? locale;

  const adjustLabels = {
    title: ta("title"),
    intro: ta("intro"),
    kindLabel: ta("kind"),
    kinds: ta.raw("kinds") as Record<string, string>,
    valueLabel: ta("value"),
    sectionLabel: ta("section"),
    instructionLabel: ta("instruction"),
    instructionHint: ta("instructionHint"),
    apply: ta("apply"),
    applying: ta("applying"),
    conflict: ta("conflict"),
    values: ta.raw("values") as Record<string, string>,
    genericError: locale === "ar" ? "تعذّر التعديل. حاول مرة أخرى." : "That adjustment did not work. Try again.",
  };

  return (
    <main className="mx-auto w-full max-w-container px-s4 py-s5 lg:px-s6">
      <nav className="flex items-center gap-s1 text-sm text-ink-muted">
        <Link href={`/${locale}/plans`} className="flex items-center gap-s1 hover:text-navy">
          <Icons.ChevronBack size={16} />
          {t("title")}
        </Link>
      </nav>

      <header className="mt-s3 flex flex-wrap items-start justify-between gap-s3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{plan.title}</h1>
          <p className="mt-s1 text-sm text-ink-soft">
            {plan.grade} · {plan.subject}
            {plan.term ? ` · ${plan.term}` : ""} · {plan.methodologyName ?? td("noMethodology")}
          </p>
        </div>
        <span className="rounded-pill border border-line px-s3 py-s1 text-xs text-ink-soft">
          {td("versionLabel").replace("{n}", String(plan.currentVersionNo))}
        </span>
      </header>

      <div className="mt-s5 grid gap-s4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-s4">
          <PlanView
            content={current?.content ?? null}
            version={current}
            outputLanguage={outputLanguage}
            locale={locale}
            labels={{
              versionLabel: td("versionLabel"),
              current: td("current"),
              objectives: td("objectives"),
              materials: td("materials"),
              stages: td("stages"),
              assessment: td("assessment"),
              homework: td("homework"),
              minutes: td("minutes"),
              emptyVersion: td("emptyVersion"),
              emptyTitle: t("empty"),
              emptyBody: t("emptyHint"),
            }}
          />
        </div>

        <div className="flex flex-col gap-s4">
          <AdjustPanel
            planId={plan.id}
            baseVersionNo={plan.currentVersionNo}
            outputLanguage={outputLanguage}
            locale={locale}
            labels={adjustLabels}
          />

          <Card>
            <CardTitle>{td("history")}</CardTitle>
            <p className="mt-s1 text-xs text-ink-muted">{td("historyHint")}</p>
            <CardBody>
              <ol className="flex flex-col gap-s2">
                {plan.versions.map((v) => {
                  const isCurrent = v.versionNo === plan.currentVersionNo;
                  return (
                    <li
                      key={v.versionNo}
                      className="flex items-center justify-between gap-s2 border-b border-line pb-s2 last:border-b-0 last:pb-s0"
                    >
                      <span className="flex items-center gap-s2 text-sm">
                        <span className="tnum">{td("versionLabel").replace("{n}", String(v.versionNo))}</span>
                        <span className="text-xs text-ink-muted">{v.source}</span>
                        {v.refinementKind ? (
                          <span className="text-xs text-purple">{adjustLabels.kinds[v.refinementKind] ?? v.refinementKind}</span>
                        ) : null}
                      </span>
                      {isCurrent ? (
                        <span className="rounded-pill bg-surface-accent px-s2 py-s1 text-xs text-purple">
                          {td("current")}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </main>
  );
}
