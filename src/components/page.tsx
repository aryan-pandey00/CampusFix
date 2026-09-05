import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Medallion } from "@/components/medallion";
import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/utils";

/** The three widths a screen is allowed to be. */
const WIDTH = {
  narrow: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-[86rem]",
} as const;

/*
   A second cap inside the column, for content that wants a shorter measure
   than its page. Empty everywhere now, and worth keeping empty: a cap that is
   narrower than the header band above it leaves the band running on past the
   content, which reads as a column that forgot to fill itself. Narrow the
   whole page instead.
*/
const INNER = {
  narrow: "",
  default: "",
  wide: "",
} as const;

/** Every signed-in screen. */
export function Page({
  title,
  description,
  meta,
  back,
  actions,
  icon: Icon,
  width = "default",
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Small line above the title — a ticket number, a count. */
  meta?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  /** A mark beside the title. Optional: most screens do not need one. */
  icon?: React.ComponentType<{ className?: string }>;
  width?: keyof typeof WIDTH;
  children: React.ReactNode;
}) {
  const column = cn("mx-auto w-full px-5 sm:px-8", WIDTH[width]);

  return (
    <>
      <div className="border-b border-border bg-card">
        <div className={cn(column, "py-6 lg:py-7")}>
          {back ? (
            <Link
              href={back.href}
              className="mb-3 -ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" />
              {back.label}
            </Link>
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
            <div className="flex min-w-0 items-start gap-3.5">
              {Icon ? (
                <Medallion
                  icon={Icon}
                  tone="primary"
                  size="lg"
                  className="mt-0.5"
                />
              ) : null}
              <div className="min-w-0">
                {meta ? (
                  <p className="mb-1.5 font-mono text-xs tracking-wide text-muted-foreground">
                    {meta}
                  </p>
                ) : null}
                <h1 className="text-[1.375rem] leading-tight font-semibold tracking-[-0.015em] text-balance lg:text-[1.625rem]">
                  {title}
                </h1>
                {description ? (
                  <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
            {actions ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className={cn(column, "py-6 lg:py-8")}>
        <div className={INNER[width]}>{children}</div>
      </div>
    </>
  );
}

/** The app's one container. Panels stop varying per screen. */
export function Panel({
  title,
  description,
  actions,
  footer,
  children,
  className,
  bodyClassName,
  headerClassName,
  icon: Icon,
  iconTone = "default",
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Padding on the body. Pass "" for flush content like a table or a list. */
  bodyClassName?: string;
  /** A tint on the title strip. Nothing by default. */
  headerClassName?: string;
  /** A small mark beside the title. */
  icon?: React.ComponentType<{ className?: string }>;
  /** The mark's tint. Neutral unless the header itself is tinted. */
  iconTone?: "default" | "primary" | "warn" | "danger" | "card";
}) {
  /*
     A description with no title used to render nothing at all — the header
     block was gated on `title` alone, so the string was fetched, passed and
     dropped. The activity screen's account panel lost its whole explanation
     that way.
  */
  const header = title || description;
  const heading = (
    <div className="min-w-0">
      {title ? (
        <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
          {title}
        </h2>
      ) : null}
      {description ? (
        <p
          className={cn(
            "text-xs text-muted-foreground",
            title && "mt-0.5",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-xs",
        className,
      )}
    >
      {header ? (
        <div
          className={cn(
            "flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3 sm:px-5",
            headerClassName,
          )}
        >
          {Icon ? (
            <div className="flex min-w-0 items-start gap-2.5">
              <Medallion
                icon={Icon}
                tone={iconTone}
                size="sm"
                className="mt-px"
              />
              {heading}
            </div>
          ) : (
            heading
          )}
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}

      <div className={bodyClassName ?? "px-4 py-4 sm:px-5"}>{children}</div>

      {footer ? (
        <div className="border-t border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

/** A figure with a label. The app's stat tile. */
export function Stat({
  label,
  value,
  hint,
  href,
  tone,
  icon: Icon,
  spark,
  active = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  /**
   * The tile's own filter is on. Without it a tile used as a switch has no
   * off-and-on: the activity screen's three read identically whether or not
   * they were the thing filtering the list under them.
   */
  active?: boolean;
  /** warn and danger are signals; primary is emphasis. */
  tone?: "warn" | "danger" | "primary";
  /**
   * A mark above the label. Replaces the tone dot rather than joining it — a
   * red dot beside a red medallion says the same thing twice.
   */
  icon?: React.ComponentType<{ className?: string }>;
  /** A trend, oldest reading first, bleeding to the bottom edge. */
  spark?: number[];
}) {
  const body = (
    <>
      {/* Above the label, not cornered: three tiles across a 390px phone
          leave 77px of label width, and a corner mark claims 36px of it. */}
      {Icon ? (
        <Medallion
          icon={Icon}
          /*
             Neutral unless the caller says otherwise, which is a reversal:
             this defaulted to pine, and a row of three tiles then had two pine
             marks and one amber.
          */
          tone={active ? "primary" : (tone ?? "default")}
          size="sm"
          className="mb-2.5"
        />
      ) : null}
      <div className="flex items-start gap-1.5">
        {(tone === "warn" || tone === "danger") && !Icon ? (
          <span
            aria-hidden
            className={cn(
              "mt-[0.4em] size-1.5 shrink-0 rounded-full",
              tone === "danger" ? "bg-destructive" : "bg-amber-500",
            )}
          />
        ) : null}
        {/* Wraps rather than truncates: three of these across a phone is about
            100px each, and "Being worked on" became "Being work…". */}
        <p className="min-h-[2.5em] text-[11px] leading-tight font-medium text-muted-foreground sm:min-h-0 sm:text-xs">
          {label}
        </p>
      </div>
      {/* Proportional figures deliberately: tabular-nums makes a large
          standalone number look loose. Tabular is for columns. */}
      <p className="mt-2 text-[1.625rem] leading-none font-semibold tracking-[-0.02em]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-xs leading-tight text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {/* Bled to three edges rather than inset. A sparkline floating in a
          padded box reads as a fourth piece of content; sitting on the bottom
          edge it reads as the tile's own baseline. The shell clips it, which
          is why it gained overflow-hidden. */}
      {spark ? (
        <Sparkline
          values={spark}
          className={cn(
            "mt-3 -mb-3.5 h-8 -mx-4",
            tone === "danger"
              ? "text-destructive"
              : tone === "warn"
                ? "text-amber-500"
                : "text-primary",
          )}
        />
      ) : null}
    </>
  );

  const shell = cn(
    "block overflow-hidden rounded-[var(--radius)] border px-4 py-3.5 shadow-xs",
    active ? "border-primary/50 bg-primary/5" : "border-border bg-card",
  );

  return href ? (
    <Link
      href={href}
      /* aria-current, because the border is the whole of the state and a
         border is not readable. */
      aria-current={active ? "true" : undefined}
      className={cn(
        shell,
        "transition-colors hover:border-primary/30 hover:bg-accent/40",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}

/** Nothing to show, said in a way that offers the next move. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-14 text-center">
      {Icon ? (
        <Medallion icon={Icon} size="lg" round className="mx-auto mb-3" />
      ) : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** The small uppercase label above a group of panels. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[11px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
      {children}
    </h2>
  );
}
