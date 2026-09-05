/**
 * One definition of "live", shared by the admin screen, the student home page
 * and the report form.
 */

export type Announcement = {
  id: string;
  title: string;
  body: string;
  location_id: string | null;
  starts_at: string;
  ends_at: string;
};

export type Phase = "live" | "scheduled" | "ended";

/** Which of the three lists a row belongs in. */
export function phaseOf(a: Announcement): Phase {
  const now = Date.now();
  if (new Date(a.starts_at).getTime() > now) return "scheduled";
  if (new Date(a.ends_at).getTime() <= now) return "ended";
  return "live";
}

/** Six hours. Past this a notice is about to stop showing, and says so. */
const SOON_MS = 6 * 3_600_000;

/** A gap in words, at the coarsest unit that is still true. */
function humanGap(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours < 1) return "under an hour";
  if (hours < 24) {
    const h = Math.floor(hours);
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** How long until it starts, or until it stops showing. */
export function countdown(
  a: Announcement,
): { text: string; urgent: boolean } | null {
  const now = Date.now();
  switch (phaseOf(a)) {
    case "scheduled":
      return {
        text: `Starts in ${humanGap(new Date(a.starts_at).getTime() - now)}`,
        urgent: false,
      };
    case "live": {
      const left = new Date(a.ends_at).getTime() - now;
      return { text: `${humanGap(left)} left`, urgent: left < SOON_MS };
    }
    default:
      return null;
  }
}

/** The share of its run still to come, 0 to 1, for the gauge beside the words. */
export function remainingShare(a: Announcement): number {
  const start = new Date(a.starts_at).getTime();
  const end = new Date(a.ends_at).getTime();
  const span = end - start;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (end - Date.now()) / span));
}

/** A null location means campus-wide, so it covers everywhere. */
export function coversLocation(
  a: Announcement,
  locationId: string | null,
): boolean {
  return a.location_id === null || a.location_id === locationId;
}

const WHEN = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

/** "Until 5 Sep, 1:00 pm" — the fact that matters, in campus time. */
export function windowLabel(a: Announcement): string {
  switch (phaseOf(a)) {
    case "scheduled":
      return `From ${WHEN.format(new Date(a.starts_at))}`;
    case "ended":
      return `Ended ${WHEN.format(new Date(a.ends_at))}`;
    default:
      return `Until ${WHEN.format(new Date(a.ends_at))}`;
  }
}

/** Campus time as a fixed offset. */
export const CAMPUS_OFFSET = "+05:30";

/** Naive local input -> an unambiguous instant Postgres can store. */
export function toInstant(naive: string): string | null {
  const value = naive.trim();
  if (!value) return null;
  // Chrome omits seconds, Firefox can include them.
  const full = value.length === 16 ? `${value}:00` : value;
  return `${full}${CAMPUS_OFFSET}`;
}

/** How long it runs, as choices rather than a date to type. */
export const ENDS_PRESETS = [
  { value: "6h", label: "In 6 hours", hours: 6 },
  { value: "1d", label: "In 24 hours", hours: 24 },
  { value: "3d", label: "In 3 days", hours: 72 },
  { value: "7d", label: "In a week", hours: 168 },
] as const;

export function presetEnd(value: string): string | null {
  const found = ENDS_PRESETS.find((p) => p.value === value);
  if (!found) return null;
  return new Date(Date.now() + found.hours * 3_600_000).toISOString();
}
