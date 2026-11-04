import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { LumoraMark } from "@/components/brand/LumoraMark";
import { BottomNavSpacer } from "@/components/ui";
import { AppNav } from "@/components/app-shell/AppNav";
import { loadShellCounts } from "./counts";

/**
 * The authenticated shell.
 *
 * WHY A ROUTE GROUP `(app)`: the layout applies to the sections that share the
 * sidebar-and-bottom-nav chrome, and to nothing else. The legal pages, the
 * landing page and the auth pages are outside it, so none of them pays for a nav
 * they do not show.
 *
 * WHY THE GUARD IS HERE as well as on each page: a layout is not a security
 * boundary in Next — it does not run for a route that does not use it — so this
 * is a convenience, and every page under it calls `requireUser` too. Relying on
 * the layout alone would leave a page one refactor away from being public.
 *
 * The shell is deliberately thin. It holds navigation and the content frame; it
 * fetches no page data, because a layout that queries is a layout that makes
 * every route dynamic and slows every navigation.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";

  const user = await requireUser(locale, `/${locale}/dashboard`);
  const t = await getTranslations({ locale, namespace: "appShell" });
  // The section labels come from the existing `nav` namespace rather than a
  // second one for the same idea.
  const tn = await getTranslations({ locale, namespace: "nav" });

  // One cheap aggregate for the badge. Returns 0 rather than throwing when the
  // table is unreachable, so a nav badge can never take down the whole shell.
  const counts = await loadShellCounts();

  return (
    <div className="flex min-h-screen">
      <AppNav
        locale={locale}
        teacherEmail={user.email ?? ""}
        stagedCount={counts.stagedFeedback}
        brand={<LumoraMark locale={locale} href={`/${locale}/dashboard`} size={32} />}
        labels={{
          navigation: t("navigation"),
          bottomNavigation: t("bottomNavigation"),
          signOut: t("signOut"),
          signedInAs: t("signedInAs"),
          dashboard: tn("dashboard"),
          plans: tn("plans"),
          methods: tn("methods"),
          feedback: tn("feedback"),
          students: tn("students"),
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {children}
        {/* Clears the fixed bottom bar on phones. Exported by the nav rather
            than left to each page to remember. */}
        <BottomNavSpacer />
      </div>
    </div>
  );
}
