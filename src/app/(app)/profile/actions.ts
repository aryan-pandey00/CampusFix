"use server";

import { createClient as createRawClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendly } from "@/lib/auth-errors";

export type ActionState = { error?: string; ok?: string };

/** The three details someone can correct about themselves. */
export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUser();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const rollNo = String(formData.get("roll_no") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  // The one required field, for the same reason it is required at sign-up: a
  // complaint with no name on it gives the department nobody to ask.
  if (!fullName) return { error: "Please enter your name." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      roll_no: rollNo || null,
      phone: phone || null,
    })
    // Redundant against the policy, and kept anyway: it means this statement
    // is a single-row update on its face, not only because of a policy
    // somewhere else.
    .eq("id", session.userId);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  // The shell prints the name on every screen, so a rename has to reach the
  // whole layout and not just this page.
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

/** Leaving. */
export async function deleteAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (confirm !== "DELETE") {
    return { error: "Type DELETE in the box to confirm." };
  }
  if (!password) return { error: "Enter your password." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_own_account", {
    p_password: password,
  });
  if (error) return { error: error.message };

  // `scope: "local"` clears the cookie without asking the server to revoke a
  // session whose user no longer exists — a global sign-out here is a call
  // that can only fail.
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");

  // The only confirmation there is room for. The session is gone, so there is
  // no signed-in screen left to show a success message on.
  redirect("/login?left=deleted");
}

/** Changing your password, which now costs you the old one. */
export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUser();

  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current) return { error: "Enter your current password." };
  if (password.length < 8) {
    return { error: "The new password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Those two new passwords do not match." };
  }
  if (password === current) {
    return { error: "That is already your password. Pick a different one." };
  }
  if (!session.email) {
    return { error: "This account has no email address to check against." };
  }

  /* A throwaway client, so the check cannot touch the live session. */
  const probe = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: wrong } = await probe.auth.signInWithPassword({
    email: session.email,
    password: current,
  });
  if (wrong) {
    // Deliberately not Supabase's "Invalid login credentials", which reads as
    // if the whole sign-in failed rather than one box being wrong.
    return {
      error:
        wrong.code === "over_request_rate_limit"
          ? friendly(wrong)
          : "That is not your current password.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendly(error) };

  // No redirect. Changing a password does not end the session it was changed
  // from, and /auth/reset's reason for bouncing people to a dashboard — that
  // walking away from a success message means walking away signed in with a
  // password you think you replaced — does not apply to someone who was
  // already signed in when they got here.
  return { ok: "Password changed." };
}
