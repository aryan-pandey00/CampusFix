"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** A password box with a reveal toggle. */
export function PasswordField({
  id,
  name = "password",
  label = "Password",
  autoComplete,
  minLength,
  autoFocus,
  hint,
  action,
}: {
  id: string;
  name?: string;
  label?: string;
  autoComplete: string;
  minLength?: number;
  autoFocus?: boolean;
  hint?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={revealed ? "text" : "password"}
          required
          minLength={minLength}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          className="h-10 pr-10"
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-[var(--radius-md)] text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
