"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export type CloseState = { error?: string; values?: Record<string, string> };

async function refresh(complaintId: string) {
  revalidatePath(`/complaints/${complaintId}`);
  revalidatePath(`/admin/complaints/${complaintId}`);
  revalidatePath("/my-complaints");
  revalidatePath("/admin/complaints");
  revalidatePath("/admin");
}

/**
 * Both of these are thin on purpose. That only the reporter may act, and only
 * on a resolved complaint, is enforced by the database functions — a server
 * action runs as the signed-in user and is reachable by any client, so it is
 * not the place to decide who has the last word.
 */

export async function confirmFix(
  _prev: CloseState,
  formData: FormData,
): Promise<CloseState> {
  await requireUser();
  const complaintId = String(formData.get("complaint_id") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_complaint", {
    p_complaint_id: complaintId,
  });

  if (error) return { error: error.message };
  await refresh(complaintId);
  return {};
}

export async function reopenComplaint(
  _prev: CloseState,
  formData: FormData,
): Promise<CloseState> {
  await requireUser();
  const complaintId = String(formData.get("complaint_id") ?? "");
  const reason = String(formData.get("reason") ?? "");

  if (reason.trim() === "") {
    return { error: "Say what is still wrong.", values: { reason } };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_complaint", {
    p_complaint_id: complaintId,
    p_reason: reason.trim(),
  });

  if (error) return { error: error.message, values: { reason } };
  await refresh(complaintId);
  return {};
}
