import type { Config } from "tailwindcss";
import { landing } from "./src/design/tokens";

/**
 * Tailwind reads the design tokens as CSS variables, not as copied hex values.
 *
 * `rgb(var(--x-rgb) / <alpha-value>)` is deliberate. Declaring a colour as
 * `var(--x)` alone works for `bg-navy` but silently breaks every opacity
 * modifier — `bg-navy/50` compiles to nothing and the element renders
 * transparent, which reads as a layout bug rather than a colour bug. The
 * triplets in tokens.css exist so the alpha channel stays available.
 *
 * Nothing here introduces a value. Every entry points at tokens.css.
 */

/** Colour with alpha support, sourced from a `--…-rgb` triplet. */
const rgb = (triplet: string) => `rgb(var(${triplet}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Brand — the five, locked */
        navy: rgb("--lumora-navy-rgb"),
        purple: rgb("--lumora-purple-rgb"),
        red: rgb("--lumora-red-rgb"),
        gold: rgb("--lumora-gold-rgb"),
        paper: rgb("--lumora-paper-rgb"),
        white: rgb("--lumora-white-rgb"),

        /* Neutrals — navy-tinted */
        ink: rgb("--lumora-ink-rgb"),
        "ink-soft": rgb("--lumora-ink-soft-rgb"),
        "ink-muted": rgb("--lumora-ink-muted-rgb"),
        line: rgb("--lumora-line-rgb"),
        "line-strong": rgb("--lumora-line-strong"),

        /* Semantic surfaces and text */
        surface: {
          ground: "var(--surface-ground)",
          raised: "var(--surface-raised)",
          sunken: "var(--surface-sunken)",
          dark: "var(--surface-dark)",
          accent: "var(--surface-accent-soft)",
        },

        /* System states */
        success: rgb("--state-success-rgb"),
        warning: rgb("--state-warning-rgb"),
        danger: rgb("--state-danger-rgb"),
        info: rgb("--state-info-rgb"),

        /* Landing-page extension — that surface only, owner-approved */
        "purple-900": landing.purple900,
        "purple-800": landing.purple800,
        "lavender-100": landing.lavender100,
        "lavender-300": landing.lavender300,
        "gold-300": landing.gold300,
        "gold-500": landing.gold500,
        "gold-700": landing.gold700,
      },

      fontFamily: {
        /* The Arabic face is listed first in every stack. See tokens.css §5. */
        sans: ["var(--font-latin)"],
        arabic: ["var(--font-arabic)"],
        latin: ["var(--font-latin)"],
        mono: ["var(--font-mono)"],
        display: ["var(--font-display)"],
      },

      fontSize: {
        xs: ["var(--text-xs)", { lineHeight: "var(--leading-normal)" }],
        sm: ["var(--text-sm)", { lineHeight: "var(--leading-normal)" }],
        base: ["var(--text-base)", { lineHeight: "var(--leading-normal)" }],
        lg: ["var(--text-lg)", { lineHeight: "var(--leading-snug)" }],
        xl: ["var(--text-xl)", { lineHeight: "var(--leading-snug)" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "var(--leading-tight)" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "var(--leading-tight)" }],
        "4xl": ["var(--text-4xl)", { lineHeight: "var(--leading-tight)" }],
      },

      /**
       * The strict 8px grid, as named steps.
       *
       * Tailwind's numeric scale is deliberately NOT overridden: the existing
       * landing page and tools UI use it, and silently redefining `p-3` would
       * shift every one of them. New components use these names, and
       * `scripts/check-design.mjs` refuses a numeric spacing utility inside
       * src/components/ui so the grid is kept by the build rather than by habit.
       */
      spacing: {
        s0: "var(--space-0)",
        s1: "var(--space-1)",
        s2: "var(--space-2)",
        s3: "var(--space-3)",
        s4: "var(--space-4)",
        s5: "var(--space-5)",
        s6: "var(--space-6)",
        s7: "var(--space-7)",
        s8: "var(--space-8)",
        s9: "var(--space-9)",
        s10: "var(--space-10)",
        s11: "var(--space-11)",
        sidebar: "var(--sidebar-width)",
        bottomnav: "var(--bottom-nav-height)",
        tap: "var(--tap-target-min)",
        container: "var(--container-max)",
      },

      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },

      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        focus: "var(--shadow-focus)",
        none: "none",
      },

      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },

      transitionTimingFunction: {
        out: "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
      },

      maxWidth: { container: "var(--container-max)" },

      zIndex: {
        raised: "var(--z-raised)",
        sticky: "var(--z-sticky)",
        drawer: "var(--z-drawer)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
      },
    },
  },
  plugins: [],
};

export default config;
