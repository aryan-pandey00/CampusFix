import Link from "next/link";
import { RAMP_STEPS, rampVar } from "@/lib/complaints/display";
import { cn } from "@/lib/utils";

export type Segment = {
  key: string;
  name: string;
  count: number;
  /** Still open, if that is worth saying. */
  open?: number;
  href?: string;
};

/*
   The ramp has six steps and `rampVar` clamps, so a seventh part came out the
   same colour as the sixth — two legend rows painted identically, which is the
   one thing a legend cannot do. There are exactly seven complaint categories,
   so that was not an edge case but the normal state of this bar.

   Anything past the ramp is therefore neutral rather than a repeated green: one
   leftover keeps its own name, several are added together. Extending the ramp
   instead was the wrong answer — its adjacent steps already measure ΔE 7 and a
   seventh would be two pale greens nobody could tell apart at 12px wide.
*/
function paintedParts(segments: Segment[]): Array<Segment & { paint: string }> {
  const named = segments.slice(0, RAMP_STEPS).map((s, i) => ({
    ...s,
    paint: rampVar(i),
  }));
  const tail = segments.slice(RAMP_STEPS);
  const TAIL_PAINT = "var(--muted-foreground)";
  if (tail.length === 0) return named;
  if (tail.length === 1) return [...named, { ...tail[0], paint: TAIL_PAINT }];
  return [
    ...named,
    {
      key: "rest",
      name: `${tail.length} other kinds`,
      count: tail.reduce((n, s) => n + s.count, 0),
      open: tail.reduce((n, s) => n + (s.open ?? 0), 0),
      paint: TAIL_PAINT,
    },
  ];
}

/** One measure split into parts, as a single bar with the parts named beneath. */
export function StackedBar({
  segments,
  className,
}: {
  segments: Segment[];
  className?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return null;

  const parts = paintedParts(segments);
  const share = (n: number) => (n / total) * 100;

  return (
    <div className={className}>
      {/* A 2px gap between parts, drawn as a border in the page's own
          background rather than a margin, so the parts stay flush against the
          bar's rounded ends. */}
      <div className="flex h-9 overflow-hidden rounded-[var(--radius-md)]">
        {parts.map((s, i) => {
          const width = `${share(s.count)}%`;
          const body = (
            <span
              className="grid h-full place-items-center"
              style={{ background: s.paint }}
            >
              {/* The label goes inside the part only when the part is wide
                  enough to hold it. */}
              {share(s.count) >= 18 ? (
                <span className="truncate px-2 text-xs font-medium text-white">
                  {s.name}
                  <span className="ml-1.5 tnum opacity-80">
                    {Math.round(share(s.count))}%
                  </span>
                </span>
              ) : null}
            </span>
          );

          return (
            <div
              key={s.key}
              style={{ width }}
              className={cn(
                "min-w-0 shrink-0",
                i > 0 && "border-l-2 border-background",
              )}
              title={`${s.name}: ${s.count} of ${total}`}
            >
              {s.href ? (
                <Link
                  href={s.href}
                  className="block h-full transition-opacity hover:opacity-85"
                >
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          );
        })}
      </div>

      {/* The legend is the list the bar replaced: name, count, and what is
          still open. */}
      <ul
        className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-flow-col"
        style={{
          gridTemplateRows: `repeat(${Math.ceil(parts.length / 2)}, auto)`,
        }}
      >
        {parts.map((s) => {
          const row = (
            <>
              <span
                aria-hidden
                className="mt-[0.3em] size-2.5 shrink-0 rounded-[3px]"
                style={{ background: s.paint }}
              />
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <span className="tnum font-medium">{s.count}</span>
              {s.open ? (
                <span className="tnum inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-amber-500"
                  />
                  {s.open} open
                </span>
              ) : (
                // Reserved, so the counts stay in one column down the legend.
                <span className="w-[4.5rem]" />
              )}
            </>
          );
          return (
            <li key={s.key} className="text-sm">
              {s.href ? (
                <Link
                  href={s.href}
                  className="-mx-2 flex items-baseline gap-2 rounded-[var(--radius-md)] px-2 py-0.5 transition-colors hover:bg-accent/40"
                >
                  {row}
                </Link>
              ) : (
                <span className="flex items-baseline gap-2 px-0 py-0.5">
                  {row}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
