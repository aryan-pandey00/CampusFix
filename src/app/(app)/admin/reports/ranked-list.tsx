import Link from "next/link";
import { cn } from "@/lib/utils";

export type RankedRow = {
  key: string;
  name: string;
  /** Meter length, 0–1, relative to the largest row in the list. */
  fraction: number;
  /** The figure at the end of the row. */
  value: string;
  /** A smaller trailing fact: "3 still open", "across 4 resolved". */
  note?: string;
  /** Amber-dots the note. For counts that mean unfinished work. */
  noteTone?: "warn";
  /** Where clicking the row goes — the queue, already filtered. */
  href?: string;
};

/** A ranked list with a meter, in place of a horizontal bar chart. */
export function RankedList({ rows }: { rows: RankedRow[] }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => {
        const body = (
          <>
            {/* Flexible below sm, where the meter is hidden and a fixed 152px
                clipped the longest department name with 116px going spare. */}
            <span className="min-w-0 flex-1 truncate text-sm sm:w-[11rem] sm:flex-none">
              {r.name}
            </span>
            <span
              aria-hidden
              className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-muted sm:block"
            >
              {/* A chart token, not the brand colour at 70%. */}
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max(2, r.fraction * 100)}%`,
                  background: "var(--chart-4)",
                }}
              />
            </span>
            <span className="tnum ml-auto w-[4.25rem] shrink-0 text-right text-sm font-medium whitespace-nowrap sm:ml-0">
              {r.value}
            </span>
            {/* Fixed width whether or not there is a note, so the figures above
                and below it stay in one column. */}
            <span className="tnum hidden w-[6.5rem] shrink-0 items-center justify-end gap-1.5 text-xs text-muted-foreground sm:flex">
              {r.note ? (
                <>
                  {r.noteTone === "warn" ? (
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full bg-amber-500"
                    />
                  ) : null}
                  {r.note}
                </>
              ) : null}
            </span>
          </>
        );

        const shell = cn(
          "flex items-center gap-3 px-4 py-[0.6875rem] sm:px-5",
          r.href && "transition-colors hover:bg-accent/40",
        );

        return (
          <li key={r.key}>
            {r.href ? (
              <Link href={r.href} className={shell}>
                {body}
              </Link>
            ) : (
              <div className={shell}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
