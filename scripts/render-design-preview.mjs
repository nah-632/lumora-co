/**
 * Renders the LUMORA design system to static HTML so it can be screenshotted.
 *
 * WHY A PREVIEW AND NOT THE APP: the real pages are behind an auth guard and the
 * result screen needs a live provider. This script renders the SAME components
 * with `react-dom/server` — it re-implements no markup — and compiles the real
 * Tailwind config against the real token file, so what is captured is what the
 * system produces.
 *
 * It also renders the components OUTSIDE the app shell deliberately: the design
 * system is what a component looks like on its own, at every state, in both
 * directions. That is the thing worth looking at before it is used.
 *
 * Run: node scripts/render-design-preview.mjs
 * Out: /tmp/design-preview/{en-ltr,ar-rtl}.html + preview.css + fonts/
 */
import { mkdirSync, writeFileSync, copyFileSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";

const OUT = "/tmp/design-preview";
mkdirSync(OUT, { recursive: true });
mkdirSync(`${OUT}/fonts`, { recursive: true });

/* Every font the tokens reference, copied next to the HTML. */
const FONT_FILES = readdirSync("public/fonts").filter((f) => f.endsWith(".woff2"));
for (const f of FONT_FILES) copyFileSync(`public/fonts/${f}`, `${OUT}/fonts/${f}`);

/* -------------------------------------------------------------------------- */
/* 1. Bundle the real components                                              */
/* -------------------------------------------------------------------------- */

const entry = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Button, Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter,
  Input, Select, SegmentedControl, EmptyState, AiResult, Sidebar, BottomNav,
  Icons,
} from "@/components/ui";

export { React, renderToStaticMarkup, Button, Card, CardHeader, CardTitle, CardDescription,
  CardBody, CardFooter, Input, Select, SegmentedControl, EmptyState, AiResult, Sidebar,
  BottomNav, Icons };
