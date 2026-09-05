export type Status =
  | "open"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed";

export const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

/** Status chips. */
export const STATUS_CLASS: Record<Status, string> = {
  open: "border-border bg-transparent text-muted-foreground",
  assigned:
    "border-transparent bg-secondary text-secondary-foreground",
  in_progress:
    "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  resolved:
    "border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
  closed: "border-transparent bg-muted text-muted-foreground",
};

/** What the student is waiting on, in their words rather than the schema's. */
export const STATUS_MEANING: Record<Status, string> = {
  open: "Filed and waiting to be picked up.",
  assigned: "Handed to a department. Work has not started yet.",
  in_progress: "Someone is working on it now.",
  resolved: "Marked fixed. Check it, then confirm or reopen.",
  closed: "Confirmed fixed by you.",
};

/**
 * The three groups a chart is allowed to use, and the only place colour
 * carries meaning on its own.
 */
export type StatusGroup = "open" | "active" | "done";

export const STATUS_GROUP: Record<Status, StatusGroup> = {
  open: "open",
  assigned: "active",
  in_progress: "active",
  resolved: "done",
  closed: "done",
};

/** Left to right, and the order work actually moves in. */
export const GROUP_ORDER: StatusGroup[] = ["open", "active", "done"];

/** The statuses in each group, derived rather than written out. */
export const GROUP_STATUSES: Record<StatusGroup, Status[]> = GROUP_ORDER.reduce(
  (acc, group) => {
    acc[group] = (Object.keys(STATUS_GROUP) as Status[]).filter(
      (s) => STATUS_GROUP[s] === group,
    );
    return acc;
  },
  {} as Record<StatusGroup, Status[]>,
);

/** A group name from a `status` URL parameter, or null if it names one status. */
export function statusGroupParam(value: string): StatusGroup | null {
  return value === "active" || value === "done" ? value : null;
}

export const GROUP_LABEL: Record<StatusGroup, string> = {
  open: "Not started",
  active: "In hand",
  done: "Done",
};

/** The colour, as a `var()` rather than a class name. */
export const GROUP_VAR: Record<StatusGroup, string> = {
  open: "var(--chart-open)",
  active: "var(--chart-active)",
  done: "var(--chart-done)",
};

/** A step of the single-hue ramp, darkest first. */
export const RAMP_STEPS = 6;

export function rampVar(index: number): string {
  return `var(--chart-${Math.min(RAMP_STEPS, Math.max(1, index + 1))})`;
}

export const PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  high: "High",
  medium: "Medium",
  urgent: "Urgent",
};

/** Priority as a dot, not as coloured words. */
export const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-destructive",
  high: "bg-amber-500",
  medium: "bg-muted-foreground/50",
  low: "border border-muted-foreground/50 bg-transparent",
};

/** The same four steps as text, for an icon rather than a dot. */
export const PRIORITY_INK: Record<string, string> = {
  urgent: "text-destructive",
  high: "text-amber-600 dark:text-amber-400",
  medium: "text-muted-foreground",
  low: "text-muted-foreground/60",
};

/** Must stay in step with CATEGORIES in schema.ts. */
export const CATEGORY_LABEL: Record<string, string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  carpentry: "Carpentry & Furniture",
  it_network: "IT & Network",
  housekeeping: "Cleaning & Housekeeping",
  civil: "Building & Infrastructure",
  other: "Something else",
};

/** Timestamps are rendered in campus time, not the server's. */
const WHEN = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export function formatWhen(iso: string) {
  return WHEN.format(new Date(iso));
}

/** Date with no time, for a column headed "Joined". */
const DAY = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

export function formatDay(iso: string) {
  return DAY.format(new Date(iso));
}

export function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatWhen(iso);
}

/** Compact age for a table column: "40m", "9h", "21d". */
export function formatAge(iso: string): string {
  const mins = (Date.now() - new Date(iso).getTime()) / 60000;
  if (mins < 60) return `${Math.max(1, Math.round(mins))}m`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export type TimelineEvent = {
  id: string;
  type:
    | "created"
    | "assigned"
    | "status"
    | "note"
    | "confirmed"
    | "reopened"
    | "returned";
  from_status: Status | null;
  to_status: Status | null;
  note: string | null;
  is_internal: boolean;
  created_at: string;
  actor_id: string | null;
};

/** Event types as short labels, for a filter and a column. */
export const EVENT_LABEL: Record<TimelineEvent["type"], string> = {
  created: "Filed",
  assigned: "Assigned",
  status: "Status change",
  note: "Note added",
  confirmed: "Confirmed fixed",
  reopened: "Reopened",
  returned: "Sent back",
};

/** One line describing what happened. */
const FALLBACK: Record<TimelineEvent["type"], string> = {
  created: "The student",
  confirmed: "The student",
  reopened: "The student",
  assigned: "The office",
  status: "The office",
  note: "The office",
  returned: "The department",
};
export function describeEvent(
  event: TimelineEvent,
  viewerId: string,
  departmentName?: string | null,
  actorName?: string | null,
) {
  const mine = event.actor_id != null && event.actor_id === viewerId;
  const who = mine ? "You" : (actorName ?? FALLBACK[event.type] ?? "The office");

  switch (event.type) {
    case "created":
      return { who, text: "filed this complaint" };
    case "assigned":
      return {
        who,
        text: departmentName
          ? `assigned it to ${departmentName}`
          : "assigned it to a department",
      };
    case "status":
      return {
        who,
        text:
          event.from_status && event.to_status
            ? `moved it from ${STATUS_LABEL[event.from_status]} to ${STATUS_LABEL[event.to_status]}`
            : event.to_status
              ? `moved it to ${STATUS_LABEL[event.to_status]}`
              : "changed the status",
      };
    case "note":
      return { who, text: "added a note" };
    case "confirmed":
      return { who, text: "confirmed the fix" };
    case "reopened":
      return { who, text: "reopened it" };
    case "returned":
      return { who, text: "sent it back to the office" };
    default:
      return { who, text: "updated it" };
  }
}

/** Reads `name` off an embedded relation. */
export function relName(rel: unknown): string | null {
  if (!rel) return null;
  const one = Array.isArray(rel) ? rel[0] : rel;
  return (one as { name?: string } | undefined)?.name ?? null;
}

/** The same shape juggling as relName, for an embed selected as `full_name`. */
export function relFullName(rel: unknown): string | null {
  if (!rel) return null;
  const one = Array.isArray(rel) ? rel[0] : rel;
  return (one as { full_name?: string } | undefined)?.full_name ?? null;
}

/** Compact human duration, for "average time to resolve". */
export function formatDuration(ms: number): string {
  const minutes = ms / 60000;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)} hr`;
  return `${(hours / 24).toFixed(1)} days`;
}

/** Statuses that still represent work someone has to do. */
export const ACTIVE_STATUSES: Status[] = ["open", "assigned", "in_progress"];

/**
 * The queue's default order: unfinished first, urgent before low within each
 * status, oldest first within each priority.
 */
export const QUEUE_ORDER = [
  { column: "status", ascending: true },
  { column: "priority", ascending: false },
  { column: "created_at", ascending: true },
] as const;

/** Timestamp before which an unresolved complaint counts as ageing. */
export function ageingCutoff(days: number): number {
  return Date.now() - days * 86_400_000;
}
