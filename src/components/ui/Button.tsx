"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { Loader } from "./icons";

/**
 * Button.
 *
 * Colour rules from the constitution §3.1 and DESIGN.md:
 *   primary    Bahraini Red — the only colour permitted for a primary action.
 *   secondary  transparent, 1px navy border, navy text. Reads as a real control
 *              rather than a disabled primary.
 *   ghost      text only, for a third action in a row or a toolbar.
 *   dark       Deep Navy, for a sign-in or a dark surface.
 *
 * Two deliberate choices:
 *
 * 1. RED DARKENS ON HOVER, it does not lighten. Lightening `#DA291C` while the
 *    label stays white drops the pair below the 4.5:1 that a button label needs
 *    — the hover state would be the only state that fails AA, which is exactly
 *    the state a pointer user lives in. `#B82218` measures 6.1:1 with white.
 *
 * 2. NO PER-COMPONENT FOCUS RING. The global `:focus-visible` rule in
 *    globals.css already draws a 2px purple ring with a 2px offset. Repeating it
 *    here would let one component drift; omitting it means every control in the
 *    product focuses identically and changing the ring is a one-line change.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-red text-white shadow-xs hover:bg-[var(--action-primary-hover)] active:bg-[var(--action-primary-active)]",
  secondary:
    "bg-transparent text-navy border border-navy hover:bg-navy/5 active:bg-navy/10",
  ghost:
    "bg-transparent text-navy hover:bg-navy/5 active:bg-navy/10",
  dark:
    "bg-navy text-white shadow-xs hover:bg-navy/90 active:bg-navy/85",
  danger:
    "bg-danger text-white shadow-xs hover:brightness-90 active:brightness-85",
};

/**
 * `sm` is 40px, below the 44px touch minimum. It exists for dense desktop
 * toolbars and must never be the only way to reach an action on a phone.
 * `md` (44px) is the default precisely so the minimum is what you get by doing
 * nothing.
 */
const SIZE: Record<ButtonSize, string> = {
  sm: "h-10 px-s3 text-sm gap-s1",
  md: "h-11 px-s3 text-base gap-s2",
  lg: "h-12 px-s4 text-base gap-s2",
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction. The label stays, so the button
   *  does not change width mid-click and shift the layout under the pointer. */
  loading?: boolean;
  /** Renders an <a> instead. A link that looks like a button is still a link. */
  href?: string;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  href,
  iconStart,
  iconEnd,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const classes = cn(
    // A button label is a control label, never a paragraph: weight 500, never
    // letter-spaced in Arabic (the display face sets Arabic too).
    "inline-flex items-center justify-center rounded-sm font-medium",
    "transition-colors duration-fast ease-out",
    "aria-busy:cursor-wait disabled:cursor-not-allowed disabled:opacity-50",
    // Press feedback. Transform only — never a layout property.
    "active:scale-[0.98] motion-reduce:active:scale-100",
    VARIANT[variant],
    SIZE[size],
    fullWidth && "w-full",
    className,
  );

  // Icon size follows the control, so a small button does not carry a 24px glyph.
  const glyph = size === "lg" ? 20 : 16;

  const content = (
    <>
      {loading ? (
        <Loader size={glyph} />
      ) : (
        iconStart
      )}
      {children ? <span className="truncate">{children}</span> : null}
      {!loading && iconEnd}
    </>
  );

  if (href && !isDisabled) {
    return (
      <a href={href} className={classes} {...(rest as Record<string, unknown>)}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={classes} disabled={isDisabled} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}
