import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  Repeat,
  Send,
  Users,
  Wrench,
} from "lucide-react";
import { Reveal } from "@/components/reveal";
import { getSessionProfile, homeFor } from "@/lib/auth";

export const metadata = {
  title: "CampusFix — report it, track it, see it fixed",
  description:
    "Campus maintenance you can follow. A student reports an issue with a photo, the maintenance office assigns it to a department, and the student confirms the fix.",
};

/*
   Five stations across one rail, so each column is only about 200px wide — a
   description a few words longer than its neighbours wraps to an extra line
   and the whole row goes ragged at the bottom.
*/
const STEPS = [
  {
    icon: Camera,
    step: "Open",
    text: "A student sends a photo and gets a ticket number.",
  },
  {
    icon: Send,
    step: "Assigned",
    text: "The office hands the ticket to a department.",
  },
  {
    icon: Wrench,
    step: "In progress",
    text: "Work begins, and the student can watch it move.",
  },
  {
    icon: ClipboardList,
    step: "Resolved",
    text: "The department writes down what it actually did.",
  },
  {
    icon: CheckCircle2,
    step: "Closed",
    text: "The student confirms the fix, or sends it back.",
  },
];

/* Each bullet is kept short enough to hold one line in its card, so the two
   lists read as two even columns instead of one with a stray wrapped word. */
const AUDIENCES = [
  {
    icon: Users,
    who: "For students",
    points: [
      "File a complaint from your phone in under a minute.",
      "See which department has it, and what they have done.",
      "Confirm the fix yourself, or send it back with a reason.",
    ],
  },
  {
    icon: ClipboardList,
    who: "For the maintenance office",
    points: [
      "One queue, sorted by place, urgency or how old it is.",
      "Nothing lost between a phone call and a notebook.",
      "Reports on which places break most, and who is slowest.",
    ],
  },
];

/* Plain sentences, all three about the same length. The earlier version made
   its point with a quoted phrase and an italic aside, which is a sentence you
   have to read twice — on a landing page that is a bug. */
const DIFFERENCES = [
  {
    icon: Repeat,
    title: "It spots repeat faults",
    body: "If the same place keeps breaking, the reports show it. A paper register can never tell you that.",
  },
  {
    icon: ClipboardList,
    title: "Nothing happens off the record",
    body: "Every status change is saved with a name and a time, so no step depends on anybody’s memory.",
  },
  {
    icon: CheckCircle2,
    title: "The student has the last word",
    body: "An admin can mark a complaint resolved. Only the student who filed it can close it for good.",
  },
];

