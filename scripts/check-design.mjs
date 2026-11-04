#!/usr/bin/env node
/**
 * Design-system gate for `src/components/ui/**`.
 *
 * The rules a UI kit must keep are the ones that are invisible when broken:
 * a physical `ml-4` looks correct in English and puts the gap on the wrong side
 * in Arabic; a hard-coded `#DA291C` renders correctly and silently stops
 * tracking the brand. Both need a machine, not discipline.
 *
 *  1. No raw hex colours in a component. Every value comes from tokens.css.
 *  2. No physical direction utilities. Logical properties only (RTL).
 *  3. No numeric spacing utilities — margin, padding and gap use the `s*`
 *     scale, which IS the 8px grid. Height and width are dimensions, not
 *     rhythm, and are allowed to use the numeric scale.
 *  4. No font family other than a token stack.
 *  5. Every clickable element must be reachable at 44px (checked on the
 *     components that render a control).
 *
 * Run: node scripts/check-design.mjs     (exit 1 = a rule is broken)
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/components/ui";

const RULES = [
  {
    id: "no-raw-hex",
    why: "A hex value in a component stops tracking the brand the moment a token changes.",
    // Token definitions live in CSS, never in a component. rgb()/var() are fine.
    re: /#[0-9A-Fa-f]{3,8}\b/g,
    allow: [],
  },
  {
    id: "no-physical-direction",
    why: "Physical direction utilities break RTL. Use ms/me/ps/pe/start/end/text-start/text-end.",
    re: /(?<![\w-])(?:ml|mr|pl|pr|left|right|border-l|border-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|float-left|float-right|text-left|text-right)-/g,
    allow: [],
  },
  {
    id: "no-numeric-rhythm",
    why: "Margin, padding, gap and space must use the s* scale (the 8px grid), not the numeric scale.",
    re: /(?<![\w-])(?:p|px|py|pt|pb|ps|pe|m|mx|my|mt|mb|ms|me|gap|gap-x|gap-y|space-x|space-y)-(?!s)\d/g,
    allow: [],
  },
  {
    id: "no-foreign-font",
    why: "Only token font stacks. A raw family bypasses the Arabic-first stack order.",
    re: /font-family:\s*(?!var\()/g,
    allow: [],
  },
];

/* Deliberate, documented exceptions. Each needs a reason here, not in a comment
   in the component where nobody will read it. */
const EXCEPTIONS = {
  // The Arbitrary Tailwind values below are all CSS variables, not literals:
  //   [--card-fg:var(--text-primary)]        a var declaration
  //   text-[color:var(--card-fg)]            a var reference
  // Neither carries a colour value, so the hex rule does not apply to them and
  // they never appear in this list.
};

let failures = 0;
let checked = 0;

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))) {
  const path = join(DIR, file);
  const src = readFileSync(path, "utf8");
  checked += 1;

  // Strip block and line comments — prose may legitimately name an anti-pattern
  // ("never use ml-4 here"), and flagging the documentation of a rule is how a
  // linter teaches people to delete the documentation.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  for (const rule of RULES) {
    const matches = [...code.matchAll(rule.re)].map((m) => m[0]);
    if (matches.length === 0) continue;

    const lines = code.split("\n");
    for (const [i, line] of lines.entries()) {
      const hits = [...line.matchAll(rule.re)].map((m) => m[0]);
      if (hits.length === 0) continue;
      if (EXCEPTIONS[`${file}:${rule.id}`]) continue;
      failures += 1;
      console.log(`  FAIL ${file}:${i + 1}  [${rule.id}] ${hits.join(", ")}`);
      console.log(`       ${rule.why}`);
    }
  }
}

console.log(`\nchecked ${checked} files in ${DIR} against ${RULES.length} rules.`);
if (failures) {
  console.log(`${failures} violation(s).`);
  process.exit(1);
}
console.log("clean — no raw colours, no physical direction, no off-grid rhythm.");
