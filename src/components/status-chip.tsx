import { cn } from "@/lib/utils";
import {
  PRIORITY_DOT,
  PRIORITY_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
  type Status,
} from "@/lib/complaints/display";

export function StatusChip({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/** A dot and a word. See PRIORITY_DOT for why it is not coloured text. */
export function PriorityTag({
  priority,
  className,
}: {
  priority: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm whitespace-nowrap",
        priority === "urgent" ? "font-medium" : "",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          PRIORITY_DOT[priority] ?? "bg-muted-foreground/50",
        )}
      />
      {PRIORITY_LABEL[priority] ?? priority}
    </span>
  );
}
