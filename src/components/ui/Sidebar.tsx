import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Desktop sidebar. Deep Navy ground, white icons and labels.
 *
 * The active item is marked by a RED inline-start bar plus a very slight white
 * wash. Red is the palette's "active" colour (DESIGN.md: "active nav underline"),
 * but a whole red row would read as a primary action and compete with the one
 * real primary button on the page.
 *
 * `inline-start` and not `left`: in Arabic the bar must sit on the right edge of
 * the row, and the gutter must mirror with it.
 *
 * The component holds no routing logic. It takes `activeHref` and renders — a
 * design-system primitive that imports the router is a primitive no other
 * surface can use, and it cannot be rendered in a test or a static preview.
 */

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
}

export interface SidebarProps {
  items: NavItem[];
  /** Which item is current. Compared against `href` exactly. */
  activeHref?: string;
  /** Brand block at the top — the supplied logo, never redrawn. */
  brand?: ReactNode;
  /** Rendered at the bottom, above the safe area. */
  footer?: ReactNode;
  /** Accessible name for the nav landmark. */
  label: string;
  className?: string;
}

export function Sidebar({ items, activeHref, brand, footer, label, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        // Hidden below lg: the phone gets BottomNav instead. One navigation at a
        // time — both at once would make the same destination reachable twice.
        "hidden lg:flex lg:sticky lg:top-s0 lg:h-screen w-sidebar shrink-0 flex-col",
        "bg-surface-dark text-white",
        className,
      )}
    >
      {brand ? <div className="px-s4 py-s4">{brand}</div> : null}

      <nav aria-label={label} className="flex-1 overflow-y-auto px-s2 py-s2">
        <ul className="flex flex-col gap-s1">
          {items.map((item) => {
            const active = item.href === activeHref;
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-s3 rounded-sm px-s3 py-s2 text-sm",
                    "transition-colors duration-fast ease-out",
                    active
                      ? "bg-white/10 text-white font-medium"
                      : "text-[var(--text-on-dark-soft)] hover:bg-white/5 hover:text-white",
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute start-s0 top-s1 bottom-s1 w-[3px] rounded-pill bg-red"
                    />
                  ) : null}
                  <span className="flex h-5 w-5 items-center justify-center">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined ? (
                    <span className="ms-auto rounded-pill bg-red px-s2 text-xs font-medium text-white tnum">
                      {item.badge}
                    </span>
                  ) : null}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {footer ? <div className="border-t border-[var(--border-dark)] p-s3">{footer}</div> : null}
    </aside>
  );
}
