"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { AuthFeedback } from "@/components/auth-feedback";
import { PasswordField } from "@/components/password-field";
import { updatePassword, type AuthState } from "@/app/auth/actions";

export function ResetForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    {} as AuthState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <PasswordField
        id="password"
        label="New password"
        autoComplete="new-password"
        minLength={8}
        autoFocus
        hint="At least 8 characters."
      />
      {/* A confirm field, which sign-up deliberately does not have. */}
      <PasswordField
        id="confirm"
        name="confirm"
        label="Type it again"
        autoComplete="new-password"
        minLength={8}
      />

      <AuthFeedback state={state} />

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
        {pending ? "Saving…" : "Save and sign in"}
      </Button>
    </form>
  );
}
