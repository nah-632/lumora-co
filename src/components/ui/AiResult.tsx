import type { HTMLAttributes, ReactNode } from "react";
import { documentAttributes, type Language } from "@/lib/direction";
import { cn } from "./cn";

/**
 * AI result container.
 *
 * THE ONE RULE THIS COMPONENT EXISTS TO ENFORCE: `dir` and `lang` come from the
 * language of the DRAFT, never from the interface locale.
 *
 * These are two independent things. A teacher reading an Arabic interface may
 * legitimately ask for an English lesson plan, and one reading English may ask
 * for an Arabic one. If the container inherited the page direction, an English
 * draft inside the Arabic interface would render its punctuation, its numerals
 * and any mixed sentence at the wrong end of the line — the text is correct and
 * reads as broken.
 *
 * The rule is not re-implemented here. It lives in `src/lib/direction.ts` as a
 * pure function, shared with the existing tools feature, so the two cannot
 * disagree. `locale` is passed through and deliberately unused; the prop exists
 * so a caller's omission is visible in the signature rather than silent.
 *
 * THE SECOND THING IT DOES: it sets the Arabic face for an Arabic draft even
 * when the page is English, and the Latin face for an English draft even when
 * the page is Arabic. `dir` alone is not enough — without the family, an Arabic
 * draft inside an English page inherits Inter, which has no Arabic coverage, and
 * the text falls back to whatever the device happens to have.
 *
 * `unicode-bidi: isolate` on the inner block stops a direction change here from
 * leaking into the surrounding layout (a long Arabic string can otherwise push
 * the page's scrollbar onto the wrong side).
 */

export interface AiResultProps extends HTMLAttributes<HTMLDivElement> {
  /** The language the MODEL wrote in. Not the interface language. */
  outputLanguage: Language;
  /** The interface language. Accepted so it is visibly not used for direction. */
  locale?: Language;
  /** Shown above the content: which tool produced it, when, which model. */
  meta?: ReactNode;
  /** Actions under the content — copy, print, refine, approve. */
  actions?: ReactNode;
  /** Marks the content as unreviewed machine output. Off when the teacher has
   *  edited it, because then it is theirs. */
  draft?: boolean;
  draftLabel?: string;
  children: ReactNode;
}

export function AiResult({
  outputLanguage,
  locale,
  meta,
  actions,
  draft = false,
  draftLabel = "مسودة — راجعها قبل الاستخدام",
  className,
  children,
  ...rest
}: AiResultProps) {
  const { dir, lang } = documentAttributes({ outputLanguage, locale });

  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface-raised shadow-sm",
        className,
      )}
      {...rest}
    >
      {(meta || draft) && (
        <div className="flex flex-wrap items-center justify-between gap-s3 border-b border-line px-s4 py-s3">
          <div className="text-xs text-ink-muted">{meta}</div>
          {draft ? (
            <span className="inline-flex items-center gap-s1 rounded-pill bg-surface-accent px-s3 py-s1 text-xs font-medium text-purple">
              {draftLabel}
            </span>
          ) : null}
        </div>
      )}

      {/*
        The document. `dir` and `lang` are set HERE and nowhere else, so a print
        stylesheet or a copy-to-clipboard that reads these attributes gets the
        draft's direction rather than the page's.
      */}
      <div
        dir={dir}
        lang={lang}
        data-output-language={outputLanguage}
        className={cn(
          "px-s4 py-s4",
          // The family follows the draft, not the page. See the note above.
          lang === "ar" ? "font-arabic" : "font-latin",
          lang === "ar" ? "leading-relaxed tracking-normal" : "leading-normal",
          "[unicode-bidi:isolate]",
        )}
      >
        {children}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-s2 border-t border-line px-s4 py-s3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
