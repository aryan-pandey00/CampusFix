"use client";

import { useActionState, useState } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Panel } from "@/components/page";
import { ENDS_PRESETS } from "@/lib/complaints/announcements";
import { createAnnouncement, type AnnouncementState } from "./actions";
import { cn } from "@/lib/utils";

/* The column widths, named once. */
const TITLE_MAX = 120;
const BODY_MAX = 1000;

export function Compose({
  locations,
}: {
  locations: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    createAnnouncement,
    {} as AnnouncementState,
  );
  const was = (name: string, fallback = "") => state.values?.[name] ?? fallback;

  // Only so the two "at a set time" pickers can appear. Everything else is
  // uncontrolled and read straight off the FormData.
  const [startsMode, setStartsMode] = useState(() => was("starts_mode", "now"));
  const [endsIn, setEndsIn] = useState(() => was("ends_in", "1d"));

  /* Lengths only, so the boxes themselves stay uncontrolled. */
  const [titleLen, setTitleLen] = useState(() => was("title").length);
  const [bodyLen, setBodyLen] = useState(() => was("body").length);

  return (
    <Panel
      title="Write an announcement"
      description="Everyone signed in sees it while it is live. Students also see it on the report form if it covers the place they pick."
      icon={Megaphone}
      iconTone="card"
      headerClassName="bg-primary/[0.13]"
    >
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="title">Headline</Label>
            <Counter length={titleLen} max={TITLE_MAX} />
          </div>
          <Input
            id="title"
            name="title"
            required
            maxLength={TITLE_MAX}
            defaultValue={was("title")}
            onChange={(e) => setTitleLen(e.target.value.length)}
            placeholder="Water supply off in Boys Hostel"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="body">Details</Label>
            <Counter length={bodyLen} max={BODY_MAX} />
          </div>
          <Textarea
            id="body"
            name="body"
            required
            rows={3}
            maxLength={BODY_MAX}
            defaultValue={was("body")}
            onChange={(e) => setBodyLen(e.target.value.length)}
            placeholder="Tank cleaning. Taps will be dry on all floors. Water tankers will be at the gate."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location_id">Where it applies</Label>
          <NativeSelect
            id="location_id"
            name="location_id"
            defaultValue={was("location_id")}
          >
            <option value="">Everywhere on campus</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            Pick a place and it also warns anyone about to file a complaint
            about it.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="space-y-2">
            <Label htmlFor="starts_mode">Starts</Label>
            <NativeSelect
              id="starts_mode"
              name="starts_mode"
              value={startsMode}
              onChange={(e) => setStartsMode(e.target.value)}
            >
              <option value="now">Straight away</option>
              <option value="later">At a set time</option>
            </NativeSelect>
            {startsMode === "later" ? (
              <Input
                type="datetime-local"
                name="starts_at"
                defaultValue={was("starts_at")}
                aria-label="Start time"
              />
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ends_in">Stops showing</Label>
            <NativeSelect
              id="ends_in"
              name="ends_in"
              value={endsIn}
              onChange={(e) => setEndsIn(e.target.value)}
            >
              {ENDS_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
              <option value="custom">At a set time</option>
            </NativeSelect>
            {endsIn === "custom" ? (
              <Input
                type="datetime-local"
                name="ends_at"
                defaultValue={was("ends_at")}
                aria-label="End time"
              />
            ) : null}
          </div>
        </div>

        {/* An end date is required by the column, not by the form. An
            announcement that never expires becomes furniture nobody reads. */}
        {state.error ? (
          <p
            role="alert"
            className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive"
          >
            {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p
            role="status"
            className="rounded-[var(--radius)] border border-border bg-muted px-3.5 py-2.5 text-sm"
          >
            {state.ok}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="w-full sm:w-auto xl:w-full"
        >
          {pending ? "Posting…" : "Post it"}
        </Button>
      </form>
    </Panel>
  );
}

/** How much room is left, once that is nearly a real question. */
function Counter({ length, max }: { length: number; max: number }) {
  if (length < max * 0.8) return null;
  const left = max - length;

  return (
    <span
      /* Polite, and only on the box being typed into: a live region that
         announced every keystroke would talk over the typing itself. */
      aria-live="polite"
      className={cn(
        "tnum text-xs",
        left === 0
          ? "font-medium text-amber-600 dark:text-amber-400"
          : "text-muted-foreground",
      )}
    >
      {left === 0 ? "No room left" : `${left} left`}
    </span>
  );
}
