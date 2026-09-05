"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, type ActionState } from "./actions";

/** The editable half of the account. */
export function DetailsForm({
  fullName,
  rollNo,
  phone,
}: {
  fullName: string;
  rollNo: string;
  phone: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    {} as ActionState,
  );

  const [name, setName] = useState(fullName);
  const [roll, setRoll] = useState(rollNo);
  const [tel, setTel] = useState(phone);

  // Compared against the props, which arrive fresh from the server after a
  // save — so a successful save settles the button back to dead on its own.
  const dirty = name !== fullName || roll !== rollNo || tel !== phone;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="roll_no">
            Roll number{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="roll_no"
            name="roll_no"
            inputMode="numeric"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Your name and phone number are what a department sees when it comes to
        fix something you reported.
      </p>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state.error ? (
          <p
            role="alert"
            className="flex items-start gap-2 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            {state.error}
          </p>
        ) : state.ok && !dirty ? (
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
