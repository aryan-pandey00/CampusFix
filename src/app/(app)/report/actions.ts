"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { complaintSchema } from "@/lib/complaints/schema";

export type ReportState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  /** What the student typed, echoed back. */
  values?: Record<string, string>;
};

/** Files a complaint. */
export async function fileComplaint(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const raw = {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    category: String(formData.get("category") ?? ""),
    priority: String(formData.get("priority") ?? ""),
    location_id: String(formData.get("location_id") ?? ""),
    location_detail: String(formData.get("location_detail") ?? ""),
  };

  const parsed = complaintSchema.safeParse(raw);

  if (!parsed.success) {
    // Same schema the browser ran. Reaching here means it was bypassed.
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: raw,
    };
  }

  const photoPath = String(formData.get("photo_path") ?? "").trim() || null;
  const supabase = await createClient();

  // One call, one transaction: the complaint and its opening timeline event.
  const { data, error } = await supabase.rpc("create_complaint", {
    p_title: parsed.data.title,
    p_description: parsed.data.description,
    p_category: parsed.data.category,
    p_priority: parsed.data.priority,
    p_location_id: parsed.data.location_id,
    p_location_detail: parsed.data.location_detail || null,
    p_photo_path: photoPath,
  });

  if (error) return { error: error.message, values: raw };

  const ticket = data?.[0]?.ticket_no;
  if (!ticket) {
    return { error: "The complaint was not saved. Please try again.", values: raw };
  }

  revalidatePath("/my-complaints");
  redirect(
    `/report/filed?ticket=${encodeURIComponent(ticket)}&id=${encodeURIComponent(
      data[0].complaint_id,
    )}`,
  );
}