/** The public front door. */
export default async function LandingPage() {
  const session = await getSessionProfile();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* ---------- ink band: nav + hero ---------- */}
      <div className="bg-sidebar text-sidebar-foreground">
        <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <span className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Wrench className="size-4" />
            </span>
            <span className="font-semibold tracking-[-0.01em]">CampusFix</span>
          </span>

          {session ? (
            <Link
              href={homeFor(session.role)}
              className="inline-flex h-9 items-center rounded-[var(--radius)] bg-sidebar-primary px-3.5 text-sm font-medium text-sidebar-primary-foreground transition-transform hover:-translate-y-px active:translate-y-0"
            >
              Open CampusFix
            </Link>
          ) : (
            <div className="flex items-center gap-1">
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm text-sidebar-muted transition-colors hover:text-sidebar-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 items-center rounded-[var(--radius)] bg-sidebar-primary px-3.5 text-sm font-medium text-sidebar-primary-foreground transition-transform hover:-translate-y-px active:translate-y-0"
              >
                Create account
              </Link>
            </div>
          )}
        </header>

        {/* The hero is already on screen at load, so it animates on load —
            staggered top to bottom, in the order it is read. */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pt-12 pb-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pt-20 lg:pb-20">
          <div>
            {/* A chip rather than a bare uppercase label: the label read as a
                stray line of small caps floating above the headline. */}
            <span className="rise inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent px-3 py-1 text-xs text-sidebar-muted">
              <span className="size-1.5 rounded-full bg-sidebar-primary" />
              Campus complaint tracking
            </span>
            {/*
               No text-balance here, and that is the measurement talking.
               Balanced, this headline came out 525 / 352 / 404px: the SHORT
               line lands in the middle, which reads as a hole punched in the
               words. Greedy wrapping gives 525 / 473 / 282 — two full lines
               and a short last one, which is what a headline normally looks
               like. Balance minimises the spread without knowing that a short
               final line is ordinary and a short middle line is a fault.
            */}
            <h1
              className="rise mt-5 text-[2.125rem] leading-[1.06] font-bold tracking-[-0.03em] sm:text-[2.75rem] lg:text-[3.25rem]"
              style={{ animationDelay: "60ms" }}
            >
              Every campus complaint gets an owner, a clock and a record.
            </h1>
            <p
              className="rise mt-5 max-w-xl text-[15px] leading-relaxed text-pretty text-sidebar-muted lg:text-base"
              style={{ animationDelay: "120ms" }}
            >
              A student reports a problem with a photo. The office assigns it to
              a department. Every change is timestamped, and only the student
              can close it.
            </p>

            <div
              className="rise mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "180ms" }}
            >
              <Link
                href={session ? homeFor(session.role) : "/signup"}
                className="group inline-flex h-11 items-center gap-2 rounded-[var(--radius)] bg-sidebar-primary px-5 text-[15px] font-medium text-sidebar-primary-foreground transition-transform hover:-translate-y-px active:translate-y-0"
              >
                {session ? "Open CampusFix" : "Report an issue"}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {!session ? (
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center rounded-[var(--radius)] border border-sidebar-border px-5 text-[15px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                >
                  I already have an account
                </Link>
              ) : null}
            </div>

            {!session ? (
              <p
                className="rise mt-4 text-xs text-sidebar-muted"
                style={{ animationDelay: "240ms" }}
              >
                You will need an account to file your first one. It takes a
                minute.
              </p>
            ) : null}
          </div>

          <OfficePreview />
        </section>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8">
        {/* ---------- how it works ---------- */}
        {/* Reveal sits INSIDE the section, so the heading animates and the rail
            does not. */}
        <section className="py-11 lg:py-14">
          <Reveal>
            <h2 className="text-[11px] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
              How it works
            </h2>
            <p className="mt-3 max-w-2xl text-lg tracking-[-0.01em] text-balance lg:text-xl">
              Five states, always in the same order. The student decides the
              last one.
            </p>

            {/* One rail, five stations. Numbered because the order is the
                product — every state here is one the database enforces. */}
            <div className="no-reveal relative mt-10">
              <span
                aria-hidden
                className="absolute top-[0.875rem] left-[0.875rem] hidden h-px w-[calc(80%+1.2rem)] bg-border lg:block"
              />
              <span
                aria-hidden
                className="flow-fill absolute top-[0.875rem] left-[0.875rem] hidden h-px w-[calc(80%+1.2rem)] bg-primary/70 lg:block"
              />

              <ol className="grid gap-x-6 lg:grid-cols-5">
                {STEPS.map((s, i) => (
                  <li
                    key={s.step}
                    className="relative flex gap-4 pb-9 last:pb-0 lg:block lg:pb-0"
                    style={
                      { "--d": `${400 + i * 320}ms` } as React.CSSProperties
                    }
                  >
                    {/* Stacked layout gets the same line, drawn downwards, one
                        segment per step so it stays continuous. */}
                    {i < STEPS.length - 1 ? (
                      <>
                        <span
                          aria-hidden
                          className="absolute top-7 bottom-0 left-[0.875rem] w-px bg-border lg:hidden"
                        />
                        <span
                          aria-hidden
                          className="flow-seg absolute top-7 bottom-0 left-[0.875rem] w-px bg-primary/70 lg:hidden"
                        />
                      </>
                    ) : null}

                    <span className="flow-node relative z-10 grid size-7 shrink-0 place-items-center rounded-full border bg-card">
                      <s.icon className="size-[13px]" />
                    </span>

                    <div className="flow-body min-w-0 lg:mt-4">
                      <p className="flex items-baseline gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          0{i + 1}
                        </span>
                        <span className="text-[15px] font-medium tracking-[-0.01em]">
                          {s.step}
                        </span>
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-balance text-muted-foreground">
                        {s.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </section>

        {/* ---------- who it is for ---------- */}
        <section className="border-t border-border py-11 lg:py-14">
          <Reveal>
            <h2 className="text-[11px] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
              Two sides, one record
            </h2>
            <div className="no-reveal stagger mt-6 grid gap-4 lg:grid-cols-2">
              {AUDIENCES.map((a, i) => (
                <div
                  key={a.who}
                  className="rounded-[var(--radius)] border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm sm:p-6"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-primary/8 text-primary">
                      <a.icon className="size-4" />
                    </span>
                    <h3 className="font-semibold tracking-[-0.01em]">
                      {a.who}
                    </h3>
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {a.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-[3px] grid size-4 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          <Check className="size-2.5" />
                        </span>
                        <span className="leading-relaxed text-balance text-muted-foreground">
                          {p}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ---------- what a register cannot do ---------- */}
        <section className="border-t border-border py-11 lg:py-14">
          <Reveal>
            <h2 className="text-[11px] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
              What a register cannot do
            </h2>
            <div className="no-reveal stagger mt-6 grid gap-4 lg:grid-cols-3">
              {DIFFERENCES.map((f, i) => (
                <div
                  key={f.title}
                  className="rounded-[var(--radius)] border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <span className="grid size-9 place-items-center rounded-[var(--radius)] bg-primary/8 text-primary">
                    <f.icon className="size-[18px]" />
                  </span>
                  <h3 className="mt-4 font-semibold tracking-[-0.01em]">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-balance text-muted-foreground">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      </main>

      {/* ---------- closing call to action ---------- */}
      {!session ? (
        <Reveal>
          <section className="bg-sidebar text-sidebar-foreground">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-5 py-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-16">
              <div>
                <p className="text-[1.5rem] leading-tight font-semibold tracking-[-0.02em] text-balance lg:text-[1.875rem]">
                  Report it once. Then watch it move.
                </p>
                <p className="mt-2 max-w-lg text-sm text-sidebar-muted">
                  Only the student who reported it can close it.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex h-11 items-center gap-2 rounded-[var(--radius)] bg-sidebar-primary px-5 text-[15px] font-medium text-sidebar-primary-foreground transition-transform hover:-translate-y-px active:translate-y-0"
                >
                  Create an account
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center rounded-[var(--radius)] border border-sidebar-border px-5 text-[15px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* One line. Sign in and Create an account were here too, 123px under
          the same two links in the band above — measured, and removed. */}
      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-8">
          {/* The year is read at request time, not written into the source: a
              footer stuck on last year is the one bug every project ships.
              This page already renders per request — it reads the session. */}
          <p className="text-xs text-balance text-muted-foreground">
            &copy; {new Date().getFullYear()} CampusFix &mdash; complaints
            tracked from report to fix.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* Fourteen days of filings, and a weekend that dips. */
const FILED = [3, 5, 8, 6, 9, 7, 2, 1, 6, 9, 7, 11, 8, 6];

const PLACES = [
  { name: "Block C", count: 12 },
  { name: "Boys Hostel", count: 9 },
  { name: "Central Library", count: 5 },
];

/** What the maintenance office sees, as the app draws it. */
function OfficePreview() {
  const peak = Math.max(...FILED);
  const busiest = PLACES[0].count;

  return (
    <div
      aria-hidden
      className="rise rounded-xl border border-border bg-card p-5 shadow-2xl shadow-black/25"
      style={{ animationDelay: "260ms" }}
    >
      <div className="flex items-center justify-between border-b border-border pb-3">
        <p className="text-[10px] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
          Maintenance office
        </p>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Live
        </span>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground">
          Open right now
        </p>
        {/* The delta sits beside the number it qualifies. Pushed to the far
            edge of the card it read as an unrelated line of text. */}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="tnum text-[2.5rem] leading-none font-semibold tracking-[-0.035em] text-card-foreground">
            18
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            <ArrowDownRight className="size-3" />4 fewer than last week
          </span>
        </div>
      </div>

      {/* Fourteen columns, thin, rising from a real baseline. The last one is
          today, so it carries the full accent and the rest sit back. */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
          <span>Filed per day</span>
          <span>Last 14 days</span>
        </div>
        <div className="mt-2 flex h-14 items-end gap-1 border-b border-border">
          {FILED.map((v, i) => (
            <span
              key={i}
              className={`grow-y flex-1 rounded-t-[3px] ${
                i === FILED.length - 1 ? "bg-primary/80" : "bg-primary/40"
              }`}
              style={{
                // A floor of 10%, or a quiet day renders as nothing at all.
                height: `${Math.max(10, Math.round((v / peak) * 100))}%`,
                animationDelay: `${480 + i * 45}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div>
          <p className="text-[11px] text-muted-foreground">
            Median time to fix
          </p>
          <p className="tnum mt-1 text-lg leading-none font-semibold text-card-foreground">
            2.4 days
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">
            Confirmed by students
          </p>
          <p className="tnum mt-1 text-lg leading-none font-semibold text-card-foreground">
            91%
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-[10px] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
          Reported most often
        </p>
        <ul className="mt-2.5 space-y-2">
          {PLACES.map((p, i) => (
            <li key={p.name} className="flex items-center gap-3">
              <span className="w-[6.5rem] shrink-0 truncate text-xs text-card-foreground">
                {p.name}
              </span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="grow block h-full rounded-full bg-primary/50"
                  style={{
                    width: `${(p.count / busiest) * 100}%`,
                    animationDelay: `${1140 + i * 90}ms`,
                  }}
                />
              </span>
              <span className="tnum w-4 text-right text-xs font-medium text-card-foreground">
                {p.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
