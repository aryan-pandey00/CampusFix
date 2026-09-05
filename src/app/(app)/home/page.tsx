import Link from "next/link";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  PlusCircle,
  Wrench,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusChip } from "@/components/status-chip";
import { CategoryMark } from "@/components/category-mark";
import { Medallion } from "@/components/medallion";
import { EmptyState, Page, Panel, Stat } from "@/components/page";
import { buttonVariants } from "@/components/ui/button";
import {
  ACTIVE_STATUSES,
  formatRelative,
  relName,
  type Status,
} from "@/lib/complaints/display";
import { NoticeList, type Notice } from "@/components/notice-list";

export const metadata = { title: "Home · CampusFix" };

export default async function StudentHomePage() {
  const session = await requireUser();
  const supabase = await createClient();

  // RLS already restricts both of these, so there is no reporter filter and
  // no date filter here — adding either would imply the safety came from the
  // query.
  const [{ data: complaints }, { data: notices }] = await Promise.all([
    supabase
      .from("complaints")
      .select(
        "id, ticket_no, title, status, category, location_detail, created_at, locations(name), departments(name)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("announcements")
      .select(
        "id, title, body, location_id, starts_at, ends_at, locations(name)",
      )
      .order("starts_at", { ascending: false }),
  ]);

  const announcements = (notices ?? []) as Notice[];

  const all = complaints ?? [];
  const active = all.filter((c) =>
    ACTIVE_STATUSES.includes(c.status as Status),
  );
  const waitingOnYou = all.filter((c) => c.status === "resolved");
  /*
     Capped for the same reason the notices above it are: five live notices once
     made this panel's own header 83% of a phone screen, and this list had no
     cap of its own — so a student with a dozen unconfirmed fixes pushed the
     figures and their complaint list off the bottom instead. Three keeps the
     one thing they have to do visible without becoming the page.
  */
  const CONFIRM_MAX = 3;
  const toConfirm = waitingOnYou.slice(0, CONFIRM_MAX);
  const closed = all.filter((c) => c.status === "closed");

  const firstName = (session.fullName ?? "").trim().split(" ")[0];

  return (
    <Page
      title={firstName ? `Hello, ${firstName}` : "Your complaints"}
      description={
        all.length === 0
          ? "Nothing reported yet. When something on campus is broken, this is where it goes."
          : "Everything you have reported, and what is waiting on you."
      }
      actions={
        <Link href="/report" className={buttonVariants()}>
          <PlusCircle className="size-4" />
          Report an issue
        </Link>
      }
    >
      {/* The one thing a student can act on leads the page. */}
      {/* Above everything else, because it is the one thing on this screen the
          student has not already been told. */}
      <NoticeList
        notices={announcements}
        className="mb-5"
        max={2}
        moreHref="/notices"
      />

      {waitingOnYou.length > 0 ? (
        <section className="mb-5 overflow-hidden rounded-[var(--radius)] border border-border border-l-[3px] border-l-primary bg-card shadow-xs">
          <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
            {/* Was a hand-rolled span with its own size, radius and tint —
                the fourth one of those in the app, which is why Medallion
                exists. `md` is 36px against the 32px this was; the difference
                is that this one is now the same mark as every other. */}
            <Medallion
              icon={CheckCircle2}
              tone="primary"
              size="md"
              className="mt-0.5"
            />
            <div className="min-w-0">
              {/* No count in the heading: the row of figures below already
                  carries it, and the list itself shows which ones. */}
              <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
                Confirm these fixes
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                The maintenance office says these are done. Take a look, then
                confirm or reopen.
              </p>
              {waitingOnYou.length > CONFIRM_MAX ? (
                <Link
                  href="/my-complaints?status=resolved"
                  className="mt-2 inline-block text-sm font-medium text-primary underline underline-offset-4"
                >
                  See all {waitingOnYou.length}
                </Link>
              ) : null}
            </div>
          </div>
          <ul className="space-y-2 px-4 pb-4 sm:px-5">
            {toConfirm.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/complaints/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-background px-3.5 py-3 transition-colors hover:border-primary/40"
                >
                  <span className="min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.ticket_no}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-medium">
                      {c.title}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Three marks, and each is the one already used for that idea elsewhere. */}
      <div className="mb-5 grid grid-cols-3 gap-3 sm:gap-4">
        {/*
           "Still open", not "Being worked on". This counts open, assigned and
           in_progress — and `open` with no department is a complaint nobody
           has picked up yet. Measured on real data: 29 of the 59 it was calling
           "being worked on" had no department at all, and three students' home
           screens said it about complaints where that was the whole count.
           The status chip on each row still says which of the three it is.
        */}
        <Stat label="Still open" value={active.length} icon={Wrench} />
        <Stat
          label="Waiting on you"
          value={waitingOnYou.length}
          tone={waitingOnYou.length > 0 ? "warn" : undefined}
          icon={CheckCircle2}
        />
        <Stat label="Finished" value={closed.length} icon={Archive} />
      </div>

      <Panel
        title="Your complaints"
        description="Newest first"
        bodyClassName=""
        actions={
          all.length > 5 ? (
            <Link
              href="/my-complaints"
              className="text-xs font-medium text-primary underline underline-offset-4"
            >
              See all {all.length}
            </Link>
          ) : null
        }
      >
        {all.length > 0 ? (
          <ul className="divide-y divide-border">
            {all.slice(0, 5).map((c) => {
              const where = [relName(c.locations), c.location_detail]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={c.id}>
                  <Link
                    href={`/complaints/${c.id}`}
                    className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-accent/40 sm:items-center sm:px-5"
                  >
                    {/* What kind of problem it is, which this list never said. */}
                    <CategoryMark category={c.category} />
                    {/* The row's own stacking stays inside a wrapper so the
                        mark keeps its place while the text and the status still
                        stack on a phone and sit apart above `sm`. */}
                    <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="min-w-0">
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.ticket_no}
                        </span>
                        <span className="mt-0.5 block truncate text-sm font-medium">
                          {c.title}
                        </span>
                        {where ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {where}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="tnum text-xs text-muted-foreground">
                          {formatRelative(c.created_at)}
                        </span>
                        <StatusChip
                          status={c.status as Status}
                          className="w-[5.5rem] justify-center"
                        />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Nothing reported yet"
            description="A broken fan, a leaking tap, no Wi-Fi in the library — report it and you will be able to follow what happens."
            action={
              <Link
                href="/report"
                className={buttonVariants({ variant: "outline" })}
              >
                Report your first issue
              </Link>
            }
          />
        )}
      </Panel>
    </Page>
  );
}
