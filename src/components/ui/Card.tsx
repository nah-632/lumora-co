import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/**
 * Card.
 *
 * 1px hairline border, one soft layered shadow, 16px radius, generous padding.
 * The shadow is `shadow-sm` — two layers, a tight contact shadow and a wider
 * ambient one — which is what reads as paper rather than as a grey blur. Colour
 * is never used for depth.
 *
 * ON THE SURFACE COLOUR, because the brief and DESIGN.md disagree.
 * The brief asks for an off-white card. The page ground is ALSO off-white, so an
 * off-white card on an off-white page has nothing to distinguish it but its
 * border — it stops reading as raised. DESIGN.md and the constitution both say
 * "white elevated cards" on an off-white ground.
 *
 * So `raised` (white) is the default and is what a card should be, and `muted`
 * exists for a card that genuinely sits on white. The value is a choice, not a
 * hard-coding, so either reading can be satisfied without touching this file.
 */

export type CardTone = "raised" | "muted" | "dark";
export type CardPadding = "none" | "sm" | "md" | "lg";

/**
 * Each tone sets `--card-fg` and `--card-fg-soft` on itself, and the sub-parts
 * read them.
 *
 * WHY THIS EXISTS: the first version hard-coded `text-ink` on CardTitle and
 * `text-ink-soft` on CardDescription. On the dark tone that put navy-grey text on
 * a navy ground — unreadable — and the only fix was for every CALLER to pass
 * `className="text-white"`, which is precisely the thing a design system is
 * supposed to remove. Rendering the dark card is what exposed it.
 */
const TONE: Record<CardTone, string> = {
  raised: "bg-surface-raised border-line [--card-fg:var(--text-primary)] [--card-fg-soft:var(--text-secondary)]",
  muted: "bg-surface-ground border-line [--card-fg:var(--text-primary)] [--card-fg-soft:var(--text-secondary)]",
  dark: "bg-surface-dark border-white/10 [--card-fg:var(--text-on-dark)] [--card-fg-soft:var(--text-on-dark-soft)]",
};

const PADDING: Record<CardPadding, string> = {
  none: "p-s0",
  sm: "p-s3",   /* 16px */
  md: "p-s4",   /* 24px */
  lg: "p-s5",   /* 32px */
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  padding?: CardPadding;
  /** Adds the hover lift. Only for a card that is itself clickable. */
  interactive?: boolean;
  /** A thin gold rule at the top. The signature accent, used sparingly —
   *  it is decoration, so it never replaces the border or carries meaning. */
  accentRule?: boolean;
  children?: ReactNode;
}

export function Card({
  tone = "raised",
  padding = "md",
  interactive = false,
  accentRule = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border shadow-sm",
        TONE[tone],
        PADDING[padding],
        interactive &&
          "transition-[transform,box-shadow] duration-base ease-out hover:-translate-y-0.5 hover:shadow-lg motion-reduce:hover:translate-y-0",
        className,
      )}
      {...rest}
    >
      {accentRule ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute start-s3 end-s3 -top-px h-px bg-gold"
        />
      ) : null}
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-start justify-between gap-s3", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-semibold text-[color:var(--card-fg)]", className)} {...rest}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-[color:var(--card-fg-soft)]", className)} {...rest}>
      {children}
    </p>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-s3", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-s4 flex items-center gap-s2", className)} {...rest}>
      {children}
    </div>
  );
}