`;

writeFileSync(".design-preview-entry.jsx", entry);

await build({
  entryPoints: [".design-preview-entry.jsx"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: ".design-preview-bundle.mjs",
  alias: { "@": "./src" },
  loader: { ".jsx": "jsx" },
  jsx: "automatic",
  external: ["react", "react-dom", "react-dom/server"],
  logLevel: "warning",
});

const D = await import(`${process.cwd()}/.design-preview-bundle.mjs`);
const { React, renderToStaticMarkup } = D;
const h = React.createElement;

/* -------------------------------------------------------------------------- */
/* 2. Compile the real Tailwind config over the real components               */
/* -------------------------------------------------------------------------- */

/* globals.css is the input, not a bare set of @tailwind directives. It pulls in
   tokens.css through @import, which is what defines every custom property the
   utilities reference. Compiling the directives alone produces a stylesheet
   where every var(--…) is undefined — the page renders with no colour, no
   radius, no shadow and no layout, and it looks like Tailwind failed rather
   than like a missing import. */
/* The input stylesheet is ASSEMBLED, not @import-ed.
   Letting postcss-import resolve "tokens.css" from globals.css hangs the
   Tailwind CLI under this sandbox, and a build step that can hang is worse than
   one that concatenates two files. Order: tokens.css for the custom properties,
   then globals.css with its @import line stripped. Without tokens.css every
   var() is undefined and the page renders with no colour, no radius, no shadow
   and no layout — which looks like Tailwind failed rather than like a missing
   import. That is exactly what the first render showed. */
const tokensCss = readFileSync("src/styles/tokens.css", "utf8");
const globalsCss = readFileSync("src/styles/globals.css", "utf8").replace(/@import[^;]+;/, "");
writeFileSync(".design-preview-input.css", `${tokensCss}\n${globalsCss}\n`);

execFileSync(
  "node_modules/.bin/tailwindcss",
  [
    "-c", "tailwind.config.ts",
    "--content", "./src/components/ui/**/*.tsx,./.design-preview-entry.jsx",
    "-i", ".design-preview-input.css",
    "-o", `${OUT}/preview.css`,
  ],
  { stdio: "inherit" },
);

/* -------------------------------------------------------------------------- */
/* 3. The page                                                               */
/* -------------------------------------------------------------------------- */

function Section({ title, children }) {
  return h(
    "section",
    { className: "flex flex-col gap-s3" },
    h("h2", { className: "text-lg font-semibold text-ink border-b border-line pb-s2" }, title),
    h("div", { className: "flex flex-col gap-s4" }, children),
  );
}

function Row({ children }) {
  return h("div", { className: "flex flex-wrap items-center gap-s3" }, children);
}

function buildPage(locale) {
  const ar = locale === "ar";
  const L = (a, e) => (ar ? a : e);

  const navItems = [
    { href: "/", label: L("الرئيسية", "Home"), icon: h(D.Icons.Layers) },
    { href: "/students", label: L("الطلاب", "Students"), icon: h(D.Icons.Users), badge: 3 },
    { href: "/tools", label: L("الأدوات", "Tools"), icon: h(D.Icons.BookOpen) },
    { href: "/alerts", label: L("التنبيهات", "Alerts"), icon: h(D.Icons.Bell) },
    { href: "/settings", label: L("الإعدادات", "Settings"), icon: h(D.Icons.Settings) },
  ];

  return h(
    "div",
    { className: "flex min-h-screen" },
    // Sidebar (desktop only — it hides itself below lg)
    h(D.Sidebar, {
      items: navItems,
      activeHref: "/tools",
      label: L("التنقل الرئيسي", "Main navigation"),
      brand: h(
        "div",
        { className: "flex items-center gap-s2" },
        h("span", { className: "h-6 w-6 rounded-sm bg-red" }),
        h("span", { className: "text-base font-semibold tracking-normal" }, "LUMORA"),
      ),
    }),

    h(
      "main",
      { className: "flex-1 bg-surface-ground px-s4 py-s5 lg:px-s6" },
      h(
        "div",
        { className: "mx-auto flex max-w-container flex-col gap-s6" },

        h(
          Section,
          { title: L("الأزرار", "Buttons") },
          h(
            Row,
            null,
            h(D.Button, null, L("حفظ", "Save")),
            h(D.Button, { variant: "secondary" }, L("إلغاء", "Cancel")),
            h(D.Button, { variant: "ghost" }, L("تجاهل", "Dismiss")),
            h(D.Button, { variant: "dark" }, L("تسجيل الدخول", "Sign in")),
            h(D.Button, { variant: "danger" }, L("حذف", "Delete")),
          ),
          h(
            Row,
            null,
            h(D.Button, { size: "sm" }, L("صغير", "Small")),
            h(D.Button, { size: "md" }, L("افتراضي", "Default")),
            h(D.Button, { size: "lg" }, L("كبير", "Large")),
          ),
          h(
            Row,
            null,
            h(D.Button, { loading: true }, L("جارٍ التوليد", "Generating")),
            h(D.Button, { disabled: true }, L("معطّل", "Disabled")),
            h(
              D.Button,
              { variant: "secondary", iconStart: h(D.Icons.Plus) },
              L("إضافة طالب", "Add student"),
            ),
            h(
              D.Button,
              { variant: "secondary", iconEnd: h(D.Icons.ArrowForward) },
              L("التالي", "Next"),
            ),
          ),
        ),

        h(
          Section,
          { title: L("البطاقات", "Cards") },
          h(
            "div",
            { className: "grid gap-s4 md:grid-cols-3" },
            h(
              D.Card,
              { accentRule: true },
              h(
                D.CardHeader,
                null,
                h(D.CardTitle, null, L("خطة الدرس", "Lesson plan")),
              ),
              h(
                D.CardBody,
                null,
                h(
                  D.CardDescription,
                  null,
                  L(
                    "خلية النبات — الصف السابع، علوم، ٤٥ دقيقة.",
                    "The plant cell — Grade 7, Science, 45 minutes.",
                  ),
                ),
              ),
              h(D.CardFooter, null, h(D.Button, { size: "sm" }, L("فتح", "Open"))),
            ),
            h(
              D.Card,
              { tone: "muted" },
              h(D.CardHeader, null, h(D.CardTitle, null, L("بطاقة هادئة", "Muted card"))),
              h(
                D.CardBody,
                null,
                h(D.CardDescription, null, L("على خلفية بيضاء.", "Sits on white.")),
              ),
            ),
            h(
              D.Card,
              { tone: "dark" },
              h(D.CardHeader, null, h(D.CardTitle, null, L("داكنة", "Dark"))),
              h(
                D.CardBody,
                null,
                h(D.CardDescription, null, L("على سطح داكن.", "On a dark surface.")),
              ),
            ),
          ),
        ),

        h(
          Section,
          { title: L("الحقول", "Inputs and selects") },
          h(
            "div",
            { className: "grid gap-s4 md:grid-cols-2" },
            h(D.Input, {
              label: L("عنوان الدرس", "Lesson title"),
              placeholder: L("مثال: خلية النبات", "e.g. The plant cell"),
              hint: L("حتى ١٢٠ حرفًا.", "Up to 120 characters."),
            }),
            h(D.Input, {
              label: L("الدرجة", "Score"),
              defaultValue: "18",
              suffix: L("من ٢٠", "of 20"),
            }),
            h(D.Select, {
              label: L("المادة", "Subject"),
              placeholder: L("اختر المادة", "Choose a subject"),
              options: [
                { value: "science", label: L("العلوم", "Science") },
                { value: "math", label: L("الرياضيات", "Mathematics") },
              ],
            }),
            h(D.Input, {
              label: L("البريد", "Email"),
              defaultValue: "not-an-email",
              error: L("صيغة البريد غير صحيحة.", "That is not a valid email address."),
            }),
          ),
        ),

        h(
          Section,
          { title: L("المقطع المقسّم", "Segmented control") },
          h(D.SegmentedControl, {
            label: L("عرض النتيجة", "Result view"),
            value: "plan",
            onChange: () => {},
            segments: [
              { value: "plan", label: L("الخطة", "Plan") },
              { value: "questions", label: L("الأسئلة", "Questions") },
              { value: "remedial", label: L("العلاجي", "Remedial") },
            ],
          }),
        ),

        h(
          Section,
          { title: L("حالة فارغة", "Empty state") },
          h(
            D.Card,
            null,
            h(D.EmptyState, {
              title: L("لا توجد خطط بعد", "No lesson plans yet"),
              description: L(
                "أنشئ خطة درس ليظهر هنا سجلّك، ويمكنك الرجوع إليها في أي وقت.",
                "Create a lesson plan and your history appears here. You can come back to it any time.",
              ),
              action: h(D.Button, null, L("إنشاء خطة", "Create a plan")),
            }),
          ),
        ),

        /* The direction case that this component exists for: the interface is
           one language and the draft is the other. */
        h(
          Section,
          {
            title: L(
              "حاوية نتيجة الذكاء الاصطناعي — الاتجاه يتبع لغة المسودة لا الواجهة",
              "AI result container — direction follows the DRAFT, not the interface",
            ),
          },
          h(
            D.AiResult,
            {
              outputLanguage: ar ? "en" : "ar",
              locale,
              draft: true,
              draftLabel: L("مسودة — راجعها", "Draft — review it"),
              meta: L(
                "وُلّدت الآن · نص عربي داخل واجهة إنجليزية",
                "Generated just now · Arabic text inside an English interface",
              ),
              actions: h(
                React.Fragment,
                null,
                h(D.Button, { size: "sm" }, L("نسخ", "Copy")),
                h(D.Button, { size: "sm", variant: "secondary" }, L("تعديل", "Edit")),
              ),
            },
            h("h3", { className: "text-lg font-semibold" }, ar ? "The plant cell" : "خلية النبات"),
            h(
              "p",
              { className: "mt-s2 text-sm" },
              ar
                ? "Students will identify the main parts of a plant cell and explain the function of each. This paragraph is set in Latin because the draft is English, even though the interface around it is Arabic."
                : "يتعرّف الطالب على الأجزاء الرئيسية لخلية النبات، ويشرح وظيفة كل جزء. النص هنا بالعربية لأن المسودة عربية، رغم أن الواجهة حولها بالإنجليزية.",
            ),
            h(
              "p",
              { className: "mt-s2 text-sm" },
              ar ? "الزمن: 45 min · الصف: Grade 7" : "الزمن: ٤٥ دقيقة · الصف: السابع",
            ),
          ),
        ),
      ),
    ),

    h(D.BottomNav, {
      items: navItems,
      activeHref: "/tools",
      label: L("التنقل السفلي", "Bottom navigation"),
    }),
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Fonts, then the documents                                              */
/* -------------------------------------------------------------------------- */

const fontFace = `
@font-face{font-family:"PlexAr";src:url(fonts/plexarabic-400-arabic.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"PlexAr";src:url(fonts/plexarabic-500-arabic.woff2) format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:"PlexAr";src:url(fonts/plexarabic-600-arabic.woff2) format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"PlexAr";src:url(fonts/plexarabic-700-arabic.woff2) format("woff2");font-weight:700;font-display:swap}
@font-face{font-family:"InterVar";src:url(fonts/inter-variable-latin.woff2) format("woff2");font-weight:300 600;font-display:swap}
@font-face{font-family:"PlexMono";src:url(fonts/plexmono-400-latin.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"PlexMono";src:url(fonts/plexmono-500-latin.woff2) format("woff2");font-weight:500;font-display:swap}
:root{
  --font-text-ar:"PlexAr";
  --font-text-lat:"InterVar";
  --font-mono-lat:"PlexMono";
  --font-display-ar:"PlexAr";
  --font-display-lat:"InterVar";
}
`;

for (const locale of ["en", "ar"]) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LUMORA design system — ${locale}</title>
<style>${readFileSync(`${OUT}/preview.css`, "utf8")}</style>
<style>${fontFace}</style>
</head>
<body>${renderToStaticMarkup(buildPage(locale))}</body>
</html>`;
  writeFileSync(`${OUT}/${locale}-${dir}.html`, html);
}


console.log(`wrote ${OUT}/en-ltr.html and ${OUT}/ar-rtl.html`);
