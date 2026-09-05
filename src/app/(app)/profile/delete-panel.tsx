"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Medallion } from "@/components/medallion";
import { PasswordField } from "@/components/password-field";
import { deleteAccount, type ActionState } from "./actions";

/** Leaving, in two steps. */
export function DeletePanel({ filedCount }: { filedCount: number }) {
  const [state, formAction, pending] = useActionState(
    deleteAccount,
    {} as ActionState,
  );
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  // Only the typed word is tracked here. The password box comes from the
  // shared PasswordField and is uncontrolled, and it does not need to be:
  // `required` stops an empty submit in the browser, and the action refuses
  // one that gets past it.
  const ready = confirm.trim() === "DELETE";

  const complaints =
    filedCount === 0
      ? "Any complaint you filed"
      : filedCount === 1
        ? "The complaint you filed"
        : `The ${filedCount} complaints you filed`;

  return (
    <section className="overflow-hidden rounded-[var(--radius)] border border-destructive/30 bg-card shadow-xs">
      {/* Built to Panel's header measurements rather than its own. */}
      <div className="flex items-start gap-2.5 border-b border-destructive/20 bg-destructive/6 px-4 py-3 sm:px-5">
        <Medallion icon={Trash2} tone="danger" size="sm" className="mt-px" />
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-destructive">
            Delete your account
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            This cannot be undone.
          </p>
        </div>
      </div>

      <div className="space-y-5 px-4 py-4 sm:px-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Consequences
            icon={X}
            tone="text-destructive"
            title="What is deleted"
            items={[
              "Your name, roll number and phone number",
              "Your sign-in — you will not be able to get back in",
            ]}
          />
          <Consequences
            icon={Check}
            tone="text-primary"
            title="What stays"
            items={[
              `${complaints}, with no name attached`,
              "The photos you sent, and what each department wrote",
            ]}
          />
        </div>

        <p className="text-xs text-pretty text-muted-foreground">
          The record stays so the office can still see what was reported and
          what was done about it. Nothing on it will point back to you.
        </p>

        {open ? (
          <form
            action={formAction}
            className="space-y-4 border-t border-border pt-4"
          >
            <PasswordField
              id="delete_password"
              label="Your password"
              autoComplete="current-password"
              hint="Asked for because a signed-in browser is not proof of who is holding it."
            />

            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <span className="font-mono font-semibold">DELETE</span> to
                confirm
              </Label>
              <Input
                id="confirm"
                name="confirm"
                autoComplete="off"
                spellCheck={false}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-10 max-w-[16rem] font-mono"
              />
            </div>

            {state.error ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                {state.error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                variant="destructive"
                disabled={pending || !ready}
              >
                <Trash2 className="size-4" />
                {pending ? "Deleting…" : "Delete my account"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setConfirm("");
                }}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(true)}
              className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="size-4" />
              Delete my account
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function Consequences({
  icon: Icon,
  tone,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <Icon className={`mt-0.5 size-3.5 shrink-0 ${tone}`} />
            <span className="text-pretty">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
