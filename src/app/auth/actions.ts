"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { homeFor, type Role } from "@/lib/auth";
import { resetRedirectTo, safePath } from "@/lib/site-url";
import { friendly } from "@/lib/auth-errors";
import { RECOVERY_COOKIE } from "@/lib/recovery";

export type AuthState = {
  error?: string;
  notice?: string;
  /** Set once a reset link has gone out, so the form can stop being a form. */
  sentTo?: string;
};

/**
 * Optional pilot restriction. Unset means any email may sign up, which is what
 * the demo wants.
 */
const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Supabase deliberately does not say which half was wrong, and neither do
    // we — confirming that an email exists is a free gift to an attacker.
    return { error: "That email and password combination did not work." };
  }

  // Send them where they were headed, or to their own home. Looking the role
  // up here rather than redirecting to `/` matters now that `/` is a public
  // landing page — otherwise signing in drops you back on the front door.
  const next = safePath(String(formData.get("next") || ""));
  revalidatePath("/", "layout");
  if (next) redirect(next);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  redirect(homeFor((profile?.role as Role) ?? "student"));
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const rollNo = String(formData.get("roll_no") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) return { error: "Please enter your name." };
  if (!email) return { error: "Please enter your email." };
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (ALLOWED_DOMAIN && !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return { error: `Sign-up is restricted to @${ALLOWED_DOMAIN} addresses.` };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the handle_new_user trigger. Note there is no `role` here, and
    // the trigger would ignore one if there were — see 0005_profile_trigger.sql.
    options: { data: { full_name: fullName, roll_no: rollNo, phone } },
  });

  if (error) return { error: error.message };

  // With "Confirm email" on, Supabase creates the user but withholds the
  // session until a link is clicked. With it off, we are already signed in.
  if (!data.session) {
    return {
      notice: `Account created. Check ${email} for a confirmation link, then sign in.`,
    };
  }

  revalidatePath("/", "layout");
  /*
    Their own home, not the landing page.

    This sent people to "/" — so creating an account dropped you on the
    marketing front door, signed in, with a button to press to get where you
    were already going. `/home` and not a role lookup like signIn does: sign-up
    is self-serve and the trigger in 0005 deliberately ignores any role in the
    metadata, so the column default 'student' is the only role a new account
    can possibly have.
  */
  redirect(homeFor("student"));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  // The landing page, not the login form. Signing out dropped people straight
  // back onto a sign-in box, which meant nobody who used the app ever saw the
  // front door — and "I'm done" is not the same request as "let me back in".
  redirect("/");
}

/** Send the reset email. */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Please enter your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: resetRedirectTo(),
  });

  if (error) return { error: friendly(error) };

  /* The address only. What is said about it belongs on the screen that says
     it — and that wording has to be identical whether or not the address has
     an account, or this becomes a way to check who is registered. */
  return { sentTo: email };
}

/** Set a new password for whoever the current session belongs to. */
export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  // Sign-up has no confirm field because a typo there is fixable by resetting.
  // A typo here locks you out until another email, so it is worth the field.
  if (password !== confirm) {
    return { error: "Those two passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "That reset link has expired or has already been used. Ask for a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendly(error) };

  // Straight into the app rather than to a "done" screen. Landing here IS
  // being signed in, so leaving someone on a success message means walking away
  // signed in with a password they think they have replaced.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  // Spend the marker. It is what let this form skip the current-password
  // check, so leaving it behind would keep /auth/reset open as a bypass for
  // the rest of its hour — on a browser that has just proved it can set a
  // password without knowing the old one.
  (await cookies()).delete(RECOVERY_COOKIE);

  revalidatePath("/", "layout");
  redirect(homeFor((profile?.role as Role) ?? "student"));
}
