"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PRIORITIES } from "@/lib/complaints/schema";
import {
  GROUP_LABEL,
  GROUP_ORDER,
  STATUS_LABEL,
  type Status,
} from "@/lib/complaints/display";

type Named = { id: string; name: string };

/**
 * Every filter lives in the URL, so a view can be bookmarked, shared, or sent
 * to whoever is on duty.
 */
export function QueueFilters({
  departments,
  locations,
}: {
  departments: Named[];
  locations: Named[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page"); // any filter change invalidates the current page
    const s = next.toString();
    startTransition(() => router.push(s ? `?${s}` : "/admin/complaints"));
  };

  // Debounce the search box: one navigation when typing stops, not per keypress.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => push({ q }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const value = (k: string) => params.get(k) ?? "";
  const keys = ["status", "priority", "department", "location", "q", "sort"];
  const applied = keys.filter((k) => params.get(k)).length;

  return (
    <div className="mb-4 rounded-[var(--radius)] border border-border bg-card p-3 shadow-xs">
      {/* Six controls at a fixed width did not fit one row, so the last one
          dropped onto a second line by itself. */}
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        {/* The search box absorbs whatever the selects do not need, which is
            what makes them all fit on one row at 1280. */}
        <div className="relative xl:min-w-56 xl:max-w-lg xl:flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search complaints"
            className="pl-9"
            aria-label="Search complaints"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:shrink-0 xl:flex-wrap">
          <Picker
            label="Status"
            minW="xl:w-[7.25rem]"
            value={value("status")}
            onChange={(v) => push({ status: v })}
            options={(Object.keys(STATUS_LABEL) as Status[]).map((s) => ({
              value: s,
              label: STATUS_LABEL[s],
            }))}
            /* The two sets the dashboard's ring links to, in their own group. */
            groups={[
              {
                label: "Two statuses at once",
                options: GROUP_ORDER.filter((g) => g !== "open").map((g) => ({
                  value: g,
                  label: GROUP_LABEL[g],
                })),
              },
            ]}
          />
          <Picker
            label="Priority"
            minW="xl:w-[7.5rem]"
            value={value("priority")}
            onChange={(v) => push({ priority: v })}
            options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
          />
          <Picker
            label="Department"
            minW="xl:w-[9.25rem]"
            value={value("department")}
            onChange={(v) => push({ department: v })}
            options={[
              { value: "none", label: "Unassigned" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <Picker
            label="Location"
            minW="xl:w-[8rem]"
            value={value("location")}
            onChange={(v) => push({ location: v })}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
          />
          <Picker
            label="Sort"
            minW="xl:w-[8.625rem]"
            value={value("sort")}
            onChange={(v) => push({ sort: v })}
            /* "Urgent first" put the word "priority" in two controls at once,
               and it is no longer a separate ordering: the default sorts by
               priority inside each status group. */
            allLabel="Sort: Open first"
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
            ]}
          />
        </div>
      </div>

      {applied > 0 ? (
        <div className="mt-2.5 flex items-center gap-3 border-t border-border pt-2.5">
          <button
            type="button"
            onClick={() => {
              setQ("");
              startTransition(() => router.push("/admin/complaints"));
            }}
            className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            <X className="size-3.5" />
            Clear {applied} filter{applied === 1 ? "" : "s"}
          </button>
          {pending ? (
            <span className="text-xs text-muted-foreground">Updating…</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** A styled native select — see NativeSelect for why it stays native. */
type Option = { value: string; label: string };

function Picker({
  label,
  value,
  onChange,
  options,
  groups,
  allLabel,
  minW,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  /** Headed sections after the flat list. Only Status uses one. */
  groups?: Array<{ label: string; options: Option[] }>;
  allLabel?: string;
  /**
   * A floor for this one control's width, because a select cannot be sized by
   * its own text.
   *
   * `flex-1` alone gave all five an equal share, and equal is wrong: at 1280
   * that share is 121px with 77px of room inside it, where "Department: any"
   * needs 103. Three of the five were cutting their own label in half.
   *
   * `min-w-fit` is not the answer either — the intrinsic width of a select is
   * its WIDEST OPTION, so Status would size itself to "Two statuses at once"
   * and Location to the longest place name on campus.
   *
   * So each one is fixed at the width of the label it actually shows, plus
   * the 44px the padding and the chevron take, and the search box beside them
   * absorbs the difference. A floor plus `flex-1` was tried and is worse: it
   * fits at 1280 only by wrapping, and a lone select on its own row stretches
   * to 639px.
   */
  minW: string;
}) {
  return (
    <NativeSelect
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      wrapperClassName={`xl:shrink-0 ${minW}`}
      className={value ? "border-primary/40 font-medium" : ""}
    >
      <option value="">{allLabel ?? `${label}: any`}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      {(groups ?? []).map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </NativeSelect>
  );
}
