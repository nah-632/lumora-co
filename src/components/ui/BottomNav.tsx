import type { ReactNode } from "react";
import { cn } from "./cn";
import type { NavItem } from "./Sidebar";

/**
 * Phone bottom navigation. Off-White ground, navy icons, red active state.
 *
 * EVERY TARGET IS AT LEAST 44px. That is not a nicety on a phone: a nav row is
 * the one place a mis-tap sends someone to the wrong screen, and thumbs are not
 * pointers.
 *
 * The safe-area inset is included rather than left to the page. On an iPhone the
 * home indicator sits exactly where the last 34px of this bar would be, and a
 * bottom nav without `env(safe-area-inset-bottom)` has its labels under it.
 *
 * The active state is red ICON AND LABEL on the off-white ground, which measures
 * 4.6:1. It is not a red-filled pill: a filled pill reads as a selected filter,
 * and it would put a large red mass at the bottom of every screen.
 */

export interface BottomNavProps {
  items: NavItem[];
  activeHref?: string;
  label: string;
  className?: string;
}

export function BottomNav({ items, activeHref, label, className }: BottomNavProps) {
  return (
    <nav
      aria-label={label}
      className={cn(
        // lg:hidden — the sidebar takes over from here up.
        "lg:hidden fixed inset-x-s0 bottom-s0 z-sticky",
        "border-t border-line bg-surface-raised",
        "pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      <ul className="flex items-stretch">
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <li key={item.href} className="flex-1">
              <a
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-tap flex-col items-center justify-center gap-s1 px-s1 py-s2",
                  "text-xs transition-colors duration-fast ease-out",
                  active ? "text-red font-medium" : "text-navy/70 hover:text-navy",
                )}
              >
                <span className="relative flex h-6 w-6 items-center justify-center">
                  {item.icon}
                  {item.badge !== undefined ? (
                    <span className="absolute -top-s1 -end-s1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-red px-s1 text-[10px] font-medium leading-none text-white tnum">
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                <span className="truncate">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The spacer a page needs under its content so the last row is not hidden behind
 * the bar. Exported rather than left to each page to remember.
 */
export function BottomNavSpacer({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("lg:hidden h-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))]", className)}
    />
  );
}
