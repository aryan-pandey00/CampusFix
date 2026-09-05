"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string; ok?: string; values?: Record<string, string> };

/**
 * These are thin. Every rule — who may act, which transition is legal, whether
 * a resolution note is present — lives in the database functions, because a
 * server action still runs as the signed-in user and could be reached by any
 * client.
 */

async function refresh(complaintId: string) {
  revalidatePath(`/admin/complaints/${complaintId}`);
  revalidatePath(`/complaints/${complaintId}`);
  revalidatePath("/admin/complaints");
  revalidatePath("/admin");
}

export async function assignDepartment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const complaintId = String(formData.get("complaint_id") ?? "");
  const departmentId = String(formData.get("department_id") ?? "");

  if (!departmentId) return { error: "Pick a department." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_complaint", {
    p_complaint_id: complaintId,
    p_department_id: departmentId,
  });

  if (error) return { error: error.message };
  await refresh(complaintId);
  return { ok: "Department assigned." };
}

export async function advanceStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const complaintId = String(formData.get("complaint_id") ?? "");
  const toStatus = String(formData.get("to_status") ?? "");
  const note = String(formData.get("note") ?? "");

  if (!toStatus) return { error: "Pick what to move it to." };
  if (toStatus === "resolved" && note.trim() === "") {
    return {
      error: "Say what was done before marking it resolved.",
      values: { note },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("advance_complaint", {
    p_complaint_id: complaintId,
    p_to_status: toStatus,
    p_note: note.trim() || null,
  });

  if (error) return { error: error.message, values: { note } };
  await refresh(complaintId);
  return { ok: toStatus === "resolved" ? "Marked resolved." : "Status updated." };
}

export async function addNote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const complaintId = String(formData.get("complaint_id") ?? "");
  const note = String(formData.get("note") ?? "");
  // Radio group, defaulting to student-visible. Anything other than an
  // explicit "admins" means the student can read it — the safe direction to
  // fail is toward the student being informed, not toward a silent note.
  const isInternal = formData.get("visibility") === "admins";

  if (note.trim() === "") return { error: "The note is empty." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_complaint_note", {
    p_complaint_id: complaintId,
    p_note: note.trim(),
    p_is_internal: isInternal,
  });

  if (error) return { error: error.message, values: { note } };
  await refresh(complaintId);
  return {
    ok: isInternal ? "Internal note added." : "Note added, visible to the student.",
  };
}

/** Close a complaint whose reporter has deleted their account. */
export async function closeAbandoned(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const complaintId = String(formData.get("complaint_id") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.rpc("close_abandoned_complaint", {
    p_complaint_id: complaintId,
  });

  if (error) return { error: error.message };
  await refresh(complaintId);
  return { ok: "Closed." };
}
