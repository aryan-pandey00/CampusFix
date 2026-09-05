"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/password-field";
import { deleteUserAccount, type UserState } from "../../actions";

/** Two costs, and each one stops a different mistake. */
export function DeleteAccountForm({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(
    deleteUserAccount,
    {} as UserState,
  );
  const [typed, setTyped] = useState("");

  const matches = typed.trim().toLowerCase() === email.trim().toLowerCase();
  /*
     The submit button is disabled until the address matches, and a disabled
     button says nothing about why. The server has a sentence for this exact
     condition and the button is what stops you ever reaching it — so the same
     sentence is said here, as soon as there is something to compare.
  */
  const mismatch = typed.trim().length > 0 && !matches;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="user_id" value={userId} />

      <div className="space-y-2">
        {/* break-all, like the panel above: at 390px the longest address in
            the roster is 416px of mono in a 350px column, and an email has no
            space in it to wrap at. */}
        <Label htmlFor="confirm">
          Type{" "}
          <span className="font-mono font-semibold break-all">{email}</span> to
          confirm
        </Label>
        <Input
          id="confirm"
          name="confirm"
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          aria-invalid={mismatch || undefined}
          aria-describedby={mismatch ? "confirm-mismatch" : undefined}
          className="h-10 font-mono"
        />
        {mismatch ? (
          <p id="confirm-mismatch" className="text-xs text-destructive">
            That does not match the email on this account.
          </p>
        ) : null}
      </div>

      <PasswordField
        id="password"
        label="Your own password"
        autoComplete="current-password"
        hint="Yours, not theirs. This is the one action here that cannot be undone."
      />

      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-pretty text-destructive"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button
          type="submit"
          variant="destructive"
          disabled={pending || !matches}
        >
          <Trash2 className="size-4" />
          {pending ? "Deleting…" : "Delete this account"}
        </Button>
        <Link
          href="/admin/users"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
