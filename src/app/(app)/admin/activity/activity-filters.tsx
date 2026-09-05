"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { EVENT_LABEL } from "@/lib/complaints/display";
import { cn } from "@/lib/utils";

type Named = { id: string; name: string };

/** Why this screen has filters at all. */
export function ActivityFilters({
  people,
  departments,
}: {
  people: Array<{ id: string; name: string; role: string }>;
  departments: Named[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page"); // any filter change invalidates the current page
    const s = next.toString();
    startTransition(() => router.push(s ? `?${s}` : "/admin/activity"));
  };

  const value = (k: string) => params.get(k) ?? "";
  const keys = ["who", "type", "department", "from", "to"];
  const applied = keys.filter((k) => params.get(k)).length;

  return (
    <div className="mb-4 rounded-[var(--radius)] border border-border bg-card p-3 shadow-xs">
      {/*
         Five controls, and the two dates are one control in two boxes.

         Not five equal columns: at 960px of page they came out 180px each,
         and "Building & Infrastructure" needs 192 — so the department filter
         clipped its own selection, and only once a selection had been made,
         which is why no capture ever showed it. Each control is now the width
         its longest option needs, and Who takes the slack because a person's
         name has no fixed length.
      */}
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:flex xl:flex-wrap">
        <NativeSelect
          wrapperClassName="xl:min-w-44 xl:flex-1"
          aria-label="Who acted"
          value={value("who")}
          onChange={(e) => push({ who: e.target.value })}
          className={value("who") ? "border-primary/40 font-medium" : ""}
        >
          <option value="">Anyone</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.role === "staff" ? " (dept)" : ""}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          wrapperClassName="xl:w-[9.25rem] xl:shrink-0"
          aria-label="What happened"
          value={value("type")}
          onChange={(e) => push({ type: e.target.value })}
          className={value("type") ? "border-primary/40 font-medium" : ""}
        >
          <option value="">Any event</option>
          {Object.entries(EVENT_LABEL).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          wrapperClassName="xl:w-[12.5rem] xl:shrink-0"
          aria-label="Which department"
          value={value("department")}
          onChange={(e) => push({ department: e.target.value })}
          className={value("department") ? "border-primary/40 font-medium" : ""}
        >
          <option value="">Any department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </NativeSelect>

        {/*
           The word is IN the box, the way every select on this bar carries its
           own name. An aria-label was here before and satisfied nothing a
           sighted person needs: two identical boxes reading "dd-mm-yyyy" with
           no way to tell which end of the range each one was.
        */}
        <div className="grid grid-cols-2 gap-2 sm:col-span-2 md:col-span-3 xl:flex xl:shrink-0 xl:gap-2">
          <DateBox
            label="From"
            className="xl:w-[11.5rem]"
            value={value("from")}
            onChange={(v) => push({ from: v })}
          />
          <DateBox
            label="To"
            className="xl:w-[10.5rem]"
            value={value("to")}
            onChange={(v) => push({ to: v })}
          />
        </div>
      </div>

      {applied > 0 ? (
        <div className="mt-2.5 flex items-center gap-3 border-t border-border pt-2.5">
          <button
            type="button"
            onClick={() => startTransition(() => router.push("/admin/activity"))}
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

/** A date, with the end of the range it belongs to named inside the box. */
function DateBox({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex h-9 min-w-0 items-center gap-1.5 rounded-[var(--radius)] border border-input bg-card pr-1.5 pl-3 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25 dark:bg-input/30",
        value && "border-primary/40",
        className,
      )}
    >
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none",
          value && "font-medium",
        )}
      />
    </label>
  );
}
