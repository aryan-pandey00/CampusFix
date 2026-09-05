import {
  describeEvent,
  type TimelineEvent,
} from "@/lib/complaints/display";

const DAY = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});
const TIME = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

/** The complaint's history. */
export function Timeline({
  events,
  viewerId,
  departmentName,
  actorNames,
}: {
  events: TimelineEvent[];
  viewerId: string;
  departmentName?: string | null;
  actorNames?: Map<string, string | null>;
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nothing has happened yet.</p>
    );
  }

  const days: Array<{ day: string; items: TimelineEvent[] }> = [];
  for (const event of events) {
    const day = DAY.format(new Date(event.created_at));
    const last = days.at(-1);
    if (last?.day === day) last.items.push(event);
    else days.push({ day, items: [event] });
  }

  return (
    <div className="space-y-5">
      {days.map(({ day, items }) => (
        <section key={day}>
          <h3 className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{day}</h3>
          <ol className="mt-2">
            {items.map((event, i) => {
              const { who, text } = describeEvent(
                event,
                viewerId,
                departmentName,
                actorNames?.get(event.actor_id ?? "") ?? null,
              );
              const last = i === items.length - 1;

              return (
                <li
                  key={event.id}
                  className="relative flex gap-3 pb-4 last:pb-0"
                >
                  {!last ? (
                    <span
                      aria-hidden
                      className="absolute top-3 left-[4.5px] h-full w-px bg-border"
                    />
                  ) : null}
                  <span
                    aria-hidden
                    className="relative mt-1.5 size-[10px] shrink-0 rounded-full border-2 border-card bg-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{who}</span> {text}
                      <span className="ml-2 text-xs whitespace-nowrap text-muted-foreground">
                        {TIME.format(new Date(event.created_at))}
                      </span>
                      {event.is_internal ? (
                        <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
                          Internal
                        </span>
                      ) : null}
                    </p>
                    {event.note ? (
                      <p className="mt-1.5 whitespace-pre-wrap rounded-[var(--radius-md)] border border-border bg-muted/50 px-3 py-2 text-sm">
                        {event.note}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
