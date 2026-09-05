import { Globe, MapPin, Megaphone } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Medallion } from "@/components/medallion";
import { EmptyState, Page, Panel } from "@/components/page";
import {
  countdown,
  phaseOf,
  remainingShare,
  windowLabel,
  type Announcement,
  type Phase,
} from "@/lib/complaints/announcements";
import { cn } from "@/lib/utils";
import { Compose } from "./compose";
import { RowActions } from "./row-actions";

export const metadata = { title: "Announcements · CampusFix" };

export default async function AnnouncementsPage() {
  await requireAdmin();
  const supabase = await createClient();

  // The admin sees every row, including the finished ones — that is what
  // `public.is_admin()` is doing in announcements_select. A student's query
  // against the same table returns only what is live.
  const [{ data: rows }, { data: locations }] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, location_id, starts_at, ends_at")
      .order("starts_at", { ascending: false }),
    supabase
      .from("locations")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const all = (rows ?? []) as Announcement[];
  const placeName = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const of = (phase: Phase) => all.filter((a) => phaseOf(a) === phase);
  const live = of("live");
  const scheduled = of("scheduled");
  const ended = of("ended");

  return (
    <Page
      title="Announcements"
      /*
         The count belongs here rather than in the eyebrows, because it is the
         one thing worth knowing before reading anything: how much is on the
         board.
      */
      description={
        live.length === 0
          ? "Nothing is showing right now."
          : `${live.length} showing right now, and each one expires on its own.`
      }
      icon={Megaphone}
      width="wide"
    >
      <div className="grid items-start gap-5 xl:grid-cols-3">
        {/*
          The panels title themselves rather than sitting under an eyebrow.

          An eyebrow is 27px of text above the card, and the compose panel
          beside it has none — so the two columns of a two-column grid started
          at different heights and the row read as broken. The label had to
          live either above both cards or inside both, and inside is where a
          card that already has a header strip wants it.
        */}
        <div className="space-y-5 xl:col-span-2">
          <Panel title="Live now" bodyClassName="">
            {live.length > 0 ? (
              <List rows={live} placeName={placeName} />
            ) : (
              <EmptyState
                icon={Megaphone}
                title="Nothing is showing"
                description="Students see no notices at the moment."
              />
            )}
          </Panel>

          {scheduled.length > 0 ? (
            <Panel
              title="Scheduled"
              description="Not showing yet."
              bodyClassName=""
            >
              <List rows={scheduled} placeName={placeName} />
            </Panel>
          ) : null}

          {ended.length > 0 ? (
            <Panel
              title="Ended"
              bodyClassName=""
              footer="Kept as a record of what was announced. Deleting one removes that record."
            >
              <List rows={ended} placeName={placeName} />
            </Panel>
          ) : null}
        </div>

        {/* Sticky, because the lists get long and writing a new one is the
            reason anybody opens this screen. */}
        <div className="xl:sticky xl:top-6">
          <Compose locations={locations ?? []} />
        </div>
      </div>
    </Page>
  );
}

function List({
  rows,
  placeName,
}: {
  rows: Announcement[];
  placeName: Map<string, string>;
}) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((a) => {
        const phase = phaseOf(a);
        const campusWide = a.location_id === null;
        const where = campusWide
          ? "Everywhere on campus"
          : (placeName.get(a.location_id ?? "") ?? "A place since removed");
        const left = countdown(a);

        return (
          <li
            key={a.id}
            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {/*
                The mark is WHERE, not which list this is: the three lists have
                their own eyebrows, so a phase icon would repeat down every row
                of a section. No sr-only label — the place is printed in words
                two lines below.
              */}
              <Medallion icon={campusWide ? Globe : MapPin} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-medium tracking-[-0.01em]">
                  {a.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-pretty text-muted-foreground">
                  {a.body}
                </p>
                <p className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">{where}</span>
                  {/* The exact hour stays one hover away, the same way every
                      relative time in this app does. */}
                  <span
                    className="flex items-center gap-2"
                    title={windowLabel(a)}
                  >
                    {phase === "live" ? (
                      <Gauge share={remainingShare(a)} urgent={left?.urgent} />
                    ) : null}
                    <span
                      className={cn(
                        "tnum",
                        left?.urgent &&
                          "font-medium text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {left ? left.text : windowLabel(a)}
                    </span>
                  </span>
                </p>
              </div>
            </div>
            <RowActions id={a.id} phase={phase} />
          </li>
        );
      })}
    </ul>
  );
}

/** How much of a notice's run is left, as a gauge on one line. */
function Gauge({ share, urgent }: { share: number; urgent?: boolean }) {
  return (
    <span
      aria-hidden
      className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block"
    >
      <span
        className="block h-full rounded-full"
        style={{
          width: `${Math.max(2, share * 100)}%`,
          background: urgent ? "var(--chart-open)" : "var(--chart-4)",
        }}
      />
    </span>
  );
}
