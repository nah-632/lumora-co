/**
 * LUMORA UI primitives.
 *
 * Import from here rather than from a file path, so a component can move without
 * every call site changing:
 *
 *   import { Button, Card, SegmentedControl } from "@/components/ui";
 *
 * The barrel is deliberately the ONLY place these are re-exported. A second
 * entry point would let two components drift apart.
 */

export { cn } from "./cn";
export type { ClassValue } from "./cn";

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from "./Card";
export type { CardProps, CardTone, CardPadding } from "./Card";

export { Input, Select } from "./Input";
export type { InputProps, SelectProps, SelectOption, FieldShellProps } from "./Input";

export { SegmentedControl } from "./SegmentedControl";
export type { SegmentedControlProps, Segment } from "./SegmentedControl";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

export { AiResult } from "./AiResult";
export type { AiResultProps } from "./AiResult";

export { Sidebar } from "./Sidebar";
export type { SidebarProps, NavItem } from "./Sidebar";

export { BottomNav, BottomNavSpacer } from "./BottomNav";
export type { BottomNavProps } from "./BottomNav";

export * as Icons from "./icons";
