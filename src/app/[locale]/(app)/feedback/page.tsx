import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { listFeedback } from "@/lib/artefacts/queries";
import { FeedbackQueue } from "@/features/artefacts/components/FeedbackQueue";

/**
 * The feedback queue — the approval gate.
 *
 * Only `staged` and `approved` are listed. `published` is deliberately absent
 * from this screen: it is a record of what a student received, not a queue, and
 * mixing it in would make the one list that asks for a decision into a list that
 * mostly does not.
 */
export const dynamic = "force-dynamic";

export default async function FeedbackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw === "en" ? "en" : "ar";
  await requireUser(locale, `/${locale}/feedback`);

  const t = await getTranslations({ locale, namespace: "feedback" });

  // RLS scopes both reads to the caller's own rows.
  const [staged, approved] = await Promise.all([listFeedback("staged"), listFeedback("approved")]);
  const queue = [...staged, ...approved];

  return (
    <main className="mx-auto w-full max-w-container px-s4 py-s5 lg:px-s6">
      <header className="flex flex-col gap-s1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="max-w-prose text-sm text-ink-soft">{t("intro")}</p>
      </header>

      <div className="mt-s5">
        <FeedbackQueue
          notes={queue}
          locale={locale}
          labels={{
            title: t("title"),
            intro: t("intro"),
            empty: t("empty"),
            emptyHint: t("emptyHint"),
            student: t("student"),
            styles: t.raw("styles") as Record<string, string>,
            sections: t.raw("sections") as Record<string, string>,
            gate: {
              stagedNotice: t("gate.stagedNotice"),
              approve: t("gate.approve"),
              approved: t("gate.approved"),
              publish: t("gate.publish"),
              discard: t("gate.discard"),
              confirmPublish: t("gate.confirmPublish"),
              confirmDiscard: t("gate.confirmDiscard"),
              invalidTransition: t("gate.invalidTransition"),
              genericError:
                locale === "ar" ? "تعذّر تنفيذ الإجراء. حاول مرة أخرى." : "That did not work. Try again.",
            },
          }}
        />
      </div>
    </main>
  );
}
