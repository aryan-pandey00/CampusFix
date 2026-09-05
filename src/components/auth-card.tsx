import Link from "next/link";
import { Check, Wrench } from "lucide-react";

/* Three things the heading does not already say. */
const PROMISES = [
  "File a complaint with a photo in under a minute",
  "Follow every step, with names and times",
  "Nothing closes until the student says it is fixed",
];

/** The frame around sign-in and sign-up. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  /* A node, not a string, so a subtitle made of two sentences can put each on
     its own line. `text-wrap: balance` optimises for equal line widths and
     will happily break one sentence into the next. */
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[1fr_minmax(27rem,32rem)]">
      <aside className="hidden flex-col bg-sidebar p-10 text-sidebar-foreground lg:flex xl:p-14">
        <div className="flex h-full w-full flex-col">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Wrench className="size-4" />
            </span>
            <span className="font-semibold tracking-[-0.01em]">CampusFix</span>
          </Link>

          <div className="flex flex-1 items-center">
            {/* max-w-lg, not md: at the narrower measure the heading broke as
                "gets an owner, a / clock and a record." */}
            <div className="max-w-lg">
              <p className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance xl:text-[2rem]">
                Every campus complaint gets an owner, a clock and a record.
              </p>
              <p className="mt-4 text-sm text-pretty text-sidebar-muted">
                So &ldquo;what happened to my complaint?&rdquo; always has an
                answer.
              </p>

              <ul className="mt-8 space-y-3">
                {PROMISES.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-sidebar-primary/15 text-sidebar-primary">
                      <Check className="size-3" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col justify-center bg-card px-5 py-12 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-9 flex items-center gap-2 lg:hidden">
            <span className="grid size-6 place-items-center rounded bg-primary text-primary-foreground">
              <Wrench className="size-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-[-0.01em]">
              CampusFix
            </span>
          </Link>

          <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em]">
            {title}
          </h1>
          {/* Balanced, not pretty: at 390px "Students sign up here. Admin access
              is granted separately." broke 292px and then 67px. */}
          <p className="mt-1.5 mb-7 text-sm text-balance text-muted-foreground">
            {subtitle}
          </p>

          {children}
        </div>
      </main>
    </div>
  );
}
