"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { presetEnd, toInstant } from "@/lib/complaints/announcements";

export type AnnouncementState = {
  error?: string;
  ok?: string;
  values?: Record<string, string>;
};

/**
 * Thin, like the complaint actions, and for the same reason: the rules live in
 * the database.
 */

async function refresh() {
  revalidatePath("/admin/announcements");
  // Students read these on both screens, and neither would notice otherwise.
  revalidatePath("/home");
  revalidatePath("/report");
}

export async function createAnnouncement(
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const session = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const locationId = String(formData.get("location_id") ?? "");
  const startsMode = String(formData.get("starts_mode") ?? "now");
  const startsAtRaw = String(formData.get("starts_at") ?? "");
  const endsIn = String(formData.get("ends_in") ?? "");
  const endsAtRaw = String(formData.get("ends_at") ?? "");

  // Echoed back on every failure path. React 19 resets an uncontrolled form
  // once the action resolves, so without this a rejected submission would erase
  // what was typed.
  const values = {
    title,
    body,
    location_id: locationId,
    starts_mode: startsMode,
    starts_at: startsAtRaw,
    ends_in: endsIn,
    ends_at: endsAtRaw,
  };

  if (title.length < 3) return { error: "Give it a title.", values };
  if (body.length < 3) return { error: "Say what is happening.", values };

  const startsAt =
    startsMode === "later" ? toInstant(startsAtRaw) : new Date().toISOString();
  if (startsMode === "later" && !startsAt) {
    return { error: "Pick when it should start, or choose Straight away.", values };
  }

  const endsAt = endsIn === "custom" ? toInstant(endsAtRaw) : presetEnd(endsIn);
  if (!endsAt) {
    return { error: "Pick when it should stop showing.", values };
  }
  if (new Date(endsAt).getTime() <= new Date(startsAt!).getTime()) {
    return { error: "It has to end after it starts.", values };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    title,
    body,
    // "" is the campus-wide option in the picker. The column is nullable, and
    // null is what "everywhere" means.
    location_id: locationId || null,
    starts_at: startsAt,
    ends_at: endsAt,
    // The policy refuses anything but the truth here, so this is the only value
    // the insert can succeed with.
    created_by: session.userId,
  });

  if (error) return { error: error.message, values };
  await refresh();
  return { ok: "Posted." };
}

/**
 * The normal way to retire one early: it moves to Ended and keeps the record of
 * what was said. Deleting is for a typo nobody read.
 */
export async function endAnnouncement(
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Nothing to end." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({ ends_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  await refresh();
  return { ok: "Ended." };
}

export async function deleteAnnouncement(
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Nothing to delete." };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);

  if (error) return { error: error.message };
  await refresh();
  return { ok: "Deleted." };
}
