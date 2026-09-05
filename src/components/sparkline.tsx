import { cn } from "@/lib/utils";

/** A stat tile's trend, in about 30 pixels. */
export function Sparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  // Two points is the minimum for a direction. One is not a trend, and drawing
  // a flat line from a single reading would claim more than the data says.
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  // A flat series has nowhere to be plotted, and the arithmetic sends it to
  // the floor: (v - min) / span is 0 for every reading, so "nothing changed"
  // draws as "flatlined at zero", which is a different and much worse claim.
  const flat = max === min;

  const x = (i: number) => (i / (values.length - 1)) * 100;
  /* Inset by 3 at each end of a 32-tall box, not 2. */
  const y = (v: number) => (flat ? 16 : 29 - ((v - min) / (max - min)) * 26);

  const line = values
    .map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`)
    .join(" ");
  const lastY = y(values[values.length - 1] ?? min);

  return (
    <div className={cn("relative", className)} aria-hidden>
      {/* preserveAspectRatio="none" is what lets one viewBox stretch to any
          tile width. */}
      <svg
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        className="block size-full"
      >
        <polyline
          points={`0,32 ${line} 100,32`}
          fill="currentColor"
          className="opacity-10"
        />
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Where the line ends, which is the only point on it worth marking. */}
      <span
        className="absolute size-1.5 -translate-x-full -translate-y-1/2 rounded-full bg-current"
        /* clamp, not the bare percentage: the inset above keeps the dot whole
           at the h-8 this is drawn at, and a caller who asks for a shorter box
           would start clipping it again. The clamp holds at any height. */
        style={{
          left: "100%",
          top: `clamp(3px, ${((lastY / 32) * 100).toFixed(2)}%, calc(100% - 3px))`,
        }}
      />
    </div>
  );
}
