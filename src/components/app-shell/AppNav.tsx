"use client";

import { usePathname } from "next/navigation";
import { Icons, Sidebar, BottomNav, type NavItem } from "@/components/ui";
import { signOutAction } from "@/lib/auth/actions";

/**
 * The authenticated app shell's navigation.
 *
 * A client component for one reason: `usePathname`. Everything else in the shell
 * is server-rendered, and inventing a prop the layout cannot know would mean
 * threading the current path down from every page — which is how a nav and a
 * router drift apart.
 *
 * FIVE ITEMS, AND WHY THESE FIVE. The whole point of the shell is that a teacher
 * can reach the four things the product does without a menu:
 *
 *   dashboard  what needs attention today
 *   plans      the lesson plans, versioned
 *   methods    the method catalogue
 *   feedback   the approval queue — the one place a queue can build up
 *   students   the existing roster
 *
 * Five is the ceiling for a bottom bar: six labels at 390px clip in Arabic, and
 * a clipped label is worse than a menu.
 *
 * The badge on «feedback» is the count of staged notes, passed in from the
 * layout. It is deliberately the only badge — a nav where three items shout is a
 * nav nobody reads.
 */

export interface AppNavLabels {
  navigation: string;
  bottomNavigation: string;
  signOut: string;
  dashboard: string;
  plans: string;
  methods: string;
  feedback: string;
  students: string;
  signedInAs: string;
}

export interface AppNavProps {
  locale: "ar" | "en";
  labels: AppNavLabels;
  teacherEmail: string;
  /** Staged feedback count. Drives the badge. */
  stagedCount: number;
  /** Brand block. The supplied mark, passed as a node so this file stays dumb. */
  brand: React.ReactNode;
}

export function AppNav({ locale, labels, teacherEmail, stagedCount, brand }: AppNavProps) {
  const pathname = usePathname() ?? "";
  const base = `/${locale}`;

  const items: NavItem[] = [
    { href: `${base}/dashboard`, label: labels.dashboard, icon: <Icons.Layers /> },
    { href: `${base}/plans`, label: labels.plans, icon: <Icons.BookOpen /> },
    { href: `${base}/methods`, label: labels.methods, icon: <Icons.ClipboardList /> },
    {
      href: `${base}/feedback`,
      label: labels.feedback,
      icon: <Icons.Check />,
      badge: stagedCount > 0 ? stagedCount : undefined,
    },
    { href: `${base}/students`, label: labels.students, icon: <Icons.Users /> },
  ];

  /**
   * Which item is current.
   *
   * A prefix match, not equality: `/plans/<id>` is still the plans section, and
   * an exact comparison would leave the nav with nothing highlighted on every
   * detail page — which reads as "you are nowhere".
   *
   * The root-like case is handled explicitly: `/ar` must not match everything.
   */
  const activeHref =
    items
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "";

  return (
    <>
      <Sidebar
        items={items}
        activeHref={activeHref}
        label={labels.navigation}
        brand={brand}
        footer={
          <form action={() => void signOutAction(locale)}>
            <button
              type="submit"
              className="flex w-full items-center gap-s2 rounded-sm px-s2 py-s2 text-start text-sm text-[var(--text-on-dark-soft)] transition-colors duration-fast hover:bg-white/5 hover:text-white"
            >
              <Icons.Close size={16} />
              <span className="truncate">{labels.signOut}</span>
            </button>
            <p className="mt-s2 truncate px-s2 text-xs text-[var(--text-on-dark-soft)]" title={teacherEmail}>
              {labels.signedInAs} {teacherEmail}
            </p>
          </form>
        }
      />

      <BottomNav items={items} activeHref={activeHref} label={labels.bottomNavigation} />
    </>
  );
}
