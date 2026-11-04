import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { Inbox } from "./icons";

/**
 * Empty state.
 *
 * One icon in a soft tinted disc, a short title, one sentence, and at most one
 * action. Not a large illustration with a paragraph under it, and never an
 * emoji — DESIGN.md and the constitution both forbid both.
 *
 * The text is `ink-muted` for the description, which is 4.9:1 on white and
 * therefore readable, and specifically NOT `gold`: gold fails AA as text on a
 * light surface, which is why it is decoration-only across this system.
 *
 * Never filler. An empty state says what is missing and what to do next, or it
 * is a lie about there being something to look at.
 */

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** One action. A second one is a decision the user has not been helped to make. */
  action?: ReactNode;
  /** Compact variant for a card or a side panel. */
  size?: "sm" | "md";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
  className,
  ...rest
}: EmptyStateProps) {
  const compact = size === "sm";

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        compact ? "gap-s2 py-s4" : "gap-s3 py-s8",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-pill bg-surface-accent text-purple",
          compact ? "h-10 w-10" : "h-12 w-12",
        )}
      >
        {icon ?? <Inbox size={compact ? 20 : 24} />}
      </span>

      <div className="flex flex-col gap-s1">
        <p className={cn("font-medium text-ink", compact ? "text-sm" : "text-base")}>{title}</p>
        {description ? (
          <p className={cn("max-w-[42ch] text-ink-muted", compact ? "text-xs" : "text-sm")}>
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="mt-s1">{action}</div> : null}
    </div>
  );
}
