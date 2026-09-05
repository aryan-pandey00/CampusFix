"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/password-field";
import { changePassword, type ActionState } from "./actions";

/** Change your password, old one included. */
export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePassword,
    {} as ActionState,
  );
  const form = useRef<HTMLFormElement>(null);

  // Emptied on success, or three filled password boxes sit there afterwards
  // looking like the change has not been submitted yet.
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={formAction} className="space-y-4">
      <PasswordField
        id="current"
        name="current"
        label="Current password"
        autoComplete="current-password"
        action={
          <Link
            href="/auth/forgot"
            className="text-xs font-medium text-primary underline underline-offset-4"
          >
            Forgot password?
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField
          id="new_password"
          name="password"
          label="New password"
          autoComplete="new-password"
          minLength={8}
          hint="At least 8 characters."
        />
        <PasswordField
          id="confirm_password"
          name="confirm"
          label="Confirm new password"
          autoComplete="new-password"
          minLength={8}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
        {state.error ? (
          <p
            role="alert"
            className="flex items-start gap-2 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            {state.error}
          </p>
        ) : state.ok ? (
          <p
            role="status"
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
            {state.ok}
          </p>
        ) : null}
      </div>
    </form>
  );
}
