import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { listMethodologies } from "@/lib/artefacts/queries";
import { MethodBrowser } from "@/features/artefacts/components/MethodBrowser";

/**
 * The method catalogue.
 *
 * Server-fetched, client-filtered. The catalogue is reference data that RLS
 * restricts to approved rows, and it is small enough to send whole — filtering it
 * over the network would make every facet click a round trip for no benefit.
 *
 * The suggestions are passed through from the API's own constant rather than
 * duplicated here, so the three worked examples exist once.
 */
export const dynamic = "force-dynamic";

const SUGGESTIONS = [
  { situationKey: "everyoneSpeaks", methodologySlug: "chalk-talk", reasonKey: "everyoneSpeaks" },
  { situationKey: "denseContent", methodologySlug: "jigsaw", reasonKey: "denseContent" },
  { situationKey: "examineEvidence", methodologySlug: "document-mystery", reasonKey: "examineEvidence" },
];

export default async function MethodsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw === "en" ? "en" : "ar";
  await requireUser(locale, `/${locale}/methods`);

  const t = await getTranslations({ locale, namespace: "methods" });
  const methods = await listMethodologies();

  return (
    <main className="mx-auto w-full max-w-container px-s4 py-s5 lg:px-s6">
      <header className="flex flex-col gap-s1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="max-w-prose text-sm text-ink-soft">{t("intro")}</p>
      </header>

      <div className="mt-s5">
        <MethodBrowser
          methods={methods}
          suggestions={SUGGESTIONS}
          locale={locale}
          labels={{
            browse: t("browse"),
            featured: t("featured"),
            empty: t("empty"),
            emptyHint: t("emptyHint"),
            filters: {
              group: t("filters.group"),
              duration: t("filters.duration"),
              all: t("filters.all"),
              wholeClass: t("filters.wholeClass"),
              smallGroups: t("filters.smallGroups"),
              pairsIndividual: t("filters.pairsIndividual"),
              under15: t("filters.under15"),
              "15to30": t("filters.15to30"),
              over30: t("filters.over30"),
            },
            card: {
              duration: t("card.duration"),
              groupSize: t("card.groupSize"),
              use: t("card.use"),
            },
            helper: { title: t("helper.title"), intro: t("helper.intro") },
            situations: t.raw("situations") as Record<string, string>,
            reasons: t.raw("reasons") as Record<string, string>,
            suggested: t("helper.title"),
          }}
        />
      </div>
    </main>
  );
}
