import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { listLessonPlans, listFeedback, listAgents } from "@/lib/artefacts/queries";
import { Card, CardTitle, CardDescription, CardBody, EmptyState, Button, Icons } from "@/components/ui";

/**
 * The dashboard.
 *
 * The first screen of the day, and it is built from real rows only. It carries no
 * AI call, so it renders at the same speed whether or not a provider is
 * configured — a home screen that depends on a model being reachable is a home
 * screen that is sometimes blank.
 *
 * Student NAMES do appear here, because this is the teacher's own screen and RLS
 * scopes the query to their rows. They never reach a prompt; that rule lives in
 * the generation path, not here.
 */
export const dynamic = "force-dynamic";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw === "en" ? "en" : "ar";
  const user = await requireUser(locale, `/${locale}/dashboard`);

  const t = await getTranslations({ locale, namespace: "dashboard" });
  const tp = await getTranslations({ locale, namespace: "plans" });
  const ta = await getTranslations({ locale, namespace: "agents" });

  const [recentPlans, staged, agents] = await Promise.all([
    listLessonPlans({ status: "all", limit: 4 }),
    listFeedback("staged"),
    listAgents(),
  ]);

  const ar = locale === "ar";

  return (
    <main className="mx-auto w-full max-w-container px-s4 py-s5 lg:px-s6">
      <header className="flex flex-col gap-s1">
        <p className="text-sm text-ink-muted">{t("greeting")}</p>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        {user.email ? <p className="text-xs text-ink-muted">{user.email}</p> : null}
      </header>

      <div className="mt-s5 grid gap-s4 lg:grid-cols-3">
        {/* The one number that means "there is work waiting". */}
        <Card accentRule className="lg:col-span-2">
          <CardTitle>{t("stagedFeedback")}</CardTitle>
          <CardBody>
            <p className="text-3xl font-semibold tnum" aria-live="polite">
              {staged.length}
            </p>
            <p className="mt-s1 text-sm text-ink-soft">
              {t("stagedFeedbackCount", { count: staged.length })}
            </p>
          </CardBody>
          <div className="mt-s4">
            <Button href={`/${locale}/feedback`} iconEnd={<Icons.ArrowForward size={16} />}>
              {t("reviewFeedback")}
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle>{t("quickActions")}</CardTitle>
          <CardBody className="flex flex-col gap-s2">
            <Button href={`/${locale}/tools`} variant="secondary" size="sm" fullWidth>
              {t("newPlan")}
            </Button>
            <Button href={`/${locale}/methods`} variant="ghost" size="sm" fullWidth>
              {t("browseMethods")}
            </Button>
          </CardBody>
        </Card>
      </div>

      <section className="mt-s6">
        <div className="flex items-center justify-between gap-s3">
          <h2 className="text-lg font-semibold">{t("recentPlans")}</h2>
          <Link href={`/${locale}/plans`} className="text-sm text-purple hover:underline">
            {tp("title")}
          </Link>
        </div>

        {recentPlans.length === 0 ? (
          <Card className="mt-s3">
            <EmptyState
              icon={<Icons.BookOpen size={24} />}
              title={t("emptyTitle")}
              description={t("emptyBody")}
            />
          </Card>
        ) : (
          <ul className="mt-s3 grid gap-s3 sm:grid-cols-2">
            {recentPlans.map((plan) => (
              <li key={plan.id}>
                <Card interactive>
                  <CardTitle>
                    <Link href={`/${locale}/plans/${plan.id}`} className="hover:text-purple">
                      {plan.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="mt-s1">
                    {plan.grade} · {plan.subject}
                    {plan.methodologyName ? ` · ${plan.methodologyName}` : ""}
                  </CardDescription>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* The agents, and which of them can produce something a student sees
          without a human first. InstrucTwin's claim, made inspectable. */}
      {agents.length > 0 ? (
        <section className="mt-s6">
          <h2 className="text-lg font-semibold">{ta("title")}</h2>
          <p className="mt-s1 text-sm text-ink-muted">{ta("intro")}</p>
          <ul className="mt-s3 flex flex-col gap-s2">
            {agents.map((agent) => (
              <li key={agent.key}>
                <Card padding="sm">
                  <div className="flex flex-wrap items-center justify-between gap-s2">
                    <span className="text-sm font-medium">{ar ? agent.nameAr : agent.nameEn}</span>
                    <span
                      className={
                        agent.requiresHumanReview
                          ? "rounded-pill bg-surface-accent px-s3 py-s1 text-xs text-purple"
                          : "rounded-pill bg-success/10 px-s3 py-s1 text-xs text-success"
                      }
                    >
                      {agent.requiresHumanReview ? ta("requiresReview") : ta("noReview")}
                    </span>
                  </div>
                  <p className="mt-s1 text-xs text-ink-soft">{ar ? agent.purposeAr : agent.purposeEn}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
