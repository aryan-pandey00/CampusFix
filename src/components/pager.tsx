import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Previous / the page numbers / Next, for a `Panel` footer. */
export function Pager({
  page,
  lastPage,
  href,
}: {
  page: number;
  lastPage: number;
  href: (page: number) => string;
}) {
  if (lastPage <= 1) return null;

  return (
    <nav className="flex items-center justify-between gap-2">
      <PageLink href={href(page - 1)} disabled={page === 1} direction="prev" />
      <ol className="flex items-center gap-1">
        {pageWindow(page, lastPage).map((n, i) =>
          n === null ? (
            // A gap, not a control. It is not focusable and it is not a link,
            // because "…" that does nothing when pressed is worse than a gap.
            <li
              key={`gap-${i}`}
              aria-hidden
              className="px-0.5 text-muted-foreground/60 select-none"
            >
              &hellip;
            </li>
          ) : (
            <li key={n}>
              <Link
                href={href(n)}
                aria-label={`Page ${n}`}
                aria-current={n === page ? "page" : undefined}
                className={cn(
                  "tnum grid size-6 place-items-center rounded-md text-xs transition-colors",
                  n === page
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "font-medium text-foreground hover:bg-accent",
                )}
              >
                {n}
              </Link>
            </li>
          ),
        )}
      </ol>
      <PageLink
        href={href(page + 1)}
        disabled={page === lastPage}
        direction="next"
      />
    </nav>
  );
}

/**
 * The pages to show: the first, the last, the current and its neighbours, with
 * `null` standing for a gap.
 */
function pageWindow(page: number, lastPage: number): Array<number | null> {
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, lastPage, page]);
  // Two either side near the ends, one either side in the middle: near an end
  // there is no gap to spend a slot on, so the run gets longer instead.
  const reach = page <= 3 || page >= lastPage - 2 ? 2 : 1;
  for (let d = 1; d <= reach; d++) {
    if (page - d > 1) pages.add(page - d);
    if (page + d < lastPage) pages.add(page + d);
  }
  if (page <= 3) for (let n = 2; n <= 5; n++) pages.add(n);
  if (page >= lastPage - 2)
    for (let n = lastPage - 4; n < lastPage; n++) pages.add(n);

  const sorted = [...pages]
    .filter((n) => n >= 1 && n <= lastPage)
    .sort((a, b) => a - b);
  const out: Array<number | null> = [];
  for (const [i, n] of sorted.entries()) {
    if (i > 0 && n - sorted[i - 1]! > 1) out.push(null);
    out.push(n);
  }
  return out;
}

function PageLink({
  href,
  disabled,
  direction,
}: {
  href: string;
  disabled: boolean;
  direction: "prev" | "next";
}) {
  const label = direction === "prev" ? "Previous" : "Next";
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const content =
    direction === "prev" ? (
      <>
        <Icon className="size-3.5" />
        {label}
      </>
    ) : (
      <>
        {label}
        <Icon className="size-3.5" />
      </>
    );

  // A dead end is rendered as text, not as a link that goes nowhere: a
  // disabled anchor is still focusable and still navigates.
  if (disabled) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground/50">
        {content}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 font-medium text-primary transition-opacity hover:opacity-80"
    >
      {content}
    </Link>
  );
}
