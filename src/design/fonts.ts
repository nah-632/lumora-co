import localFont from "next/font/local";

/**
 * Typefaces, self-hosted. No request leaves the build or the browser for
 * fonts.googleapis.com.
 *
 * Until now these came from `next/font/google`, which fetches the CSS and the
 * woff2 files at BUILD time. That made the production build depend on Google
 * being reachable from CI: one transient fetch failure failed the whole build
 * job with `An error occurred in next/font … Cannot read properties of null`,
 * which is what a self-hosted font cannot do.
 *
 * ---------------------------------------------------------------------------
 * WHY FOUR INSTANCES AND NOT TWO
 *
 * The Arabic and Latin subsets are separate files (that is how Google ships
 * them), and a subset file does not contain the other script's glyphs. Pointing
 * one family at both and hoping the browser sorts it out is exactly the bug that
 * made headings unreadable earlier in this project: a Latin face claimed Arabic
 * codepoints and rendered them with colliding, unjoined letters.
 *
 * So each subset is its own family, and the CSS simply lists them in order:
 * the Arabic family first for Arabic, which falls through to the Latin family
 * only for characters it does not contain. Per-glyph fallback does the work that
 * `unicode-range` did in the hand-written @font-face blocks, without hand-writing
 * them.
 *
 * Weights in use stay three: 400 body, 500 label/button, 600-700 display.
 * `display: "swap"` on every face, so text paints immediately in the fallback and
 * reflows once — never invisible text.
 */

const displayAr = localFont({
  src: [
    { path: "../../public/fonts/elmessiri-500-arabic.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/elmessiri-600-arabic.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/elmessiri-700-arabic.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-display-ar",
  fallback: ["Noto Naskh Arabic", "serif"],
});

const displayLat = localFont({
  src: [
    { path: "../../public/fonts/elmessiri-500-latin.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/elmessiri-600-latin.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/elmessiri-700-latin.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-display-lat",
  fallback: ["Georgia", "serif"],
});

const textAr = localFont({
  src: [
    { path: "../../public/fonts/plexarabic-400-arabic.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/plexarabic-500-arabic.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/plexarabic-600-arabic.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/plexarabic-700-arabic.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-text-ar",
  fallback: ["Noto Naskh Arabic", "sans-serif"],
});

/**
 * Latin text face — Inter, per the design-system brief (2026-11-04).
 *
 * ONE FILE, FOUR WEIGHTS. Inter is served as a variable font, so `weight` is a
 * RANGE rather than a list. Declaring four entries against the same file would
 * make next/font emit four identical @font-face rules and the browser would
 * instance the wrong one; the range is what makes 300/400/500/600 actually
 * differ. Verified by reading the `fvar` table out of the woff2 before wiring
 * it — see DESIGN-SYSTEM.md §2.
 *
 * WHY THE PREVIOUS FACE WAS SWAPPED OUT, AND HOW TO SWAP IT BACK.
 * This used to be IBM Plex Sans (plexlatin-*.woff2), chosen so a mixed
 * Arabic/Latin line kept one Plex skeleton. DESIGN.md and the design skill both
 * list Inter under "Never". The brief for this work mandates it, so it is in —
 * but the Plex Latin files are left in /public/fonts and reverting is this
 * single `localFont` call. See DESIGN-SYSTEM.md §2, open question 1.
 *
 * Crucially, Inter has NO Arabic coverage, so it can never render Arabic. The
 * Arabic family stays first in every stack (tokens.css) and per-glyph fallback
 * only reaches Inter for codepoints the Arabic face does not contain. That is
 * the exact failure this project was bitten by before: a Latin face claiming
 * Arabic codepoints and rendering colliding, unjoined letters.
 */
const textLat = localFont({
  src: [
    { path: "../../public/fonts/inter-variable-latin.woff2", weight: "300 600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-text-lat",
  fallback: ["Segoe UI", "system-ui", "sans-serif"],
});

/**
 * Mono — IBM Plex Mono, for code, identifiers and any column that must align.
 *
 * A third family, which the constitution's §3.2 "at most two families" does not
 * cover. It is here because the brief asks for it and because tabular numerals
 * in a data grid genuinely need it. It is used for `code`, `.tnum` contexts and
 * nothing else — it must never set body copy. See DESIGN-SYSTEM.md §2, open
 * question 3.
 */
const mono = localFont({
  src: [
    { path: "../../public/fonts/plexmono-400-latin.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/plexmono-500-latin.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-mono-lat",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});

/**
 * The shape the layout already consumes. Two class names per export, so the root
 * element carries five font variables and `globals.css` composes the stacks.
 *
 * `text` now spans the Latin body face, the Arabic body face AND the mono face,
 * because all three are needed wherever text is rendered — including inside the
 * AI result container, where an Arabic draft in an English interface must still
 * be able to set Latin terms and numerals in the right family.
 */
export const display = { variable: `${displayAr.variable} ${displayLat.variable}` };
export const text = { variable: `${textAr.variable} ${textLat.variable} ${mono.variable}` };