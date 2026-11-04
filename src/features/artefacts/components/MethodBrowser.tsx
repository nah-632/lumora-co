"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  CardDescription,
  CardFooter,
  SegmentedControl,
  EmptyState,
  Icons,
} from "@/components/ui";
import type { Methodology } from "@/lib/artefacts/queries";

/**
 * The method catalogue — Flip Education's selector.
 *
 * A faceted browse, not a dropdown: filter by grouping and by duration, and each
 * card carries the two numbers a teacher actually chooses on (how long, and how
 * many students it suits). Those are the two facts that make a method usable
 * without opening it.
 *
 * The situation helper is the part worth keeping. It asks the teacher to pick
 * their SITUATION rather than a method name — because a teacher who does not
 * already know the method names is exactly the one who needs the catalogue, and
 * "which one should I run tomorrow?" is the real question.
 *
 * Everything is filtered in the browser over one fetch. The catalogue is a few
 * dozen rows of reference data that RLS restricts to approved entries; paging it
 * over the network would make the filters feel slow for no benefit. If it grows
 * past a few hundred, this becomes a server query.
 */

export interface MethodBrowserLabels {
  browse: string;
  featured: string;
  empty: string;
  emptyHint: string;
  filters: {
    group: string;
    duration: string;
    all: string;
    wholeClass: string;
    smallGroups: string;
    pairsIndividual: string;
    under15: string;
    "15to30": string;
    over30: string;
  };
  card: { duration: string; groupSize: string; use: string };
  helper: { title: string; intro: string };
  situations: Record<string, string>;
  reasons: Record<string, string>;
  suggested: string;
}

interface Props {
  methods: Methodology[];
  suggestions: Array<{ situationKey: string; methodologySlug: string; reasonKey: string }>;
  locale: "ar" | "en";
  labels: MethodBrowserLabels;
  onUse?: (method: Methodology) => void;
}

type Group = "all" | "whole_class" | "small_groups" | "pairs_individual";
type Duration = "any" | "under_15" | "15_to_30" | "over_30";

export function MethodBrowser({ methods, suggestions, locale, labels, onUse }: Props) {
  const [group, setGroup] = useState<Group>("all");
  const [duration, setDuration] = useState<Duration>("any");
  const [openSituation, setOpenSituation] = useState<string | null>(null);

  const ar = locale === "ar";

  const filtered = useMemo(
    () =>
      methods.filter((m) => {
        if (group !== "all" && m.composition !== group) return false;
        if (duration === "under_15" && m.durationMinMinutes >= 15) return false;
        if (duration === "15_to_30" && !(m.durationMaxMinutes >= 15 && m.durationMinMinutes <= 30)) return false;
        if (duration === "over_30" && m.durationMaxMinutes <= 30) return false;
        return true;
      }),
    [methods, group, duration],
  );

  const bySlug = useMemo(() => new Map(methods.map((m) => [m.slug, m])), [methods]);
  const featured = methods.find((m) => m.isFeatured) ?? null;

  return (
    <div className="flex flex-col gap-s4">
      {/* The decision helper. Picking a situation, not a method name. */}
      <Card tone="muted">
        <CardTitle>{labels.helper.title}</CardTitle>
        <CardDescription>{labels.helper.intro}</CardDescription>
        <CardBody className="flex flex-col gap-s2">
          {suggestions.map((s) => {
            const method = bySlug.get(s.methodologySlug);
            const open = openSituation === s.situationKey;
            return (
              <div key={s.situationKey} className="flex flex-col gap-s2 border-b border-line pb-s2 last:border-b-0 last:pb-s0">
                <button
                  type="button"
                  onClick={() => setOpenSituation(open ? null : s.situationKey)}
                  aria-expanded={open}
                  className="flex items-start gap-s2 text-start text-sm text-navy hover:text-purple"
                >
                  <Icons.ChevronForward size={16} className="mt-[3px]" />
                  <span>{labels.situations[s.situationKey] ?? s.situationKey}</span>
                </button>
                {open && method ? (
                  <div className="ms-s4 flex flex-col gap-s1">
                    <p className="text-sm font-medium">{ar ? method.nameAr : method.nameEn}</p>
                    <p className="text-xs text-ink-soft">{labels.reasons[s.reasonKey] ?? ""}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardBody>
      </Card>

      {featured ? (
        <Card accentRule>
          <CardDescription>{labels.featured}</CardDescription>
          <CardTitle className="mt-s1">{ar ? featured.nameAr : featured.nameEn}</CardTitle>
          <CardBody>
            <p className="text-sm text-ink-soft">{ar ? featured.descriptionAr : featured.descriptionEn}</p>
          </CardBody>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-end gap-s3">
        <SegmentedControl<Group>
          label={labels.filters.group}
          value={group}
          onChange={setGroup}
          segments={[
            { value: "all", label: labels.filters.all },
            { value: "whole_class", label: labels.filters.wholeClass },
            { value: "small_groups", label: labels.filters.smallGroups },
            { value: "pairs_individual", label: labels.filters.pairsIndividual },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-end gap-s3">
        <SegmentedControl<Duration>
          label={labels.filters.duration}
          value={duration}
          onChange={setDuration}
          segments={[
            { value: "any", label: labels.filters.all },
            { value: "under_15", label: labels.filters.under15 },
            { value: "15_to_30", label: labels.filters["15to30"] },
            { value: "over_30", label: labels.filters.over30 },
          ]}
        />
      </div>

      <p className="text-sm text-ink-muted tnum">{labels.browse.replace("{count}", String(filtered.length))}</p>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<Icons.Search size={24} />} title={labels.empty} description={labels.emptyHint} />
        </Card>
      ) : (
        <div className="grid gap-s4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <Card key={m.id} interactive className="flex flex-col">
              <CardTitle>{ar ? m.nameAr : m.nameEn}</CardTitle>
              <CardBody className="flex-1">
                <p className="text-sm text-ink-soft">{ar ? m.descriptionAr : m.descriptionEn}</p>
              </CardBody>
              <p className="mt-s3 text-xs text-ink-muted tnum">
                {labels.card.duration.replace("{n}", String(m.durationMinMinutes))}
                {" · "}
                {labels.card.groupSize
                  .replace("{min}", String(m.groupSizeMin))
                  .replace("{max}", String(m.groupSizeMax))}
              </p>
              {onUse ? (
                <CardFooter>
                  <Button size="sm" variant="secondary" onClick={() => onUse(m)}>
                    {labels.card.use}
                  </Button>
                </CardFooter>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
