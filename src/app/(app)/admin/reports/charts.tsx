"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "@/components/page";
import type { WeekBucket } from "@/lib/complaints/reports";

/* Two series, and the pair was chosen by measurement rather than by feel. */
const FILED = "var(--chart-active)";
const RESOLVED = "var(--chart-done)";
const GRID = "var(--viz-grid)";
const AXIS = "var(--viz-axis)";
const LABEL = "var(--viz-label)";

const axisTick = { fill: LABEL, fontSize: 12 };

/* Charts on this screen are the ones that are genuinely shapes. */

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: WeekBucket }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const net = row.count - row.resolved;
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-popover-foreground">Week of {row.label}</p>
      <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
        <dt className="flex items-center gap-1.5 text-muted-foreground">
          <span
            aria-hidden
            className="size-2 rounded-sm"
            style={{ background: FILED }}
          />
          Filed
        </dt>
        <dd className="tnum text-right font-medium text-popover-foreground">
          {row.count}
        </dd>
        <dt className="flex items-center gap-1.5 text-muted-foreground">
          <span
            aria-hidden
            className="size-2 rounded-sm"
            style={{ background: RESOLVED }}
          />
          Resolved
        </dt>
        <dd className="tnum text-right font-medium text-popover-foreground">
          {row.resolved}
        </dd>
      </dl>
      {/* The number the two lines exist to produce, stated rather than left
          as a gap to be eyeballed. */}
      {net !== 0 ? (
        <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">
          Backlog {net > 0 ? "grew" : "fell"} by{" "}
          <span className="tnum font-medium text-popover-foreground">
            {Math.abs(net)}
          </span>
        </p>
      ) : (
        <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">
          Kept level
        </p>
      )}
    </div>
  );
}

/** What came in against what went out, week by week. */
export function WeeklyTrendChart({ data }: { data: WeekBucket[] }) {
  const nothing = data.every((d) => d.count === 0 && d.resolved === 0);
  return (
    <Panel
      title="Filed against resolved, week by week"
      description="Week beginning Monday. Counted into the week each thing happened, so a complaint filed one week and fixed the next appears in both. Quiet weeks are shown as zero, not skipped."
      className="viz-root"
      actions={
        <ul className="flex items-center gap-3 text-xs">
          {[
            ["Filed", FILED],
            ["Resolved", RESOLVED],
          ].map(([label, colour]) => (
            <li key={label} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2.5 rounded-sm"
                style={{ background: colour }}
              />
              {label}
            </li>
          ))}
        </ul>
      }
    >
      {nothing ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No complaints in this period.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart
            data={data}
            margin={{ top: 22, right: 12, bottom: 0, left: -18 }}
          >
            <defs>
              <linearGradient id="cf-week" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={FILED} stopOpacity={0.2} />
                <stop offset="100%" stopColor={FILED} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="label"
              tick={axisTick}
              stroke={AXIS}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={axisTick}
              stroke={AXIS}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: AXIS, strokeWidth: 1 }}
            />
            {/* No mount animation. A shape drawing itself on every page load
                delays reading a report and says nothing about the data — and it
                makes the chart impossible to screenshot, because a capture
                lands mid-draw. */}
            <Area
              name="Filed"
              dataKey="count"
              stroke={FILED}
              strokeWidth={2}
              fill="url(#cf-week)"
              isAnimationActive={false}
              dot={{ r: 3, fill: FILED, stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            >
              {/* A zero week gets no label — "0" printed over an empty stretch
                  reads as a data point rather than the absence of one. Only
                  the filed series is labelled: two numbers stacked above one
                  week collide, and the tooltip carries both. */}
              <LabelList
                dataKey="count"
                position="top"
                offset={10}
                fill={LABEL}
                fontSize={11}
                formatter={(v) => (Number(v) === 0 ? "" : String(v ?? ""))}
              />
            </Area>
            <Area
              name="Resolved"
              dataKey="resolved"
              stroke={RESOLVED}
              strokeWidth={2}
              fill="none"
              isAnimationActive={false}
              dot={{
                r: 3,
                fill: RESOLVED,
                stroke: "var(--card)",
                strokeWidth: 2,
              }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}
