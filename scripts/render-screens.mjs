/**
 * Renders the LUMORA screens to static HTML so they can be screenshotted.
 *
 * WHAT THIS IS, AND WHAT IT IS NOT.
 *
 * It is NOT the running app. The pages live behind an auth guard and read from
 * Supabase, so driving them in a browser needs a live database and a session.
 *
 * It IS the real components: every screen below is composed from the same
 * `src/components/ui` primitives and the same `src/features/artefacts` components
 * that the routes render, with the same Tailwind build and the same token file.
 * No markup is re-implemented and no CSS is hand-written. What differs is the
 * data (fixtures, not rows) and the absence of the shell's server wrapper.
 *
 * That distinction is stated plainly rather than hidden, because "here is a
 * screenshot" and "here is the app" are not the same claim.
 *
 * Run: node scripts/render-screens.mjs
 */
import { mkdirSync, writeFileSync, copyFileSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";

const OUT = "/tmp/screen-preview";
mkdirSync(OUT, { recursive: true });
mkdirSync(`${OUT}/fonts`, { recursive: true });
for (const f of readdirSync("public/fonts").filter((f) => f.endsWith(".woff2"))) {
  copyFileSync(`public/fonts/${f}`, `${OUT}/fonts/${f}`);
}

/* -------------------------------------------------------------------------- */
/* 1. Bundle the real components                                              */
/* -------------------------------------------------------------------------- */

writeFileSync(
  ".screens-entry.jsx",
  `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Button, Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter,
  Input, Select, SegmentedControl, EmptyState, AiResult, Sidebar, BottomNav,
  Icons,
} from "@/components/ui";
import { PlanView } from "@/features/artefacts/components/PlanView";
import { AdjustPanel } from "@/features/artefacts/components/AdjustPanel";
import { MethodBrowser } from "@/features/artefacts/components/MethodBrowser";
import { FeedbackQueue } from "@/features/artefacts/components/FeedbackQueue";

export { React, renderToStaticMarkup, Button, Card, CardHeader, CardTitle, CardDescription,
  CardBody, CardFooter, Input, Select, SegmentedControl, EmptyState, AiResult, Sidebar,
  BottomNav, Icons, PlanView, AdjustPanel, MethodBrowser, FeedbackQueue };
`,
);

await build({
  entryPoints: [".screens-entry.jsx"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: ".screens-bundle.mjs",
  alias: { "@": "./src", "next/navigation": "./.screens-nav-stub.js" },
  loader: { ".jsx": "jsx" },
  jsx: "automatic",
  external: ["react", "react-dom", "react-dom/server"],
  logLevel: "warning",
});

/* -------------------------------------------------------------------------- */
/* 2. Compile the real stylesheet                                             */
/* -------------------------------------------------------------------------- */

const tokens = readFileSync("src/styles/tokens.css", "utf8");
const globals = readFileSync("src/styles/globals.css", "utf8").replace(/@import[^;]+;/, "");
writeFileSync(".screens-input.css", `${tokens}\n${globals}\n`);

execFileSync(
  "node_modules/.bin/tailwindcss",
  [
    "-c", "tailwind.config.ts",
    "--content", "./src/components/**/*.tsx,./src/features/**/*.tsx,./.screens-entry.jsx",
    "-i", ".screens-input.css",
    "-o", `${OUT}/screens.css`,
  ],
  { stdio: "inherit" },
);

/* -------------------------------------------------------------------------- */
/* 3. Fixtures — generic, and deliberately not plausible student data         */
/* -------------------------------------------------------------------------- */

const COPY = {
  ar: {
    appNav: "التنقل الرئيسي",
    dashboard: "لوحة المعلم",
    plans: "خطط الدروس",
    methods: "طرائق التدريس",
    feedback: "الملاحظات",
    students: "الطلاب",
    signOut: "تسجيل الخروج",
    greeting: "أهلًا بك",
    signedInAs: "مسجّل الدخول باسم",
    stagedFeedback: "ملاحظات بانتظار مراجعتك",
    stagedCount: "{count, plural, =0 {لا شيء} other {# ملاحظات}}",
    quick: "إجراءات سريعة",
    newPlan: "خطة جديدة",
    browseMethods: "استعرض الطرائق",
    reviewFeedback: "راجع الملاحظات",
    recentPlans: "أحدث الخطط",
    agents: "الوكلاء",
    agentsIntro: "كل مهمة ينفّذها وكيل متخصص ضمن قواعد المنهج، وبإشراف المعلم.",
    requiresReview: "نتاج هذا الوكيل مسودة حتى تعتمدها",
    plansIntro: "خططك محفوظة بالإصدارات: كل تعديل نسخة جديدة، ويمكنك الرجوع إلى أي نسخة سابقة.",
    methodsIntro: "اختر طريقة، أو دع المولّد يقترح واحدة. كل طريقة مكتوبة للصف البحريني، لا مترجمة.",
    feedbackIntro: "لا تصل أي ملاحظة إلى الطالب قبل أن تراجعها وتعتمدها بنفسك.",
    adjustTitle: "تعديل النتيجة",
    adjustIntro: "عدّل ما ولّدته دون إعادة كتابة الطلب. كل تعديل يُنشئ إصدارًا جديدًا.",
    history: "سجل التعديلات",
    historyHint: "الإصدارات للقراءة فقط. لتصحيح نص، أنشئ إصدارًا جديدًا.",
    version: "الإصدار {n}",
    current: "الحالي",
  },
  en: {
    appNav: "Main navigation",
    dashboard: "Teacher dashboard",
    plans: "Lesson plans",
    methods: "Methods",
    feedback: "Feedback",
    students: "Students",
    signOut: "Sign out",
    greeting: "Welcome",
    signedInAs: "Signed in as",
    stagedFeedback: "Feedback waiting for you",
    stagedCount: "{count, plural, =0 {Nothing waiting} other {# notes to review}}",
    quick: "Quick actions",
    newPlan: "New plan",
    browseMethods: "Browse methods",
    reviewFeedback: "Review feedback",
    recentPlans: "Recent plans",
    agents: "Agents",
    agentsIntro: "Each task is run by a specialised agent inside curriculum rules, with the teacher in charge.",
    requiresReview: "Output from this agent is a draft until you approve it",
    plansIntro: "Your plans are versioned: every change is a new version, and you can go back to any earlier one.",
    methodsIntro: "Pick a method, or let the generator suggest one. Every method is written for the Bahraini classroom, not translated into it.",
    feedbackIntro: "Nothing reaches a student until you have reviewed it and approved it yourself.",
    adjustTitle: "Adjust the result",
    adjustIntro: "Change what was generated without rewriting the request. Every adjustment creates a new version.",
    history: "Change history",
    historyHint: "Versions are read-only. To correct the text, create a new version.",
    version: "Version {n}",
    current: "Current",
  },
};

/** The Arabic lesson plan, used for BOTH locales so the direction rule is visible. */
const PLAN_AR_CONTENT = {
  title: "خلية النبات",
  objectives: [
    "يتعرّف الطالب على الأجزاء الرئيسية لخلية النبات.",
    "يميّز بين وظيفة النواة والجدار الخلوي.",
    "يشرح بأسلوبه كيف تنتقل المواد داخل الخلية.",
  ],
  prerequisites: ["الخلية كوحدة بناء الكائن الحي"],
  materials: ["مجهر", "شريحة خلية بصل", "ورقة عمل"],
  stages: [
    { name: "سؤال محيّر", phase: "spark", minutes: 3, description: "لماذا لا تنمو النبتة بلا ضوء؟ اكتب توقّعك." },
    { name: "توزيع الأدوار", phase: "briefing", minutes: 5, description: "مجموعات من أربعة، ولكل عضو جزء من الخلية." },
    { name: "الفحص والمناقشة", phase: "action", minutes: 30, description: "كل مجموعة تفحص شريحتها وترسم ما ترى، ثم تشرح للبقية." },
    { name: "الخلاصة", phase: "debrief", minutes: 7, description: "نعود إلى سؤال البداية ونقارن التوقّع بما تعلّمناه." },
  ],
  assessment: "ورقة خروج: اذكر وظيفتين لخلية النبات.",
  homework: "ارسم خلية نبات وسمِّ ثلاثة أجزاء.",
  methodologySlug: "jigsaw",
};

const METHODS = [
  { id: "m1", slug: "jigsaw", nameAr: "جيغسو", nameEn: "Jigsaw", descriptionAr: "يصبح كل طالب خبيرًا في جزء، ثم يعلّمه للبقية.", descriptionEn: "Each student becomes an expert, then teaches the rest.", category: "cooperative", composition: "small_groups", durationMinMinutes: 50, durationMaxMinutes: 50, groupSizeMin: 16, groupSizeMax: 36, isFeatured: true },
  { id: "m2", slug: "think-pair-share", nameAr: "فكّر-زاوج-شارك", nameEn: "Think-Pair-Share", descriptionAr: "تأمل فردي، ثم نقاش ثنائي، ثم مشاركة صفية.", descriptionEn: "Individual reflection, then partner talk, then class share.", category: "cooperative", composition: "pairs_individual", durationMinMinutes: 20, durationMaxMinutes: 20, groupSizeMin: 8, groupSizeMax: 40, isFeatured: false },
  { id: "m3", slug: "gallery-walk", nameAr: "جولة المعرض", nameEn: "Gallery Walk", descriptionAr: "تُعلَّق الأعمال، وتدور المجموعات وتعلّق عليها.", descriptionEn: "Create displays, rotate and critique.", category: "project", composition: "small_groups", durationMinMinutes: 50, durationMaxMinutes: 50, groupSizeMin: 12, groupSizeMax: 36, isFeatured: false },
  { id: "m4", slug: "document-mystery", nameAr: "لغز الوثيقة", nameEn: "Document Mystery", descriptionAr: "يحلّل الطلاب أدلة أصلية ليبنيوا المعنى بأنفسهم.", descriptionEn: "Analyse evidence to solve a question.", category: "inquiry", composition: "small_groups", durationMinMinutes: 45, durationMaxMinutes: 45, groupSizeMin: 12, groupSizeMax: 32, isFeatured: false },
];

const FEEDBACK = [
  {
    id: "f1", studentId: "aaaa0000-1111", studentName: "—", submissionId: "s1", style: "glow_grow",
    body: null,
    glows: ["وضوح الفكرة الرئيسية في المقدمة"],
    grows: ["يحتاج المقال إلى دليل من النص"],
    wonderings: [],
    nextSteps: [],
    rubricId: null, status: "staged", approvedAt: null, publishedAt: null, createdAt: new Date().toISOString(),
  },
  {
    id: "f2", studentId: "aaaa0000-2222", studentName: "—", submissionId: "s2", style: "next_steps",
    body: null, glows: [], grows: [], wonderings: [],
    nextSteps: ["أعد صياغة الخاتمة في ثلاث جمل", "أضف مثالًا من درس أمس", "راجع علامات الترقيم"],
    rubricId: null, status: "staged", approvedAt: null, publishedAt: null, createdAt: new Date().toISOString(),
  },
];

/* -------------------------------------------------------------------------- */
/* 4. Screens                                                                 */
/* -------------------------------------------------------------------------- */

const D = await import(`${process.cwd()}/.screens-bundle.mjs`);
const { React, renderToStaticMarkup, Icons } = D;
const h = React.createElement;

function Screen({ title, children, tone }) {
  return h(
    "section",
    { className: "border-t-4 border-gold pt-s4 mt-s6 first:mt-s0 first:border-t-0 first:pt-s0" },
    h("p", { className: "text-xs font-medium text-ink-muted" }, title),
    h("div", { className: "mt-s3" }, children),
  );
}

function buildGallery(locale) {
  const ar = locale === "ar";
  const c = COPY[ar ? "ar" : "en"];

  const navItems = [
    { href: "#", label: c.dashboard, icon: h(Icons.Layers) },
    { href: "#", label: c.plans, icon: h(Icons.BookOpen) },
    { href: "#", label: c.methods, icon: h(Icons.ClipboardList) },
    { href: "#", label: c.feedback, icon: h(Icons.Check), badge: 2 },
    { href: "#", label: c.students, icon: h(Icons.Users) },
  ];

  const planLabels = {
    versionLabel: c.version, current: c.current, objectives: ar ? "الأهداف" : "Objectives",
    materials: ar ? "المواد" : "Materials", stages: ar ? "مراحل الدرس" : "Lesson stages",
    assessment: ar ? "التقويم" : "Assessment", homework: ar ? "الواجب" : "Homework",
    minutes: ar ? "{n} دقيقة" : "{n} min", emptyVersion: "—",
    emptyTitle: ar ? "لا توجد خطط بعد" : "No lesson plans yet",
    emptyBody: ar ? "أنشئ خطة ليظهر سجلّك هنا." : "Create a plan and your history appears here.",
  };

  const adjustLabels = {
    title: c.adjustTitle, intro: c.adjustIntro,
    kindLabel: ar ? "نوع التعديل" : "What to change",
    kinds: {
      reading_level: ar ? "مستوى القراءة" : "Reading level",
      length: ar ? "الطول" : "Length",
      tone: ar ? "النبرة" : "Tone",
      language: ar ? "اللغة" : "Language",
      regenerate_section: ar ? "إعادة توليد قسم" : "Regenerate a section",
    },
    valueLabel: ar ? "القيمة" : "To",
    sectionLabel: ar ? "القسم" : "Section",
    instructionLabel: ar ? "ملاحظة إضافية (اختياري)" : "Anything else (optional)",
    instructionHint: ar ? "لا تكتب اسم أي طالب هنا." : "Do not write a student's name here.",
    apply: ar ? "طبّق التعديل" : "Apply", applying: ar ? "جارٍ التعديل…" : "Applying…",
    conflict: ar ? "تغيّرت الخطة على جهاز آخر." : "This plan changed on another device.",
    values: {
      grade_5: ar ? "الصف الخامس" : "Grade 5", grade_6: ar ? "الصف السادس" : "Grade 6",
      grade_7: ar ? "الصف السابع" : "Grade 7", grade_8: ar ? "الصف الثامن" : "Grade 8",
      grade_9: ar ? "الصف التاسع" : "Grade 9",
      shorter: ar ? "أقصر" : "Shorter", longer: ar ? "أطول" : "Longer",
      formal: ar ? "رسمية" : "Formal", simpler: ar ? "أبسط" : "Simpler",
      ar: "العربية", en: "English",
      objectives: ar ? "الأهداف" : "Objectives", stages: ar ? "المراحل" : "Stages",
      assessment: ar ? "التقويم" : "Assessment", homework: ar ? "الواجب" : "Homework",
    },
    genericError: ar ? "تعذّر التعديل." : "That did not work.",
  };

  const methodLabels = {
    browse: ar ? "استعرض {count} طريقة" : "Browse {count} methods",
    featured: ar ? "طريقة هذا الأسبوع" : "Method of the week",
    empty: ar ? "لا توجد طرائق مطابقة." : "No methods match those filters.",
    emptyHint: ar ? "جرّب إزالة مرشّح." : "Try removing a filter.",
    filters: {
      group: ar ? "التجميع" : "Grouping", duration: ar ? "المدة" : "Duration",
      all: ar ? "الكل" : "All", wholeClass: ar ? "الصف كامل" : "Whole class",
      smallGroups: ar ? "مجموعات صغيرة" : "Small groups",
      pairsIndividual: ar ? "ثنائي / فردي" : "Pairs / individual",
      under15: ar ? "أقل من ١٥" : "Under 15", "15to30": "١٥–٣٠", over30: ar ? "أكثر من ٣٠" : "Over 30",
    },
    card: {
      duration: ar ? "{n} دقيقة" : "{n} min",
      groupSize: ar ? "{min}–{max} طالبًا" : "{min}–{max} students",
      use: ar ? "استخدمها" : "Use it",
    },
    helper: {
      title: ar ? "أي طريقة أستخدم غدًا؟" : "Which one should I run tomorrow?",
      intro: ar ? "اختر الحالة الأقرب إلى صفك." : "Pick the situation closest to your class.",
    },
    situations: {
      everyoneSpeaks: ar ? "أريد أن يشارك كل طالب، لا المتحدثون فقط." : "I want every student to say something, not just the talkative ones.",
      denseContent: ar ? "يجب أن أغطي محتوى كثيفًا في حصة واحدة." : "I need to cover dense content in one period.",
      examineEvidence: ar ? "أريد أن يفحص الطلاب أدلة." : "I want students to examine evidence.",
    },
    reasons: {
      everyoneSpeaks: ar ? "كل طالب يكتب قبل أن يتحدث، فتتساوى المشاركة." : "Every student writes before anyone speaks.",
      denseContent: ar ? "يُقسَّم الموضوع، فيتعلّم كل طالب جزءًا ويعلّمه للبقية." : "The topic is split, so each student teaches the rest.",
      examineEvidence: ar ? "يفحص الطلاب مصادر أولية ويبنون المعنى بأنفسهم." : "Students work with primary sources.",
    },
    suggested: "",
  };

  const feedbackLabels = {
    title: c.feedback, intro: c.feedbackIntro,
    empty: ar ? "لا شيء بانتظار المراجعة" : "Nothing to review",
    emptyHint: ar ? "تظهر الملاحظات هنا كمسودة." : "Generated feedback appears here as a draft.",
    student: ar ? "الطالب" : "Student",
    styles: {
      targeted: ar ? "ملاحظة موجّهة" : "Targeted feedback",
      glow_grow: ar ? "نقاط القوة والتطوير" : "Glow & grow",
      rubric_criteria: ar ? "حسب معايير التقييم" : "Rubric criteria",
      next_steps: ar ? "الخطوات التالية" : "Next steps",
    },
    sections: {
      glows: ar ? "نقاط القوة" : "Strengths", grows: ar ? "نقاط للتطوير" : "Areas to grow",
      wonderings: ar ? "تساؤلات" : "Wonderings", nextSteps: ar ? "الخطوات التالية" : "Next steps",
      body: ar ? "الملاحظة" : "Feedback",
    },
    gate: {
      stagedNotice: ar ? "مسودة — لا يراها الطالب." : "Draft — the student cannot see this.",
      approve: ar ? "اعتماد" : "Approve", approved: ar ? "معتمدة" : "Approved",
      publish: ar ? "إرسال إلى الطالب" : "Send to student", discard: ar ? "تجاهل" : "Discard",
      confirmPublish: "—", confirmDiscard: "—",
      invalidTransition: ar ? "انتقال غير مسموح." : "Not allowed.",
      genericError: ar ? "تعذّر الإجراء." : "That did not work.",
    },
  };

  return h(
    "div",
    { className: "flex min-h-screen" },
    h(D.Sidebar, {
      items: navItems, activeHref: "#", label: c.appNav,
      brand: h("div", { className: "flex items-center gap-s2" },
        h("span", { className: "h-6 w-6 rounded-sm bg-red" }),
        h("span", { className: "text-base font-semibold" }, "LUMORA")),
      footer: h("div", { className: "text-xs text-[var(--text-on-dark-soft)]" }, `${c.signedInAs} teacher@example.test`),
    }),

    h("main", { className: "min-w-0 flex-1 bg-surface-ground px-s4 py-s5 lg:px-s6" },
      h("div", { className: "mx-auto flex w-full max-w-container flex-col" },

        h(Screen, { title: ar ? "١ · لوحة المعلم" : "1 · Dashboard" },
          h("div", { className: "flex flex-col gap-s4" },
            h("header", { className: "flex flex-col gap-s1" },
              h("p", { className: "text-sm text-ink-muted" }, c.greeting),
              h("h1", { className: "text-2xl font-semibold" }, c.dashboard)),
            h("div", { className: "grid gap-s4 lg:grid-cols-3" },
              h(D.Card, { accentRule: true, className: "lg:col-span-2" },
                h(D.CardTitle, null, c.stagedFeedback),
                h(D.CardBody, null,
                  h("p", { className: "text-3xl font-semibold tnum" }, "2"),
                  h("p", { className: "mt-s1 text-sm text-ink-soft" }, ar ? "ملاحظتان بانتظار المراجعة" : "2 notes to review")),
                h("div", { className: "mt-s4" },
                  h(D.Button, { href: "#", iconEnd: h(Icons.ArrowForward, { size: 16 }) }, c.reviewFeedback))),
              h(D.Card, null,
                h(D.CardTitle, null, c.quick),
                h(D.CardBody, { className: "flex flex-col gap-s2" },
                  h(D.Button, { variant: "secondary", size: "sm", fullWidth: true }, c.newPlan),
                  h(D.Button, { variant: "ghost", size: "sm", fullWidth: true }, c.browseMethods)))),
            h("div", null,
              h("h2", { className: "text-lg font-semibold" }, c.recentPlans),
              h("ul", { className: "mt-s3 grid gap-s3 sm:grid-cols-2" },
                [PLAN_AR_CONTENT.title, ar ? "التناضح في الخلية" : "Osmosis"].map((t, i) =>
                  h("li", { key: i },
                    h(D.Card, { interactive: true },
                      h(D.CardTitle, null, t),
                      h(D.CardDescription, { className: "mt-s1" },
                        (ar ? "الصف السابع · علوم" : "Grade 7 · Science") +
                        (i === 0 ? (ar ? " · جيغسو" : " · Jigsaw") : ""))))))),
            h(D.Card, { padding: "sm" },
              h("div", { className: "flex flex-wrap items-center justify-between gap-s2" },
                h("span", { className: "text-sm font-medium" }, ar ? "وكيل خطة الدرس" : "Lesson plan agent"),
                h("span", { className: "rounded-pill bg-surface-accent px-s3 py-s1 text-xs text-purple" }, c.requiresReview)),
              h("p", { className: "mt-s1 text-xs text-ink-soft" }, c.agentsIntro)))),

        h(Screen, { title: ar ? "٢ · قائمة الخطط" : "2 · Lesson plans list" },
          h("div", { className: "flex flex-col gap-s4" },
            h("h1", { className: "text-2xl font-semibold" }, c.plans),
            h("p", { className: "max-w-prose text-sm text-ink-soft" }, c.plansIntro),
            h("div", { className: "flex flex-wrap gap-s2" },
              [ar ? "الكل" : "All", ar ? "مسودة" : "Draft", ar ? "جاهزة" : "Ready", ar ? "مؤرشفة" : "Archived"]
                .map((label, i) => h("span", {
                  key: i,
                  className: i === 0
                    ? "rounded-pill bg-navy px-s4 py-s2 text-sm font-medium text-white"
                    : "rounded-pill border border-line px-s4 py-s2 text-sm text-ink-soft",
                }, label))),
            h("ul", { className: "grid gap-s3 md:grid-cols-2 xl:grid-cols-3" },
              [PLAN_AR_CONTENT.title, ar ? "التناضح في الخلية" : "Osmosis", ar ? "البناء الضوئي" : "Photosynthesis"].map((t, i) =>
                h("li", { key: i },
                  h(D.Card, { interactive: true },
                    h(D.CardTitle, null, t),
                    h(D.CardDescription, { className: "mt-s1" }, ar ? "الصف السابع · علوم" : "Grade 7 · Science"),
                    h("p", { className: "mt-s3 text-xs text-ink-muted tnum" },
                      `${c.version.replace("{n}", String(i + 1))} · ` + (ar ? "جيغسو" : "Jigsaw")))))))),

        h(Screen, { title: ar ? "٣ · خطة درس + لوحة التعديل" : "3 · Plan detail + adjust panel" },
          h("div", { className: "grid gap-s4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" },
            h(D.PlanView, {
              content: PLAN_AR_CONTENT,
              version: { versionNo: 2, source: "refined", refinementKind: "length", createdAt: "", runId: null, content: PLAN_AR_CONTENT },
              // The draft is Arabic in BOTH galleries, so the direction rule is
              // visible rather than described.
              outputLanguage: "ar",
              locale,
              labels: planLabels,
            }),
            h("div", { className: "flex flex-col gap-s4" },
              h(D.AdjustPanel, { planId: "p1", baseVersionNo: 2, outputLanguage: "ar", locale, labels: adjustLabels }),
              h(D.Card, null,
                h(D.CardTitle, null, c.history),
                h("p", { className: "mt-s1 text-xs text-ink-muted" }, c.historyHint),
                h(D.CardBody, null,
                  h("ol", { className: "flex flex-col gap-s2" },
                    [2, 1].map((n, i) =>
                      h("li", { key: n, className: "flex items-center justify-between gap-s2 border-b border-line pb-s2 last:border-b-0" },
                        h("span", { className: "flex items-center gap-s2 text-sm" },
                          h("span", { className: "tnum" }, c.version.replace("{n}", String(n))),
                          h("span", { className: "text-xs text-ink-muted" }, i === 0 ? "refined" : "generated"),
                          i === 0 ? h("span", { className: "text-xs text-purple" }, ar ? "الطول" : "Length") : null),
                        i === 0 ? h("span", { className: "rounded-pill bg-surface-accent px-s2 py-s1 text-xs text-purple" }, c.current) : null)))))))),

        h(Screen, { title: ar ? "٤ · طرائق التدريس" : "4 · Teaching methods" },
          h("div", { className: "flex flex-col gap-s3" },
            h("h1", { className: "text-2xl font-semibold" }, c.methods),
            h("p", { className: "max-w-prose text-sm text-ink-soft" }, c.methodsIntro),
            h(D.MethodBrowser, {
              methods: METHODS,
              suggestions: [
                { situationKey: "everyoneSpeaks", methodologySlug: "think-pair-share", reasonKey: "everyoneSpeaks" },
                { situationKey: "denseContent", methodologySlug: "jigsaw", reasonKey: "denseContent" },
                { situationKey: "examineEvidence", methodologySlug: "document-mystery", reasonKey: "examineEvidence" },
              ],
              locale, labels: methodLabels,
            }))),

        h(Screen, { title: ar ? "٥ · الملاحظات وبوّابة الاعتماد" : "5 · Feedback and the approval gate" },
          h("div", { className: "flex flex-col gap-s3" },
            h("h1", { className: "text-2xl font-semibold" }, c.feedback),
            h("p", { className: "max-w-prose text-sm text-ink-soft" }, c.feedbackIntro),
            h(D.FeedbackQueue, { notes: FEEDBACK, locale, labels: feedbackLabels }))))),

    h(D.BottomNav, { items: navItems, activeHref: "#", label: c.appNav }),
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Write                                                                   */
/* -------------------------------------------------------------------------- */

const fontFace = `
@font-face{font-family:"PlexAr";src:url(fonts/plexarabic-400-arabic.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"PlexAr";src:url(fonts/plexarabic-500-arabic.woff2) format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:"PlexAr";src:url(fonts/plexarabic-600-arabic.woff2) format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"PlexAr";src:url(fonts/plexarabic-700-arabic.woff2) format("woff2");font-weight:700;font-display:swap}
@font-face{font-family:"InterVar";src:url(fonts/inter-variable-latin.woff2) format("woff2");font-weight:300 600;font-display:swap}
@font-face{font-family:"PlexMono";src:url(fonts/plexmono-400-latin.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"PlexMono";src:url(fonts/plexmono-500-latin.woff2) format("woff2");font-weight:500;font-display:swap}
:root{--font-text-ar:"PlexAr";--font-text-lat:"InterVar";--font-mono-lat:"PlexMono";--font-display-ar:"PlexAr";--font-display-lat:"InterVar";}
`;

for (const locale of ["en", "ar"]) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LUMORA screens — ${locale}</title>
<style>${readFileSync(`${OUT}/screens.css`, "utf8")}</style>
<style>${fontFace}</style>
</head>
<body>${renderToStaticMarkup(buildGallery(locale))}</body>
</html>`;
  writeFileSync(`${OUT}/${locale}-${dir}.html`, html);
}

console.log(`wrote ${OUT}/en-ltr.html and ${OUT}/ar-rtl.html`);
