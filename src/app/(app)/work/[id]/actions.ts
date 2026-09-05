"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";

export type ActionState = {
  error?: string;
  ok?: string;
  values?: Record<string, string>;
};

/** As thin as the office's equivalent, and for the same reason. */
async function refresh(complaintId: string) {
  revalidatePath(`/work/${complaintId}`);
  revalidatePath("/work");
  // The same change has to show up on the other two views of this complaint:
  // the student is watching for it, and the office's dashboard counts it.
  revalidatePath(`/complaints/${complaintId}`);
  revalidatePath(`/admin/complaints/${complaintId}`);
  revalidatePath("/admin/complaints");
  revalidatePath("/admin");
}

export async function advanceStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();
  const complaintId = String(formData.get("complaint_id") ?? "");
  const toStatus = String(formData.get("to_status") ?? "");
  const note = String(formData.get("note") ?? "");

  if (!toStatus) return { error: "Pick what to move it to." };
  if (toStatus === "resolved" && note.trim() === "") {
    return {
      error: "Say what you did before marking it fixed.",
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
  return {
    ok:
      toStatus === "resolved"
        ? "Marked fixed. The student decides whether it is closed."
        : "Marked as started.",
  };
}

export async function addNote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();
  const complaintId = String(formData.get("complaint_id") ?? "");
  const note = String(formData.get("note") ?? "");
  // Anything other than an explicit "internal" means the student can read it.
  // The safe direction to fail is toward the student being told, not toward a
  // silent note.
  const isInternal = formData.get("visibility") === "internal";

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
    ok: isInternal
      ? "Note added, not shown to the student."
      : "Note added, and the student can read it.",
  };
}

/** Hand it back to the office. */
export async function sendBack(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();
  const complaintId = String(formData.get("complaint_id") ?? "");
  const ticket = String(formData.get("ticket_no") ?? "");
  const reason = String(formData.get("reason") ?? "");

  if (reason.trim() === "") {
    return { error: "Say why it is not yours.", values: { reason } };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("return_to_office", {
    p_complaint_id: complaintId,
    p_reason: reason.trim(),
  });

  if (error) return { error: error.message, values: { reason } };
  await refresh(complaintId);
  redirect(`/work?sent=${encodeURIComponent(ticket)}`);
}
