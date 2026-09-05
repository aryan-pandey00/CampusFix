import {
  Camera,
  Check,
  CheckCircle2,
  ClipboardPlus,
  Lightbulb,
  Send,
  Wrench,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Page, Panel } from "@/components/page";
import type { Announcement } from "@/lib/complaints/announcements";
import { ReportForm, type LocationOption } from "./report-form";

export const metadata = { title: "Report an issue · CampusFix" };

/* What happens after Submit, in the app's own vocabulary and its own colours. */
const STEPS = [
  {
    icon: Camera,
    title: "You report it",
    text: "It gets a ticket number the moment you file it.",
    tone: "bg-primary text-primary-foreground",
  },
  {
    icon: Send,
    title: "The office assigns it",
    text: "You see which department has it, and when.",
    tone: "bg-primary/15 text-primary",
  },
  {
    icon: Wrench,
    title: "The work starts",
    text: "Every change is saved with who did it and when.",
    tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  {
    icon: CheckCircle2,
    title: "You close it",
    text: "Nobody else can. Confirm the fix, or send it back.",
    tone:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
];

/* Plain sentences, each one an instruction plus the reason for it. */
const TIPS = [
  "Add a photo. It shows exactly what is wrong.",
  "Say exactly where — a room number, or the floor and the side.",
  "Say when it started, for example since Monday.",
  "One problem per complaint. Each one goes to just one department.",
  "Choose Urgent only if it is unsafe or many people are affected.",
];

export default async function ReportPage() {
  const session = await requireUser();
  const supabase = await createClient();

  // Read through the student's own session, so RLS applies here too. The
  // locations policy allows any signed-in user to read them.
  const [{ data: locations }, { data: notices }] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name, kind, requires_detail, detail_label, detail_hint")
      .eq("is_active", true)
      .order("sort_order"),
    // Only the live ones come back, and that is the policy's doing rather than
    // this query's. Handed to the form whole so that picking a place costs no
    // round trip — the matching happens in the browser.
    supabase
      .from("announcements")
      .select("id, title, body, location_id, starts_at, ends_at")
      .order("starts_at", { ascending: false }),
  ]);

  return (
    <Page
      title="Report an issue"
      description="A photo and the exact spot get it fixed faster than a paragraph."
      icon={ClipboardPlus}
    >
      {locations && locations.length > 0 ? (
        /* The form leads and the guidance follows — on every width. */
        <div className="grid gap-5 lg:grid-cols-3">
          {/* The form is `lg:contents`, so its card and its actions are this
              grid's two rows rather than one column. See ReportForm. */}
          <ReportForm
            locations={locations as LocationOption[]}
            announcements={(notices ?? []) as Announcement[]}
            userId={session.userId}
          />

          {/* Sticky and top-aligned, rather than stretched to match the card. */}
          <aside className="flex flex-col gap-4 lg:col-start-3 lg:row-start-1 lg:self-start lg:sticky lg:top-6">
            <Panel
              title="What happens next"
              bodyClassName="px-4 py-4 sm:px-5"
              headerClassName="bg-primary/[0.13]"
            >
              <ol className="space-y-0">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="relative flex gap-3 pb-4 last:pb-0">
                    {/* One hairline threading the four markers, stopping at the
                        last one so the list does not trail off. */}
                    {i < STEPS.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute top-[1.875rem] bottom-1 left-[0.6875rem] w-px bg-border"
                      />
                    ) : null}
                    <span
                      aria-hidden
                      className={`relative z-10 grid size-6 shrink-0 place-items-center rounded-full ${s.tone}`}
                    >
                      <s.icon className="size-[13px]" />
                    </span>
                    <span className="min-w-0 -mt-px">
                      <span className="block text-sm font-medium tracking-[-0.01em]">
                        {s.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-pretty text-muted-foreground">
                        {s.text}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel
              title="Getting it fixed sooner"
              icon={Lightbulb}
              iconTone="warn"
              bodyClassName="px-4 py-4 sm:px-5"
              headerClassName="bg-amber-500/[0.07]"
            >
              <ul className="space-y-2.5">
                {TIPS.map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-[3px] grid size-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                    >
                      <Check className="size-2.5" />
                    </span>
                    <span className="text-xs leading-relaxed text-pretty text-muted-foreground">
                      {t}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </aside>
        </div>
      ) : (
        <p className="rounded-[var(--radius)] border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No locations are set up yet. Run the seed migration first.
        </p>
      )}
    </Page>
  );
}
