import Link from "next/link";
import { ClipboardList, PlusCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusChip } from "@/components/status-chip";
import { CategoryMark } from "@/components/category-mark";
import { EmptyState, Page, Panel } from "@/components/page";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  STATUS_LABEL,
  formatRelative,
  relName,
  type Status,
} from "@/lib/complaints/display";

export const metadata = { title: "My complaints · CampusFix" };

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: STATUS_LABEL.open },
  { value: "assigned", label: STATUS_LABEL.assigned },
  { value: "in_progress", label: STATUS_LABEL.in_progress },
  { value: "resolved", label: STATUS_LABEL.resolved },
  { value: "closed", label: STATUS_LABEL.closed },
];

export default async function MyComplaintsPage({
  searchParams,
}: PageProps<"/my-complaints">) {
  await requireUser();
  const { status } = await searchParams;
  const active = typeof status === "string" && status !== "all" ? status : "all";

  const supabase = await createClient();

  // No reporter_id filter here: the RLS policy already restricts this to the
  // signed-in student's own rows. Adding one would imply the safety came from
  // this query, which is exactly the assumption RLS exists to remove.
  /*
     Every row, filtered here rather than in the query. Six chips with no
     figures on them meant five dead ends for anyone with one complaint: you
     had to click each to find out it was empty. One read answers all six, and
     it is the same read /home already does.
  */
  const { data: mine, error } = await supabase
    .from("complaints")
    .select(
      "id, ticket_no, title, status, category, location_detail, created_at, locations(name), departments(name)",
    )
    .order("created_at", { ascending: false });

  const all = mine ?? [];
  const countOf = (value: string) =>
    value === "all" ? all.length : all.filter((c) => c.status === value).length;
  const complaints = active === "all" ? all : all.filter((c) => c.status === active);

  return (
    <Page
      title="My complaints"
      description="Everything you have reported, newest first."
      actions={
        <Link href="/report" className={buttonVariants({ variant: "outline" })}>
          <PlusCircle className="size-4" />
          Report an issue
        </Link>
      }
    >
      <nav className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const n = countOf(f.value);
          const on = active === f.value;
          return (
            <Link
              key={f.value}
              href={
                f.value === "all"
                  ? "/my-complaints"
                  : `/my-complaints?status=${f.value}`
              }
              aria-current={on ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : n === 0
                    // Empty, and saying so is the point. Still a link: the
                    // count can change while the page is open.
                    ? "border-border/70 bg-card text-muted-foreground/60 hover:text-muted-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-ring/40 hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "tnum text-xs",
                  on ? "text-primary-foreground/75" : "text-muted-foreground/70",
                )}
              >
                {n}
              </span>
            </Link>
          );
        })}
      </nav>

      {error ? (
        <p className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : (
        <Panel bodyClassName="">
          {complaints && complaints.length > 0 ? (
            <ul className="divide-y divide-border">
              {complaints.map((c) => {
                const where = [relName(c.locations), c.location_detail]
                  .filter(Boolean)
                  .join(" · ");
                const dept = relName(c.departments);

                return (
                  <li key={c.id}>
                    <Link
                      href={`/complaints/${c.id}`}
                      className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-accent/40 sm:items-center sm:px-5"
                    >
                      {/* THE BUG THIS FIXES, and it is not the one it looks
                          like. */}
                      <CategoryMark category={c.category} />
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <span className="font-mono text-xs text-muted-foreground">
                            {c.ticket_no}
                          </span>
                          <p className="mt-1 truncate text-[15px] font-medium tracking-[-0.01em]">
                            {c.title}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {where}
                            {dept ? ` — ${dept}` : ""}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-xs text-muted-foreground tnum">
                            {formatRelative(c.created_at)}
                          </span>
                          <StatusChip status={c.status as Status} />
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title={
                active === "all"
                  ? "You have not reported anything yet"
                  : `Nothing ${STATUS_LABEL[active as Status]?.toLowerCase() ?? active}`
              }
              description={
                active === "all"
                  ? "Anything you report shows up here, with its ticket number and where it has got to."
                  : "Try another filter, or report something new."
              }
              action={
                <Link
                  href="/report"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Report an issue
                </Link>
              }
            />
          )}
        </Panel>
      )}
    </Page>
  );
}
