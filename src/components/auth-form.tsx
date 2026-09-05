"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFeedback } from "@/components/auth-feedback";
import { PasswordField } from "@/components/password-field";
import type { AuthState } from "@/app/auth/actions";

type Props = {
  mode: "signin" | "signup";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  next?: string;
};

export function AuthForm({ mode, action, next }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as AuthState);
  const isSignUp = mode === "signup";

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {isSignUp && (
        <>
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              required
              autoFocus
              autoComplete="name"
              className="h-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="roll_no">
                Roll number{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="roll_no"
                name="roll_no"
                inputMode="numeric"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="h-10"
              />
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoFocus={!isSignUp}
          autoComplete="email"
          className="h-10"
        />
        {/* The one mitigation for skipping email verification. */}
        {isSignUp && (
          <p className="text-xs text-balance text-muted-foreground">
            Use an address you can open. It is the only way to reset your
            password later.
          </p>
        )}
      </div>

      <PasswordField
        id="password"
        autoComplete={isSignUp ? "new-password" : "current-password"}
        minLength={isSignUp ? 8 : undefined}
        hint={isSignUp ? "At least 8 characters." : undefined}
        action={
          isSignUp ? null : (
            <Link
              href="/auth/forgot"
              className="text-[13px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Forgot password?
            </Link>
          )
        }
      />

      <AuthFeedback state={state} />

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
        {pending
          ? isSignUp ? "Creating account…" : "Signing in…"
          : isSignUp ? "Create account" : "Sign in"}
      </Button>

      <p className="text-sm text-muted-foreground">
        {isSignUp ? "Already have an account? " : "New to CampusFix? "}
        <Link
          href={isSignUp ? "/login" : "/signup"}
          className="font-medium text-primary underline underline-offset-4"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
