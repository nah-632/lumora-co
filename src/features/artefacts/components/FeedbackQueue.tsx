"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  CardDescription,
  CardFooter,
  EmptyState,
  Icons,
} from "@/components/ui";
import type { FeedbackNote } from "@/lib/artefacts/queries";

/**
 * The feedback queue, with the approval gate.
 *
 * This is the one screen in the product where a mistake reaches a child, so the
 * gate is made visible rather than implied: a staged note says so in words, and
 * publishing is a second, separate action from approving.
 *
 * WHY TWO STEPS AND NOT ONE BUTTON. Brisk's rule is that feedback does not reach
 * a student until each piece has been reviewed, and the database here enforces
 * the same shape (`staged → approved → published`, anything else refused). A
 * single "send" button would collapse the review into one click, and the whole
 * value of the gate is that the teacher read the words first.
 *
 * The client does not decide whether a transition is legal. It asks, and the
 * server answers; a refusal is rendered as a sentence. Duplicating the state
 * machine here would create a second implementation that could disagree with the
 * one actually guarding the student.
 */

export interface FeedbackQueueLabels {
  title: string;
  intro: string;
  empty: string;
  emptyHint: string;
  student: string;
  styles: Record<string, string>;
  sections: Record<string, string>;
  gate: {
    stagedNotice: string;
    approve: string;
    approved: string;
    publish: string;
    discard: string;
    confirmPublish: string;
    confirmDiscard: string;
    invalidTransition: string;
    genericError: string;
  };
}

interface Props {
  notes: FeedbackNote[];
  locale: "ar" | "en";
  labels: FeedbackQueueLabels;
  /** When the teacher has hidden names on the roster, this screen honours it. */
  privacyMode?: boolean;
}

function StylePayload({ note, labels }: { note: FeedbackNote; labels: FeedbackQueueLabels }) {
  const lists: Array<[string, string[]]> = [
    ["glows", note.glows],
    ["grows", note.grows],
    ["wonderings", note.wonderings],
    ["nextSteps", note.nextSteps],
  ];

  /**
   * `dir="auto"` on the CONTENT, and only on the content.
   *
   * The feedback text is model output in the language the teacher asked for,
   * which is independent of the interface. In an English interface an Arabic glow
   * renders left-aligned without this — the characters are correct and the
   * reading is awkward, because the line starts at the wrong edge.
   *
   * `auto` rather than a computed direction: the browser resolves it from the
   * first strong character, per element, which is exactly the rule needed for
   * content whose language is not known at render time. It is applied to the
   * content and NOT to the surrounding labels, which are interface text and must
   * keep the interface's direction.
   */
  return (
    <>
      {note.body ? <p className="text-sm" dir="auto">{note.body}</p> : null}
      {lists
        .filter(([, items]) => items.length > 0)
        .map(([key, items]) => (
          <section key={key} className="mt-s3">
            <h4 className="text-xs font-semibold text-ink-soft">{labels.sections[key] ?? key}</h4>
            <ul className="mt-s1 flex list-disc flex-col gap-s1 ps-s4 text-sm">
              {items.map((item, i) => (
                <li key={i} dir="auto">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
    </>
  );
}

export function FeedbackQueue({ notes, locale, labels, privacyMode }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "publish" | "discard") {
    if (action === "publish" && !window.confirm(labels.gate.confirmPublish)) return;
    if (action === "discard" && !window.confirm(labels.gate.confirmDiscard)) return;

    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        setError(body?.code === "invalid_transition" ? labels.gate.invalidTransition : labels.gate.genericError);
        return;
      }
      router.refresh();
    } catch {
      setError(labels.gate.genericError);
    } finally {
      setBusyId(null);
    }
  }

  if (notes.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Icons.Check size={24} />} title={labels.empty} description={labels.emptyHint} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-s4">
      {error ? (
        <p className="flex items-center gap-s1 text-sm text-danger" role="alert">
          <Icons.AlertTriangle size={16} />
          {error}
        </p>
      ) : null}

      {notes.map((note) => {
        const busy = busyId === note.id;
        return (
          <Card key={note.id} className="flex flex-col">
            <div className="flex flex-wrap items-start justify-between gap-s3">
              <div className="min-w-0">
                <CardTitle>
                  {privacyMode ? `${labels.student} ${note.studentId.slice(0, 4)}` : note.studentName ?? labels.student}
                </CardTitle>
                <CardDescription>{labels.styles[note.style] ?? note.style}</CardDescription>
              </div>

              {/* The gate, stated where the decision is made. */}
              {note.status === "staged" ? (
                <span className="inline-flex items-center gap-s1 rounded-pill bg-surface-accent px-s3 py-s1 text-xs font-medium text-purple">
                  <Icons.InfoCircle size={16} />
                  {labels.gate.stagedNotice}
                </span>
              ) : (
                <span className="inline-flex items-center gap-s1 rounded-pill bg-success/10 px-s3 py-s1 text-xs font-medium text-success">
                  <Icons.Check size={16} />
                  {labels.gate.approved}
                </span>
              )}
            </div>

            <CardBody>
              <StylePayload note={note} labels={labels} />
            </CardBody>

            <CardFooter>
              {note.status === "staged" ? (
                <>
                  <Button size="sm" onClick={() => void act(note.id, "approve")} loading={busy} disabled={busy}>
                    {labels.gate.approve}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void act(note.id, "discard")} disabled={busy}>
                    {labels.gate.discard}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => void act(note.id, "publish")} loading={busy} disabled={busy}>
                  {labels.gate.publish}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
