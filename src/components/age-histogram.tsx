import { cn } from "@/lib/utils";

export type AgeBucket = { label: string; short: string; count: number };

/** How old the unfinished work is, in four buckets. */
export function AgeHistogram({
  buckets,
  className,
}: {
  buckets: AgeBucket[];
  className?: string;
}) {
  const most = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const lastIndex = buckets.length - 1;

  return (
    <div className={className}>
      <div className="flex h-[8.5rem] items-end gap-2 sm:gap-3">
        {buckets.map((b, i) => {
          const worst = i === lastIndex && b.count > 0;
          return (
            <div
              key={b.label}
              className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5"
            >
              <span
                className={cn(
                  "tnum text-center text-sm font-semibold",
                  b.count === 0 && "text-muted-foreground/50",
                )}
              >
                {b.count}
              </span>
              {/* An empty bucket keeps a 2px stub rather than nothing at all. */}
              <span
                aria-hidden
                className={cn(
                  "block w-full rounded-t-[3px]",
                  b.count === 0 && "bg-border",
                )}
                style={
                  b.count === 0
                    ? { height: 2 }
                    : {
                        height: `${Math.max(6, (b.count / most) * 100)}%`,
                        background: worst
                          ? "var(--chart-open)"
                          : "var(--chart-4)",
                      }
                }
              />
            </div>
          );
        })}
      </div>

      {/* Labels below the axis line, short on a phone and spelled out from
          `sm` — "8 to 30 days" in a 70px column becomes three lines. */}
      <div className="mt-2 flex gap-2 border-t border-border pt-2 sm:gap-3">
        {buckets.map((b) => (
          <span
            key={b.label}
            className="min-w-0 flex-1 text-center text-[11px] leading-tight text-muted-foreground"
          >
            <span className="sm:hidden">{b.short}</span>
            <span className="hidden sm:inline">{b.label}</span>
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {total === 0
          ? "Nothing is open."
          : `${total} still open. Counted from when each was filed.`}
      </p>
    </div>
  );
}
