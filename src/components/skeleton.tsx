import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}

/** Shown while a screen's data is still being fetched. */
export function PageSkeleton({
  rows = 6,
  title = true,
}: {
  rows?: number;
  title?: boolean;
}) {
  const column = "mx-auto w-full max-w-5xl px-5 sm:px-8";

  return (
    <>
      <span className="sr-only" role="status">
        Loading
      </span>

      {title ? (
        <div className="border-b border-border bg-card">
          <div className={`${column} py-6 lg:py-7`}>
            <Skeleton className="h-7 w-44" />
            <Skeleton className="mt-2.5 h-4 w-72" />
          </div>
        </div>
      ) : null}

      <div className={`${column} py-6 lg:py-8`}>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-[var(--radius)]" />
          ))}
        </div>
      </div>
    </>
  );
}
