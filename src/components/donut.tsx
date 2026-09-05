import { cn } from "@/lib/utils";

/** One ring, for the one question a column of counts cannot answer. */

/** Surface between neighbouring arcs, in degrees of the circle. */
const GAP_DEG = 3;

export type DonutSegment = {
  key: string;
  value: number;
  /** A `var()` from GROUP_VAR, or any CSS colour. */
  color: string;
};

export function Donut({
  segments,
  size = 128,
  thickness = 14,
  children,
  className,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  /** The middle. A figure and a word, usually. */
  children?: React.ReactNode;
  className?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const perDegree = circumference / 360;

  // How many gaps there are, and so how much of the circle they cost: one per
  // boundary between arcs that actually draw. Two arcs have two boundaries,
  // because the ring closes.
  const drawn = segments.filter((s) => s.value > 0);
  const gaps = drawn.length > 1 ? drawn.length : 0;
  const usable = circumference - gaps * GAP_DEG * perDegree;

  let offset = 0;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
      >
        {/* Twelve o'clock, not three. A ring that starts where a clock starts
            is read in the order the segments are given; starting at the right
            edge makes the first segment look like the second. */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {total === 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={thickness}
            />
          ) : (
            drawn.map((s) => {
              const length = (s.value / total) * usable;
              const dash = `${length} ${circumference - length}`;
              const start = offset;
              offset += length + GAP_DEG * perDegree;
              return (
                <circle
                  key={s.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={dash}
                  strokeDashoffset={-start}
                  /* Butt, not round: a rounded cap adds half the stroke width
                     to each end of every arc, so three segments of 20 each
                     stop being the same length as each other. */
                  strokeLinecap="butt"
                />
              );
            })
          )}
        </g>
      </svg>
      {children ? (
        <div className="absolute inset-0 grid place-items-center text-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
