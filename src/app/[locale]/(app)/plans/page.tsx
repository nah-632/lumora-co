import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { listLessonPlans } from "@/lib/artefacts/queries";
import { Card, CardTitle, CardDescription, EmptyState, Icons } from "@/components/ui";

/**
 * Lesson plans.
 *
 * A list page, and the only interesting decision in it is that archived rows are
 * hidden by default. `archived` is the soft delete for artefacts — there is no
 * `deleted_at` on these tables — so showing them by default would make archiving
 * produce no visible change and the action would feel broken.
 *
 * The status filter is a set of links rather than a client control, because the
 * page is server-rendered and a link keeps the filter shareable, bookmarkable and
 * working without JavaScript. A segmented control here would be nicer to look at
 * and worse at everything else.
 */
export const dynamic = "force-dynamic";

const FILTERS = ["all", "draft", "ready", "archived"] as const;
type Filter = (typeof FILTERS)[number];

export default async function PlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = raw === "en" ? "en" : "ar";
  await requireUser(locale, `/${locale}/plans`);

  const sp = await searchParams;
  const status: Filter = FILTERS.includes(sp.status as Filter) ? (sp.status as Filter) : "all";

  const t = await getTranslations({ locale, namespace: "plans" });
  const plans = await listLessonPlans({ status, search: sp.q });

  const statusLabel: Record<Filter, string> = {
    all: t("statusAll"),
    draft: t("statusDraft"),
    ready: t("statusReady"),
    archived: t("statusArchived"),
  };

  return (
    <main className="mx-auto w-full max-w-container px-s4 py-s5 lg:px-s6">
      <header className="flex flex-col gap-s1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="max-w-prose text-sm text-ink-soft">{t("intro")}</p>
      </header>

      <nav aria-label={t("filterStatus")} className="mt-s4 flex flex-wrap gap-s2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/${locale}/plans${f === "all" ? "" : `?status=${f}`}`}
            aria-current={f === status ? "page" : undefined}
            className={
              f === status
                ? "rounded-pill bg-navy px-s4 py-s2 text-sm font-medium text-white"
                : "rounded-pill border border-line px-s4 py-s2 text-sm text-ink-soft hover:border-line-strong hover:text-navy"
            }
          >
            {statusLabel[f]}
          </Link>
        ))}
      </nav>

      {plans.length === 0 ? (
        <Card className="mt-s4">
          <EmptyState
            icon={<Icons.BookOpen size={24} />}
            title={t("empty")}
            description={t("emptyHint")}
            action={null}
          />
        </Card>
      ) : (
        <ul className="mt-s4 grid gap-s3 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Card interactive className="flex h-full flex-col">
                <CardTitle>
                  <Link href={`/${locale}/plans/${plan.id}`} className="hover:text-purple">
                    {plan.title}
                  </Link>
                </CardTitle>
                <CardDescription className="mt-s1">
                  {plan.grade} · {plan.subject}
                  {plan.term ? ` · ${plan.term}` : ""}
                </CardDescription>
                <p className="mt-s3 flex items-center gap-s2 text-xs text-ink-muted">
                  <span className="tnum">{t("columns.version")} {plan.currentVersionNo}</span>
                  {plan.methodologyName ? <span>· {plan.methodologyName}</span> : null}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
