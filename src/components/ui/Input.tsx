"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import { AlertTriangle } from "./icons";

/**
 * Input and Select.
 *
 * Navy focus ring via `.focus-navy` (see globals.css for why that differs from
 * the purple ring everywhere else).
 *
 * TWO RTL DETAILS THAT ARE EASY TO MISS:
 *
 * 1. Text inputs must NOT force a direction. A teacher typing a Latin URL or a
 *    number into an Arabic form needs the field to follow the content, and
 *    `dir="auto"` is what lets the browser decide per value. Forcing `dir="rtl"`
 *    on every input puts a pasted URL at the wrong end of the line.
 *
 * 2. The error text is tinted, never coloured-and-only-coloured. `danger` at
 *    #B3261E is 6.5:1 on white, so it passes as text, but colour alone is not
 *    the signal — the icon and `aria-invalid` carry it too, for anyone who
 *    cannot see the difference.
 *
 * The label is associated by id, not by wrapping, so a label click focuses the
 * field AND the label can sit in a different grid cell.
 */

const FIELD =
  "w-full rounded-sm border bg-surface-raised text-base text-ink placeholder:text-ink-muted " +
  "transition-colors duration-fast ease-out focus-navy " +
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted";

function stateClasses(invalid?: boolean) {
  return invalid
    ? "border-danger"
    : "border-line hover:border-line-strong";
}

export interface FieldShellProps {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error. Shared so the three never drift apart. */
function FieldShell({ id, label, hint, error, required, className, children }: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-s2", className)}>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required ? (
            <span className="text-danger ms-s1" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {children}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="flex items-center gap-s1 text-xs text-danger">
          <AlertTriangle size={16} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Trailing adornment, e.g. a unit. Positioned with logical properties. */
  suffix?: ReactNode;
  wrapperClassName?: string;
}

export function Input({
  label, hint, error, suffix, className, wrapperClassName, id, required, ...rest
}: InputProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const describedBy = [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
    .filter(Boolean)
    .join(" ");

  const control = (
    <input
      id={fieldId}
      // Never forced: a URL or a number typed into an Arabic form must be able
      // to set its own direction.
      dir="auto"
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy || undefined}
      className={cn(
        FIELD,
        // 44px, the touch minimum, and on the 8px grid.
        "h-11 px-s3",
        stateClasses(Boolean(error)),
        Boolean(suffix) && "pe-s6",
        className,
      )}
      {...rest}
    />
  );

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      {suffix ? (
        <div className="relative flex items-center">
          {control}
          <span className="pointer-events-none absolute end-s3 text-sm text-ink-muted">
            {suffix}
          </span>
        </div>
      ) : (
        control
      )}
    </FieldShell>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<InputHTMLAttributes<HTMLSelectElement>, "size" | "children"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: SelectOption[];
  /** Rendered as a disabled first option, so a select is never silently blank. */
  placeholder?: string;
  wrapperClassName?: string;
}

/**
 * A native <select>, styled.
 *
 * Not a custom listbox, deliberately. The native control is keyboard-operable,
 * screen-reader-correct, and renders as the platform's own picker on a phone —
 * which is what a teacher filling a form at 07:40 actually wants. A custom
 * listbox would cost a week and be worse on touch. The chevron is drawn over it
 * with `inset-inline-end`, so it sits on the correct side in both directions.
 */
export function Select({
  label, hint, error, options, placeholder, className, wrapperClassName, id, required, ...rest
}: SelectProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const describedBy = [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <div className="relative flex items-center">
        <select
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            FIELD,
            "h-11 appearance-none ps-s3 pe-s5",
            stateClasses(Boolean(error)),
            className,
          )}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute end-s3 text-ink-muted"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </FieldShell>
  );
}
