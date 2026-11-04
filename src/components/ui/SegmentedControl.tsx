"use client";

import { useId, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Segmented control.
 *
 * The Brisk idea, applied properly: a small set of mutually exclusive views
 * (نتائج / خطة / أسئلة) that swaps content in place instead of navigating. The
 * active segment is a soft tinted pill on a sunken track — not a filled red
 * button. A filter is not a primary action and must not look like one, or every
 * screen ends up with two things competing to be "the" button.
 *
 * ON "PILLS": DESIGN.md says "no pill buttons". This is not a button — it is a
 * segmented track, and the pill radius is what makes the active segment read as
 * a selected region rather than a stack of rectangles. The distinction is
 * deliberate and recorded in DESIGN-SYSTEM.md §6.
 *
 * ACCESSIBILITY: this is a real ARIA radiogroup, not a row of buttons with a
 * highlight. Arrow keys move between segments, only the active one is in the tab
 * order, and Home/End jump to the ends — which is what a keyboard user expects
 * from something that looks like this. A row of <button>s would tab through
 * every option one at a time.
 */

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group. Required: a group of unlabelled options
   *  announces as nothing in a screen reader. */
  label: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  label,
  size = "md",
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  const enabled = segments.filter((s) => !s.disabled);
  const currentIndex = enabled.findIndex((s) => s.value === value);

  const move = (delta: number) => {
    if (enabled.length === 0) return;
    const next = (currentIndex + delta + enabled.length) % enabled.length;
    const segment = enabled[next];
    if (segment) onChange(segment.value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex items-center rounded-pill border border-line bg-surface-sunken p-s1",
        fullWidth && "flex w-full",
        className,
      )}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          // ArrowRight means "next" visually in RTL. The browser reports the
          // physical key, so the mapping is inverted for RTL rather than left to
          // chance — otherwise the arrows run backwards in Arabic.
          const rtl = typeof document !== "undefined" && document.dir === "rtl";
          e.preventDefault();
          move(e.key === "ArrowRight" ? (rtl ? -1 : 1) : rtl ? -1 : 1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          const rtl = typeof document !== "undefined" && document.dir === "rtl";
          e.preventDefault();
          move(e.key === "ArrowLeft" ? (rtl ? 1 : -1) : rtl ? 1 : -1);
        } else if (e.key === "Home") {
          e.preventDefault();
          const first = enabled[0];
          if (first) onChange(first.value);
        } else if (e.key === "End") {
          e.preventDefault();
          const last = enabled[enabled.length - 1];
          if (last) onChange(last.value);
        }
      }}
    >
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role="radio"
            id={`${groupId}-${segment.value}`}
            aria-checked={selected}
            disabled={segment.disabled}
            // Roving tabindex: one stop for the whole group.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(segment.value)}
            className={cn(
              "relative inline-flex items-center justify-center rounded-pill font-medium",
              "transition-colors duration-fast ease-out",
              "disabled:cursor-not-allowed disabled:opacity-40",
              size === "sm" ? "h-8 px-s3 text-sm" : "h-10 px-s4 text-sm",
              fullWidth && "flex-1",
              selected
                ? // The soft active background. Purple at 8% is the palette's own
                  // tint, so it cannot drift from the brand.
                  "bg-surface-raised text-navy shadow-xs"
                : "text-ink-soft hover:text-navy",
            )}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
