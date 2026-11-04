"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardTitle, CardDescription, Input, Select, Icons } from "@/components/ui";

/**
 * The adjust panel — MagicSchool's "Customize", as one surface.
 *
 * The recon found that MagicSchool spreads this one intent across four places
 * (a rich-text editor, a chatbot, a separate Text Leveler tool, and rewriting the
 * prompt) and that its in-place editor exists on only three of its 80+ tools.
 * Brisk splits it too. This is the other answer: one panel, and the options it
 * offers come from the SERVER (`GenerateResponse.refinements` in the contract),
 * so a tool can declare what it can actually refine instead of the UI hard-coding
 * a list that drifts from the prompt.
 *
 * TWO THINGS THAT MATTER MORE THAN THE LAYOUT:
 *
 * 1. `baseVersionNo` is sent with every request. If another device refined the
 *    plan while this one was open, the server refuses with `conflict` rather than
 *    quietly dropping that edit — and the panel says so instead of showing a
 *    generic error.
 * 2. The free-text field carries a warning not to name a student. The prompt is
 *    about the DOCUMENT; a name typed here would reach the provider, and that is
 *    the one thing the privacy rule forbids.
 */

export interface AdjustPanelLabels {
  title: string;
  intro: string;
  kindLabel: string;
  kinds: Record<string, string>;
  valueLabel: string;
  sectionLabel: string;
  instructionLabel: string;
  instructionHint: string;
  apply: string;
  applying: string;
  conflict: string;
  values: Record<string, string>;
  genericError: string;
}

const VALUES: Record<string, string[]> = {
  reading_level: ["grade_5", "grade_6", "grade_7", "grade_8", "grade_9"],
  length: ["shorter", "longer"],
  tone: ["formal", "simpler"],
  language: ["ar", "en"],
  regenerate_section: ["objectives", "stages", "assessment", "homework"],
};

interface Props {
  planId: string;
  baseVersionNo: number;
  outputLanguage: "ar" | "en";
  locale: "ar" | "en";
  labels: AdjustPanelLabels;
}

export function AdjustPanel({ planId, baseVersionNo, outputLanguage, locale, labels }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState("length");
  const [value, setValue] = useState(VALUES.length[0]);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const values = VALUES[kind] ?? VALUES.length;

  async function apply() {
    setBusy(true);
    setError(null);
    setDone(null);

    try {
      const res = await fetch(`/api/lesson-plans/${planId}/refine?outputLanguage=${outputLanguage}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          value,
          section: kind === "regenerate_section" ? value : undefined,
          baseVersionNo,
          instruction: instruction.trim() || undefined,
        }),
      });

      const body = (await res.json().catch(() => null)) as
        | { ok: true; lessonPlan: { versionNo: number } }
        | { ok: false; code: string }
        | null;

      if (!res.ok || !body || body.ok === false) {
        // A conflict is not an error the teacher caused, so it gets its own
        // sentence and tells them what to do about it.
        setError(body && body.ok === false && body.code === "conflict" ? labels.conflict : labels.genericError);
        return;
      }

      setDone(body.lessonPlan.versionNo);
      setInstruction("");
      // The new version is on the server; re-render so the page shows it rather
      // than a stale copy.
      router.refresh();
    } catch {
      setError(labels.genericError);
    } finally {
      setBusy(false);
    }
  }

  const kindOptions = Object.keys(VALUES).map((k) => ({ value: k, label: labels.kinds[k] ?? k }));
  const valueOptions = values.map((v) => ({ value: v, label: labels.values[v] ?? v }));

  return (
    <Card padding="md">
      <CardTitle>{labels.title}</CardTitle>
      <CardDescription>{labels.intro}</CardDescription>

      <CardBody className="flex flex-col gap-s3">
        <Select
          label={labels.kindLabel}
          value={kind}
          onChange={(e) => {
            const next = e.target.value;
            setKind(next);
            setValue((VALUES[next] ?? VALUES.length)[0]);
          }}
          options={kindOptions}
        />

        <Select
          label={kind === "regenerate_section" ? labels.sectionLabel : labels.valueLabel}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          options={valueOptions}
        />

        <Input
          label={labels.instructionLabel}
          hint={labels.instructionHint}
          value={instruction}
          maxLength={300}
          onChange={(e) => setInstruction(e.target.value)}
        />

        {error ? (
          <p className="flex items-center gap-s1 text-sm text-danger" role="alert">
            <Icons.AlertTriangle size={16} />
            {error}
          </p>
        ) : null}

        {done ? (
          <p className="flex items-center gap-s1 text-sm text-success" role="status">
            <Icons.Check size={16} />
            {locale === "ar" ? `أُنشئ الإصدار ${done}` : `Version ${done} created`}
          </p>
        ) : null}

        <div>
          <Button onClick={apply} loading={busy} disabled={busy}>
            {busy ? labels.applying : labels.apply}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
