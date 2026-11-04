/**
 * LUMORA design tokens — the values that must exist as real strings in TS.
 *
 * TWO LAYERS, ONE VALUE EACH.
 *
 *   src/styles/tokens.css   the source for anything rendered in the browser —
 *                           colours, type, space, radius, shadow, motion. Every
 *                           component reads it through Tailwind classes or a
 *                           `var()`, never a literal.
 *   this file               the same brand values as plain strings, because two
 *                           consumers cannot read CSS: Next's `themeColor` and
 *                           the PWA web manifest. Neither can hold `var(--x)`.
 *
 * `scripts/check-tokens.mjs` parses tokens.css and asserts the two agree, so
 * this file cannot drift into being a second, quieter source of truth. Run it
 * with the other guards: `npm run check:tokens`.
 *
 * Accessibility: --lumora-gold fails WCAG 2.2 AA as text on a light surface, so
 * it is reserved for decorative accents, rules and icon fills. Every measured
 * pair is in DESIGN-SYSTEM.md.
 */

/** The five brand colours, plus the neutrals and system states. Hex only. */
export const brand = {
  /** Interactive actions, national accents. 4.6:1 on off-white. */
  navy: "#1D2A44",
  /** Creativity and educational accents. 8.0:1 on off-white. */
  purple: "#4B1E61",
  /** Interactive and national. 4.6:1 on off-white, 4.5:1 with a white label. */
  red: "#DA291C",
  /** Decorative only — fine rules, icon fills. Never text on a light surface. */
  gold: "#D4AF37",
  /** Page ground. */
  paper: "#F8F9FA",
  white: "#FFFFFF",
  /** Body copy and captions. */
  inkSoft: "#4F5871",
  inkMuted: "#6A7288",
  /** Hairlines. */
  line: "#E3E6EC",
  lineStrong: "#C9CFD9",
  /** Red darkens on hover; lightening would break the white label's contrast. */
  redHover: "#B82218",
  redActive: "#9E1D14",
} as const;

/** System states, permitted outside the brand palette by constitution §3.1. */
export const states = {
  success: "#1B7F4B",
  warning: "#9A6400",
  error: "#B3261E",
  info: "#1D4E89",
} as const;

/**
 * Landing-page extension tokens — OWNER-APPROVED for the landing page only
 * (2026-11-01). They deliberately permit on that surface what the base palette
 * forbids: gradients, translucent glass cards, gold buttons and accents, and a
 * purple-and-gold treatment.
 *
 * Every value is MEASURED from the owner's reference mockup, not chosen.
 * Sampling positions and the measurement method are in
 * docs/design/premium-brief.md. Do not round these to a "nicer" value — the
 * point is that they come from the artwork. No other page may use them.
 */
export const landing = {
  /** Headline ink. Measured: mockup headline set, x150-590 y195-250. */
  purple900: "#23033F",
  /** Highlighted card fill. Measured: mockup card 2 body, x715-745 y600-660. */
  purple800: "#2F0B49",
  /** Light tint ground (badge, chips, strip). Measured: strip x100-1300 y880-935. */
  lavender100: "#F5E9F4",
  /** Mid tint / hairline. Measured: strip upper band x1100-1300 y815-850. */
  lavender300: "#E7D1E5",
  /** Gold button ramp, top edge. Measured: mockup button (98,550). */
  gold300: "#FAD28F",
  /** Gold button ramp, mid. Measured: mockup button (98,570). */
  gold500: "#F1BD70",
  /** Gold button ramp, lower band. Measured: x100-120 y590-598. */
  gold700: "#E8AA57",
} as const;

/**
 * Radius and motion as numbers, because CSS cannot interpolate what Tailwind
 * needs to type-check. Kept in step with tokens.css by `check:tokens`.
 */
export const radius = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  pill: "999px",
} as const;

export const motion = {
  fast: "150ms",
  base: "200ms",
  slow: "250ms",
} as const;

/** Back-compat aliases. Remove once nothing imports them. */
export const tokens = {
  colors: {
    navy: brand.navy,
    purple: brand.purple,
    red: brand.red,
    gold: brand.gold,
    offWhite: brand.paper,
  },
  states,
  radius,
  motion,
} as const;

export type TokenColor = keyof typeof tokens.colors;
export type TokenState = keyof typeof tokens.states;
