/**
 * Direction and language attributes for a generated document.
 *
 * THE RULE: a document's direction comes from the DRAFT's language. The
 * interface locale is irrelevant to it. A teacher reading an Arabic interface
 * may ask for an English lesson plan and vice versa; both are ordinary, and
 * inheriting the page direction in the mismatched case renders punctuation,
 * numerals and any mixed sentence at the wrong end of the line.
 *
 * WHY THIS LIVES IN src/lib AND NOT IN THE FEATURE:
 * it was written inside src/features/tools, where it was first needed. The
 * design system now needs the same rule for its result container, and a UI
 * primitive importing from a feature would invert the dependency. The
 * implementation moved here unchanged; the old path re-exports it, so every
 * existing import keeps working and there is still exactly one implementation.
 *
 * It is a pure function on purpose: this is the rule most likely to be broken
 * by a well-meaning refactor, and a pure function can be tested across all four
 * interface/draft combinations instead of being checked by eye in two of them.
 */

export type Language = "ar" | "en";

export function directionFor(language: Language): "rtl" | "ltr" {
  return language === "ar" ? "rtl" : "ltr";
}

export interface DocumentAttributes {
  dir: "rtl" | "ltr";
  lang: Language;
}

/**
 * The attributes to place on the result container.
 *
 * `locale` is accepted so a caller can pass the interface locale without the
 * omission being silent, and it is deliberately unused: the signature documents
 * that the page language has no bearing on the document.
 */
export function documentAttributes({
  outputLanguage,
}: {
  outputLanguage: Language;
  locale?: Language;
}): DocumentAttributes {
  return { dir: directionFor(outputLanguage), lang: outputLanguage };
}

/**
 * Guesses the language of a draft from its own text.
 *
 * WHY THIS EXISTS: the result container must be told the draft's language, and
 * for a plan read back from the database there is no request to read it from —
 * the plan was written in a previous session. The alternative is a stored
 * `output_language` column, which is the right answer and is a schema change; this
 * is the interim, and it is deliberately conservative.
 *
 * It counts Arabic-block codepoints against Latin ones and returns `null` when
 * neither dominates, so the caller can fall back to the interface locale rather
 * than guessing. A wrong guess is worse than a fallback: the container would set
 * the wrong direction AND the wrong font family, and an Arabic plan rendered in a
 * Latin face is unreadable rather than merely odd.
 */
export function detectLanguage(text: string | null | undefined): Language | null {
  if (!text) return null;

  let arabic = 0;
  let latin = 0;

  for (const char of text) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    // Arabic, Arabic Supplement, Arabic Extended-A, Arabic Presentation Forms.
    if ((code >= 0x0600 && code <= 0x06ff) || (code >= 0x0750 && code <= 0x077f) ||
        (code >= 0x08a0 && code <= 0x08ff) || (code >= 0xfb50 && code <= 0xfdff) ||
        (code >= 0xfe70 && code <= 0xfeff)) {
      arabic += 1;
    } else if ((code >= 0x0041 && code <= 0x005a) || (code >= 0x0061 && code <= 0x007a)) {
      latin += 1;
    }
  }

  const total = arabic + latin;
  if (total < 8) return null; // too little signal to decide
  if (arabic / total >= 0.6) return "ar";
  if (latin / total >= 0.6) return "en";
  return null;
}
