"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFeedback } from "@/components/auth-feedback";
import { AuthCard } from "@/components/auth-card";
import { requestPasswordReset, type AuthState } from "@/app/auth/actions";

export function ForgotForm({ failed }: { failed?: string }) {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    {} as AuthState,
  );

  /* Once the link has gone, the whole card stops being a form. */
  if (state.sentTo) {
    return (
      <AuthCard
        title="Check your inbox"
        subtitle="A reset link is on its way. It expires in an hour."
      >
        <p
          role="status"
          className="flex items-center gap-2.5 rounded-[var(--radius)] border border-primary/25 bg-primary/[0.06] px-4 py-3 text-sm font-medium"
        >
          <MailCheck aria-hidden className="size-4 shrink-0 text-primary" />
          {/* The heading above says this, but a heading changing is not
              announced and this row is: without it a screen reader hears an
              address and nothing about why. */}
          <span className="sr-only">A reset link is on its way to</span>
          {/* The address on a line of its own, because a typo is the likeliest
              reason nothing arrives and this is the only screen that can show
              what was actually sent to. */}
          <span className="min-w-0 break-words">{state.sentTo}</span>
        </p>

        <Link
          href="/login"
          className={`${buttonVariants({ size: "lg" })} mt-5 w-full`}
        >
          Back to sign in
        </Link>

        {/*
           Everything that can go wrong sits after the action rather than
           between the address and it, and beside the control each remedy needs.

           The words are identical whether or not that address has an account —
           anything that differs between the two cases turns this screen into a
           way to check who is registered. The old wording kept that property by
           opening with "If <address> has an account", which reads as doubt to
           the one person certainly looking at it: the owner.

           Both real failures, in the order they happen: the mail arrived and
           was filed as spam, or it was never going to arrive because that is
           not the address they used. The second one used to be advice with no
           control on the screen to follow it — "Send it again" goes to the same
           address, carried in the hidden field below.
        */}
        <form action={formAction} className="mt-5">
          <input type="hidden" name="email" value={state.sentTo} />
          {/* No feedback block here: a resend that fails returns no `sentTo`,
              which drops back to the form with the reason on it. The form is
              where you retry, so that is where the error belongs. */}
          <p className="text-sm text-balance text-muted-foreground">
            Nothing after a few minutes? Look in your spam folder, or{" "}
            <button
              type="submit"
              disabled={pending}
              className="font-medium text-primary underline underline-offset-4 disabled:opacity-60"
            >
              {pending ? "sending…" : "send it again"}
            </button>
            . You can also{" "}
            {/* A plain anchor, not Link: a soft navigation re-renders this same
                component in the same position, so React keeps the state that IS
                this screen and nothing appears to happen. */}
            <a
              href="/auth/forgot"
              className="font-medium text-primary underline underline-offset-4"
            >
              use a different address
            </a>
            .
          </p>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We will email you a link that lets you set a new password."
    >
      {failed ? (
        <p
          role="alert"
          className="mb-4 rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-pretty text-destructive"
        >
          {failed}
        </p>
      ) : null}
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            className="h-10"
          />
        </div>

        <AuthFeedback state={state} />

        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          disabled={pending}
        >
          {pending ? "Sending…" : "Send me a reset link"}
        </Button>

        <p className="text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
