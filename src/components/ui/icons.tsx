/**
 * Inline Lucide-style icons.
 *
 * WHY NOT `lucide-react`: it is not a dependency of this project, and adding one
 * for a dozen glyphs is a larger decision than a design-system task should make.
 * The project already hand-writes icons this way (see SiteHeader.tsx), so this
 * file follows the existing pattern rather than introducing a second one.
 *
 * The rules from DESIGN.md, applied to every icon here:
 *   - 24x24 viewBox, `stroke="currentColor"`, strokeWidth 1.5
 *   - round caps and joins
 *   - `aria-hidden` by default: an icon sits next to a label, and a screen
 *     reader announcing "chevron down" beside "المرحلة" is noise. Pass
 *     `title` when the icon IS the label, and it becomes an <img role>.
 *   - DIRECTIONAL icons are mirrored in RTL. See `.icon-directional` in
 *     globals.css — a chevron that still points right in Arabic points the
 *     wrong way, and it is the single most common RTL bug in a UI kit.
 */

import type { SVGProps } from "react";
import { cn } from "./cn";

export interface IconProps extends SVGProps<SVGSVGElement> {
  /** Rendered size in px. Sizes are grid-aligned: 16, 20, 24. */
  size?: number;
  /** Accessible name. Omit when the icon is decorative and a label sits beside it. */
  title?: string;
}

function Svg({ size = 24, title, className, children, ...rest }: IconProps) {
  const labelled = Boolean(title);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden={labelled ? undefined : true}
      role={labelled ? "img" : undefined}
      focusable="false"
      {...rest}
    >
      {labelled ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Directional — these mirror in RTL                                          */
/* -------------------------------------------------------------------------- */

export const ChevronDown = (p: IconProps) => (
  <Svg {...p} className={cn(p.className)}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

/** Points to the inline-end edge in LTR. Mirrors so it stays "forward" in RTL. */
export const ChevronForward = (p: IconProps) => (
  <Svg {...p} className={cn("icon-directional", p.className)}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
);

/** Points back along the inline axis. Mirrors. */
export const ChevronBack = (p: IconProps) => (
  <Svg {...p} className={cn("icon-directional", p.className)}>
    <path d="m15 18-6-6 6-6" />
  </Svg>
);

/** Arrow along the inline axis. Mirrors. */
export const ArrowForward = (p: IconProps) => (
  <Svg {...p} className={cn("icon-directional", p.className)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const Close = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const AlertTriangle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </Svg>
);

export const InfoCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" />
  </Svg>
);

export const Loader = (p: IconProps) => (
  <Svg {...p} className={cn("animate-spin", p.className)}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </Svg>
);

/* -------------------------------------------------------------------------- */
/* Domain                                                                     */
/* -------------------------------------------------------------------------- */

export const BookOpen = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 7v14" />
    <path d="M3 18a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3Z" />
  </Svg>
);

export const FileText = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8" />
  </Svg>
);

export const ClipboardList = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M9 2h6v4H9zM9 12h6M9 16h4" />
  </Svg>
);

export const Users = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

export const Calendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Svg>
);

export const Layers = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5" />
  </Svg>
);

export const Bell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
  </Svg>
);

export const Settings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 3 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Svg>
);

export const Search = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Svg>
);

export const Inbox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1Z" />
  </Svg>
);

export const Plus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
