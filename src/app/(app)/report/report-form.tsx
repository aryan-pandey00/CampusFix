"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  Check,
  Flag,
  ImagePlus,
  Loader2,
  Lock,
  MapPin,
  MapPinned,
  Megaphone,
  Tag,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/page";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { compressImage, photoProblem } from "@/lib/complaints/compress";
import {
  ACCEPTED_PHOTO_TYPES,
  CATEGORIES,
  PRIORITIES,
} from "@/lib/complaints/schema";
import { PRIORITY_INK } from "@/lib/complaints/display";
import {
  coversLocation,
  windowLabel,
  type Announcement,
} from "@/lib/complaints/announcements";
import { fileComplaint, type ReportState } from "./actions";

export type LocationOption = {
  id: string;
  name: string;
  kind: "academic" | "residence" | "facility";
  requires_detail: boolean;
  detail_label: string | null;
  detail_hint: string | null;
};

const KIND_LABEL: Record<LocationOption["kind"], string> = {
  academic: "Academic",
  residence: "Hostel",
  facility: "Facilities",
};

/* Controls are 44px tall on a phone and 36px from `sm` up. */
const CONTROL = "h-11 sm:h-9";

export function ReportForm({
  locations,
  announcements,
  userId,
}: {
  locations: LocationOption[];
  announcements: Announcement[];
  userId: string;
}) {
  const [state, formAction, pending] = useActionState(
    fileComplaint,
    {} as ReportState,
  );

  const [locationId, setLocationId] = useState("");
  const [detail, setDetail] = useState("");
  const [photoPath, setPhotoPath] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const location = useMemo(
    () => locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId],
  );

  // Group the dropdown so fourteen entries stay scannable.
  const groups = useMemo(() => {
    const out = new Map<LocationOption["kind"], LocationOption[]>();
    for (const l of locations) {
      const list = out.get(l.kind) ?? [];
      list.push(l);
      out.set(l.kind, list);
    }
    return [...out.entries()];
  }, [locations]);

  // `items` is what makes the trigger show "Medium" rather than the raw value
  // "medium": Select.Value renders the value verbatim unless it can look the
  // label up, and the default priority is set before the popup has ever opened.
  const locationItems = useMemo(
    () => locations.map((l) => ({ value: l.id, label: l.name })),
    [locations],
  );

  const fieldError = (name: string) => state.fieldErrors?.[name]?.[0];

  // React 19 resets an uncontrolled form once the action resolves, so a
  // rejected submission would otherwise erase everything typed. The action
  // echoes the values back and they go straight back in as defaults.
  const was = (name: string, fallback = "") => state.values?.[name] ?? fallback;

  // Controlled only so the flag can take the colour of what is selected. The
  // uncontrolled version showed a grey flag whether you picked Low or Urgent.
  const [priority, setPriority] = useState(() => was("priority", "medium"));

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPhotoError(null);
    if (!file) {
      setPhotoPath("");
      setPhotoName("");
      return;
    }

    setPhotoBusy(true);
    try {
      const compressed = await compressImage(file);
      const problem = photoProblem(compressed);
      if (problem) {
        setPhotoError(problem);
        return;
      }

      // Uploaded straight from the browser into the student's own folder. The
      // bucket policy rejects any path not starting with their user id, so this
      // key is not a suggestion — it is the only shape storage will accept.
      const key = `${userId}/${crypto.randomUUID()}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("complaint-photos")
        .upload(key, compressed, { contentType: compressed.type });

      if (error) {
        setPhotoError(`Upload failed: ${error.message}`);
        return;
      }
      setPhotoPath(key);
      setPhotoName(file.name);
    } finally {
      setPhotoBusy(false);
    }
  }

  const detailMissing = !!location?.requires_detail && detail.trim() === "";

  /*
     Notices that apply to the place they just picked, plus the campus-wide
     ones.
  */
  const relevant = locationId
    ? announcements.filter((a) => coversLocation(a, locationId))
    : [];

  return (
    /*
       `lg:contents` dissolves the form's own box above `lg`, so the card and
       the actions become two rows of the page's grid instead of one tall
       column.
    */
    <form action={formAction} className="lg:contents">
      <input type="hidden" name="location_id" value={locationId} />
      <input type="hidden" name="photo_path" value={photoPath} />

      <Panel
        className="lg:col-span-2 lg:row-start-1"
        bodyClassName="divide-y divide-border"
      >
        {/* ---- the issue ---- */}
        <div className="space-y-5 px-4 py-5 sm:px-5">
          <Field
            label="What is wrong?"
            htmlFor="title"
            hint="Name the problem, not the place — the place comes next."
            error={fieldError("title")}
          >
            <Input
              id="title"
              name="title"
              required
              maxLength={120}
              defaultValue={was("title")}
              placeholder="Ceiling fan not working"
              className={CONTROL}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" error={fieldError("category")}>
              {/* required so the browser stops an empty submit before it becomes
                  a server round trip — which is what used to wipe the form. */}
              <Select
                name="category"
                required
                items={CATEGORIES}
                defaultValue={was("category") || undefined}
              >
                <SelectTrigger className={`w-full ${CONTROL}`}>
                  <Tag aria-hidden className="size-4 text-primary" />
                  <SelectValue placeholder="Pick one" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Priority" error={fieldError("priority")}>
              <Select
                name="priority"
                required
                items={PRIORITIES}
                value={priority}
                onValueChange={(v) => setPriority(String(v ?? "medium"))}
              >
                <SelectTrigger className={`w-full ${CONTROL}`}>
                  <Flag
                    aria-hidden
                    className={`size-4 ${PRIORITY_INK[priority] ?? "text-muted-foreground"}`}
                  />
                  <SelectValue placeholder="Pick one" />
                </SelectTrigger>
                <SelectContent>
                  {/* The hints have existed in the schema since M3 and were
                      never shown. Without them "High" and "Urgent" are a matter
                      of opinion, and everything arrives Urgent. */}
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex flex-col items-start">
                        <span>{p.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.hint}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        {/* ---- the place ---- */}
        <div className="space-y-5 px-4 py-5 sm:px-5">
          {/* Stacked, not side by side. The detail field exists only for some
              places, so a two-column row left a permanently empty half of the
              card for the ones it does not apply to — and reserving it was the
              only way to stop the layout jumping when it appeared. */}
          <div className="space-y-5">
            <Field label="Where is it?" error={fieldError("location_id")}>
              <Select
                value={locationId}
                items={locationItems}
                onValueChange={(v) => {
                  setLocationId(String(v ?? ""));
                  setDetail("");
                }}
              >
                <SelectTrigger className={`w-full ${CONTROL}`}>
                  <MapPin aria-hidden className="size-4 text-primary" />
                  <SelectValue placeholder="Pick a place" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(([kind, items]) => (
                    <SelectGroup key={kind}>
                      <SelectLabel>{KIND_LABEL[kind]}</SelectLabel>
                      {items.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/*
              The whole point of the locations table: this field appears,
              renames itself, and becomes required based on the place chosen.

              The examples come from detail_hint and not from detail_label,
              which is what they used to do — so the placeholder repeated the
              label back, word for word, directly under it.
            */}
            {location?.detail_label ? (
              <Field
                label={location.detail_label}
                htmlFor="location_detail"
                optional={!location.requires_detail}
                error={fieldError("location_detail")}
              >
                <div className="relative">
                  {/* A pin and not a door: a washroom, a corridor and a lift
                      are all valid answers here, and none of them is a room. */}
                  <MapPinned
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-primary"
                  />
                  <Input
                    id="location_detail"
                    name="location_detail"
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    maxLength={120}
                    placeholder={location.detail_hint ?? ""}
                    className={`pl-9 ${CONTROL}`}
                  />
                </div>
              </Field>
            ) : null}

            {relevant.length > 0 ? (
              <ul className="space-y-2">
                {relevant.map((a) => (
                  <li
                    key={a.id}
                    className="flex gap-2.5 rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/[0.07] px-3.5 py-3"
                  >
                    <Megaphone
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                    />
                    <span className="min-w-0 text-sm">
                      <span className="block font-medium">{a.title}</span>
                      <span className="mt-0.5 block leading-relaxed text-pretty text-muted-foreground">
                        {a.body}
                      </span>
                      <span className="tnum mt-1 block text-xs text-muted-foreground">
                        {windowLabel(a)} &middot; you may not need to file this
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <Field
            label="Describe it"
            htmlFor="description"
            hint="Where exactly, since when, and anything worth knowing before someone walks over."
            error={fieldError("description")}
          >
            <Textarea
              id="description"
              name="description"
              required
              rows={4}
              maxLength={2000}
              defaultValue={was("description")}
              placeholder="The fan in the corner by the window has not run since Monday. The switch clicks but nothing happens."
            />
          </Field>
        </div>

        {/* ---- the evidence ---- */}
        <div className="px-4 py-5 sm:px-5">
          <Field label="Photo" optional error={photoError ?? undefined}>
            <PhotoField
              busy={photoBusy}
              attached={photoPath ? photoName : null}
              onChange={onPhotoChange}
            />
          </Field>
        </div>
      </Panel>

      <div className="mt-5 lg:col-span-2 lg:row-start-2 lg:mt-0">
        {state.error ? (
          <p
            role="alert"
            className="mb-4 rounded-[var(--radius)] border border-destructive/30 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive"
          >
            {state.error}
          </p>
        ) : null}

        {/* Explicit order rather than `flex-col-reverse`: on a phone the action
            you came here for should be under your thumb, but reversing the
            whole row also lifted the "why is this disabled" line above the
            button it is about. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/my-complaints"
            className={`order-2 sm:order-1 ${buttonVariants({ variant: "outline", size: "lg" })}`}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            size="lg"
            className="order-1 w-full sm:order-2 sm:w-auto"
            disabled={pending || photoBusy || !locationId || detailMissing}
          >
            {pending ? "Filing…" : "File complaint"}
          </Button>
          {detailMissing ? (
            <p className="order-3 text-sm text-muted-foreground">
              {location?.name} needs one more detail:{" "}
              {location?.detail_label?.toLowerCase()}
            </p>
          ) : !locationId ? (
            <p className="order-3 text-sm text-muted-foreground">
              Pick a place to continue.
            </p>
          ) : null}
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Lock aria-hidden className="mt-px size-3.5 shrink-0" />
          Only you and the maintenance office can see this — and only you can
          close it.
        </p>
      </div>
    </form>
  );
}

/** Label, hint, control, error — laid out the same way every time. */
function Field({
  label,
  htmlFor,
  optional,
  hint,
  error,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  optional?: boolean;
  /** Guidance that has to survive typing, so never a placeholder. */
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground">(optional)</span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-pretty text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** The photo control. */
function PhotoField({
  busy,
  attached,
  onChange,
}: {
  busy: boolean;
  attached: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius)] border border-dashed px-4 py-5 text-center transition-colors ${
        attached
          ? "border-primary/40 bg-primary/[0.045]"
          : "border-primary/30 bg-primary/[0.06] hover:border-primary/50 hover:bg-primary/[0.09]"
      }`}
    >
      <span
        aria-hidden
        className={`grid size-10 shrink-0 place-items-center rounded-full ${
          attached
            ? "bg-emerald-600 text-white"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {busy ? (
          <Loader2 className="size-[18px] animate-spin" />
        ) : attached ? (
          <Check className="size-[18px]" />
        ) : (
          <ImagePlus className="size-[18px]" />
        )}
      </span>

      <span className="min-w-0 max-w-full">
        <span className="block truncate text-sm font-medium">
          {busy
            ? "Compressing and uploading…"
            : attached
              ? attached
              : "Add a photo"}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {attached
            ? "Attached. Tap to choose a different one."
            : "Take one now, or pick from your gallery."}
        </span>
        {!attached && !busy ? (
          <span className="mt-1.5 block text-[11px] text-muted-foreground">
            JPG, PNG or WebP · up to 5 MB
          </span>
        ) : null}
      </span>

      <input
        id="photo"
        type="file"
        accept={ACCEPTED_PHOTO_TYPES.join(",")}
        onChange={onChange}
        disabled={busy}
        className="sr-only"
      />
    </label>
  );
}
