import {
  ArrowRight,
  Broom,
  CheckCircle2,
  CircleHelp,
  ClipboardPlus,
  Droplets,
  Forward,
  Hammer,
  HardHat,
  MessageSquare,
  Monitor,
  Repeat,
  Undo2,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { TimelineEvent } from "./display";

/** One icon per thing, decided once. */

/** Categories, keyed to CATEGORIES in schema.ts. */
export const CATEGORY_ICON: Record<string, LucideIcon> = {
  electrical: Zap,
  plumbing: Droplets,
  carpentry: Hammer,
  it_network: Monitor,
  housekeeping: Broom,
  civil: HardHat,
  other: CircleHelp,
};

/** Departments, keyed by SLUG rather than name. */
export const DEPARTMENT_ICON: Record<string, LucideIcon> = {
  electrical: Zap,
  plumbing: Droplets,
  carpentry: Hammer,
  "it-network": Monitor,
  housekeeping: Broom,
  civil: HardHat,
  general: Wrench,
};

/** Timeline events. */
export const EVENT_ICON: Record<TimelineEvent["type"], LucideIcon> = {
  created: ClipboardPlus,
  assigned: Forward,
  status: ArrowRight,
  note: MessageSquare,
  confirmed: CheckCircle2,
  reopened: Repeat,
  returned: Undo2,
};

/** The trade's own colour. */
const TRADE_TINT: Record<string, string> = {
  electrical:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300",
  plumbing: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  carpentry:
    "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  it_network:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  housekeeping: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  civil:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
};

/* One key for both maps, because the two disagree by one character. */
const trade = (key: string) => key.replace(/-/g, "_");

/** Tailwind classes for a category's medallion, or "" for no tint. */
export function categoryTint(category: string | null | undefined): string {
  return (category && TRADE_TINT[trade(category)]) || "";
}

/** The same colour, reached by the department's slug. */
export function departmentTint(slug: string | null | undefined): string {
  return (slug && TRADE_TINT[trade(slug)]) || "";
}

/* Read through a function, never indexed directly. */

export function categoryIcon(category: string | null | undefined): LucideIcon {
  return (category && CATEGORY_ICON[category]) || CircleHelp;
}

/** Pass the department's slug, not its name. */
export function departmentIcon(slug: string | null | undefined): LucideIcon {
  return (slug && DEPARTMENT_ICON[slug]) || Wrench;
}

export function eventIcon(type: string | null | undefined): LucideIcon {
  return (
    (type && EVENT_ICON[type as TimelineEvent["type"]]) || MessageSquare
  );
}
