"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { resetRedirectTo } from "@/lib/site-url";

export type UserState = { error?: string; ok?: string };

/** Thin, like every other action in this app. */
export async function changeRole(
  _prev: UserState,
  formData: FormData,
): Promise<UserState> {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  // One control, so there is no "pick a role, then maybe pick a department"
  // second step to get half-finished: "student", "admin", or "staff:<uuid>".
  const choice = String(formData.get("choice") ?? "");
  if (!choice) return { error: "Pick what they should be." };

  const [role, department] = choice.split(":");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", {
    p_user: userId,
    p_role: role,
    p_department: department || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  // A new department account changes who can see what, and the dashboard counts
  // admins nowhere — but the shell's nav for that person changes entirely.
  revalidatePath("/", "layout");
  return {
    ok:
      role === "staff"
        ? "Done. They will see their department's queue next time they sign in."
        : `Done. They are ${role === "admin" ? "an admin" : "a student"} now.`,
  };
}

/** Send someone a reset link. */
export async function sendResetLink(
  _prev: UserState,
  formData: FormData,
): Promise<UserState> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "That account has no email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: resetRedirectTo(),
  });

  if (error) return { error: error.message };
  // Worded for an admin, who already knows the account exists — the neutral
  // "if that address has an account" phrasing belongs on the public form, where
  // it stops the page being used to discover who is registered.
  return { ok: `Link sent to ${email}. It expires in an hour.` };
}

/** Remove an account entirely. */
export async function deleteUserAccount(
  _prev: UserState,
  formData: FormData,
): Promise<UserState> {
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const typed = String(formData.get("confirm") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!userId) return { error: "No account was named." };
  if (!typed) return { error: "Type the email address to confirm." };
  if (!password) return { error: "Enter your own password." };

  const supabase = await createClient();

  // admin_list_users() rather than a profiles query: the email is in
  // auth.users, which PostgREST does not expose, and that function is already
  // the one door to it (0012).
  const { data: roster, error: rosterError } = await supabase.rpc(
    "admin_list_users",
  );
  if (rosterError) return { error: rosterError.message };

  const target = ((roster ?? []) as Array<{ id: string; email: string | null }>)
    .find((u) => u.id === userId);
  if (!target) return { error: "That account no longer exists." };

  // Case-insensitive: an email address is, and someone re-typing one from the
  // row above has no reason to match its capitalisation.
  if (typed !== (target.email ?? "").trim().toLowerCase()) {
    return { error: "That does not match the email on this account." };
  }

  const { error } = await supabase.rpc("delete_user_account", {
    p_user: userId,
    p_password: password,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  revalidatePath("/admin/activity");
  revalidatePath("/admin");
  // Back to the list, which is where the absence is the confirmation. No email
  // in the URL: it would be echoed onto the page from a reader-controlled
  // string, and the activity log already has the detail.
  redirect("/admin/users?deleted=1");
}
