"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, Check, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { changeRole, sendResetLink, type UserState } from "./actions";

type Named = { id: string; name: string };

export type Person = {
  id: string;
  full_name: string | null;
  roll_no: string | null;
  email: string | null;
  role: "student" | "staff" | "admin";
  department_id: string | null;
  department: string | null;
  is_super_admin: boolean;
  created_at: string;
};

function Feedback({ state }: { state: UserState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="flex items-start gap-1.5 text-xs text-pretty text-destructive"
      >
        <AlertCircle className="mt-0.5 size-3 shrink-0" />
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p
        role="status"
        className="flex items-start gap-1.5 text-xs text-pretty text-muted-foreground"
      >
        <Check className="mt-0.5 size-3 shrink-0 text-primary" />
        {state.ok}
      </p>
    );
  }
  return null;
}

/** What can be done to one account, if anything. */
export function UserRowActions({
  person,
  departments,
  viewerIsOwner,
  isSelf,
}: {
  person: Person;
  departments: Named[];
  viewerIsOwner: boolean;
  isSelf: boolean;
}) {
  const [roleState, roleAction, saving] = useActionState(
    changeRole,
    {} as UserState,
  );
  const [resetState, resetAction, sending] = useActionState(
    sendResetLink,
    {} as UserState,
  );

  /*
     Ordered by which reason actually governs, not by which is easiest to
     check.
  */
  const blocked = person.is_super_admin
    ? "The owner's role is fixed."
    : !viewerIsOwner
      ? "Only the owner changes roles."
      : isSelf
        ? "You cannot change your own role."
        : null;

  return (
    <div className="space-y-2">
      {blocked ? (
        <p className="text-xs text-muted-foreground">{blocked}</p>
      ) : (
        <form action={roleAction} className="flex items-center gap-2">
          <input type="hidden" name="user_id" value={person.id} />
          {/* One select, not "choose a role" followed by "and now a
              department". */}
          <NativeSelect
            name="choice"
            defaultValue=""
            aria-label={`Change what ${person.full_name ?? "this account"} is`}
            wrapperClassName="min-w-0 flex-1"
            className="h-8 text-[13px]"
          >
            <option value="">Change to…</option>
            <optgroup label="Role">
              <option value="student" disabled={person.role === "student"}>
                Student{person.role === "student" ? " (current)" : ""}
              </option>
              <option value="admin" disabled={person.role === "admin"}>
                Admin{person.role === "admin" ? " (current)" : ""}
              </option>
            </optgroup>
            <optgroup label="Department account">
              {departments.map((d) => (
                <option
                  key={d.id}
                  value={`staff:${d.id}`}
                  disabled={
                    person.role === "staff" && person.department_id === d.id
                  }
                >
                  {d.name}
                  {person.role === "staff" && person.department_id === d.id
                    ? " (current)"
                    : ""}
                </option>
              ))}
            </optgroup>
          </NativeSelect>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={saving}
            className="h-8 shrink-0 px-2.5 text-[13px]"
          >
            {saving ? "Saving…" : "Apply"}
          </Button>
        </form>
      )}
      <Feedback state={roleState} />

      {/*
         One line, not two. Both are secondary and both are the same on every
         row, and stacking them made the action column three groups tall — so
         the row's height came from a menu repeated twelve times rather than
         from anything about the person in it.
      */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {person.email ? (
          <form action={resetAction}>
            <input type="hidden" name="email" value={person.email} />
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-60"
            >
              <KeyRound className="size-3" />
              {sending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        ) : null}

        {/* A link, not a form. Deleting needs the owner's password and the
            target's address typed out, which will not fit in a table cell
            alongside a list of what happens — so the confirmation is its own
            page and this is the way in. */}
        {viewerIsOwner && !isSelf && !person.is_super_admin ? (
          <Link
            href={`/admin/users/${person.id}/delete`}
            className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-destructive underline underline-offset-4 transition-opacity hover:opacity-80"
          >
            <Trash2 className="size-3" />
            Delete account
          </Link>
        ) : null}
      </div>
      <Feedback state={resetState} />
    </div>
  );
}
