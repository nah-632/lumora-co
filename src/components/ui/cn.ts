/**
 * Joins class names.
 *
 * Deliberately not `clsx` + `tailwind-merge`. LUMORA has neither installed, and
 * a design system that pulls in two packages to concatenate strings is a poor
 * trade at this size. Conditional classes are the only feature needed here; if
 * conflicting-utility resolution is ever required, that is the moment to add
 * `tailwind-merge` and this function is the single place to change.
 */
export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, boolean | undefined | null>;

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  const walk = (value: ClassValue) => {
    if (!value) return;
    if (typeof value === "string" || typeof value === "number") {
      out.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    for (const [key, on] of Object.entries(value)) {
      if (on) out.push(key);
    }
  };

  inputs.forEach(walk);
  return out.join(" ");
}
