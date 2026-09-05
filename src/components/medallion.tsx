import { cn } from "@/lib/utils";

/** An icon in a tinted square. The app's one way of putting a mark on a thing. */

const SHELL = {
  sm: "size-7",
  md: "size-9",
  lg: "size-10",
} as const;

/**
 * A bigger square wants a bigger radius, or the large mark reads as a circle
 * that did not commit.
 */
const RADIUS = {
  sm: "rounded-[var(--radius-sm)]",
  md: "rounded-[var(--radius-md)]",
  lg: "rounded-[var(--radius)]",
} as const;

const GLYPH = {
  sm: "size-3.5",
  md: "size-[1.125rem]",
  lg: "size-5",
} as const;

/*
   Four tones that mean something — neutral for a label, pine for the brand or
   the current screen, amber for work in flight, red for trouble — plus one
   that means nothing at all and exists for a surface. See `card` below.
*/
const TONE = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  /*
    For a mark on a tinted title strip, where a translucent tint has nothing
    to sit on: pine at 10% over a header already painted pine at 13% is a
    square nobody can see. This borrows the card surface instead, so the mark
    reads as an inset chip on the band.
  */
  card: "bg-card text-primary",
  warn: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  danger: "bg-destructive/10 text-destructive",
} as const;

export function Medallion({
  icon: Icon,
  tone = "default",
  size = "md",
  round = false,
  label,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: keyof typeof TONE;
  size?: keyof typeof SHELL;
  /** A circle instead of a rounded square. For a mark standing alone. */
  round?: boolean;
  /** What the mark means, for a screen reader. */
  label?: string;
  className?: string;
}) {
  const mark = (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center",
        SHELL[size],
        round ? "rounded-full" : RADIUS[size],
        TONE[tone],
        className,
      )}
    >
      <Icon className={GLYPH[size]} />
    </span>
  );

  // Outside the aria-hidden span, not inside it — text inside a hidden
  // element is hidden too, which is a very easy way to ship an sr-only label
  // that no screen reader ever reads.
  return label ? (
    <>
      {mark}
      <span className="sr-only">{label}</span>
    </>
  ) : (
    mark
  );
}
