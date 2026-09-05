import Link from "next/link";
import { MapPin, Megaphone } from "lucide-react";
import { Panel } from "@/components/page";
import { relName } from "@/lib/complaints/display";
import { windowLabel, type Announcement } from "@/lib/complaints/announcements";
import { cn } from "@/lib/utils";

/** What the query hands over: an announcement plus its embedded location. */
export type Notice = Announcement & { locations: unknown };

/** Live announcements, as one panel. */
export function NoticeList({
  notices,
  className,
  max,
  moreHref,
  heading = true,
}: {
  notices: Notice[];
  className?: string;
  /**
   * Off on /notices, where the page's own H1 is already "Notices" with the
   * same megaphone beside it — the panel's header said it a second time,
   * 130px below the first.
   */
  heading?: boolean;
  /** Show at most this many. Unset shows all, which is what a full page wants. */
  max?: number;
  /** Where "See all" goes. Only rendered when `max` actually hides something. */
  moreHref?: string;
}) {
  if (notices.length === 0) return null;

  const shown = max ? notices.slice(0, max) : notices;
  const hidden = notices.length - shown.length;

  return (
    <Panel
      className={className}
      title={
        !heading
          ? undefined
          : notices.length === 1
            ? "A notice from the office"
            : "Notices from the office"
      }
      icon={heading ? Megaphone : undefined}
      iconTone="card"
      headerClassName={heading ? "bg-primary/[0.13]" : undefined}
      bodyClassName=""
      actions={
        hidden > 0 && moreHref ? (
          <Link
            href={moreHref}
            className="text-xs font-medium text-primary underline underline-offset-4"
          >
            See all {notices.length}
          </Link>
        ) : null
      }
    >
      <ul className="divide-y divide-border">
        {shown.map((a) => (
          <li key={a.id} className="px-4 py-3.5 sm:px-5">
            <p className="text-sm font-medium tracking-[-0.01em]">{a.title}</p>
            <p
              className={cn(
                // max-w-prose is 65ch, and this is the only long-form prose on
                // any signed-in screen: uncapped it ran 918px at 1590, about
                // 133 characters on one line, against the 65-75 a line can be
                // read at. Page's own description has had a cap all along.
                "mt-1 max-w-prose text-sm leading-relaxed text-pretty text-muted-foreground",
                // Only where something is already being held back. A clamp on
                // the full page would hide text with nowhere left to go.
                max ? "line-clamp-3" : "",
              )}
            >
              {a.body}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin aria-hidden className="size-3.5" />
                {relName(a.locations) ?? "Everywhere on campus"}
              </span>
              <span className="tnum">{windowLabel(a)}</span>
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
