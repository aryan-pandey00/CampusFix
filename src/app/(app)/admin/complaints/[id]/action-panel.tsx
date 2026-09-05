"use client";

import { useActionState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { STATUS_LABEL, type Status } from "@/lib/complaints/display";
import {
  addNote,
  advanceStatus,
  assignDepartment,
  closeAbandoned,
  type ActionState,
} from "./actions";

type Named = { id: string; name: string };

/** What an admin may do next, given where the complaint currently is. */
function nextMoves(status: Status): Array<{ to: Status; label: string }> {
  switch (status) {
    case "assigned":
      return [
        { to: "in_progress", label: "Start work" },
        { to: "resolved", label: "Mark resolved" },
      ];
    case "in_progress":
      return [{ to: "resolved", label: "Mark resolved" }];
    default:
      return [];
  }
}

function Feedback({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
      >
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p
        role="status"
        className="flex items-start gap-2 text-sm text-muted-foreground"
      >
        <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
        {state.ok}
      </p>
    );
  }
  return null;
}

export function AdminActions({
  complaintId,
  status,
  departmentId,
  departments,
  reporterGone,
}: {
  complaintId: string;
  status: Status;
  departmentId: string | null;
  departments: Named[];
  /** The reporter deleted their account, so nobody can confirm the fix. */
  reporterGone: boolean;
}) {
  const [assignState, assignAction, assigning] = useActionState(
    assignDepartment,
    {} as ActionState,
  );
  const [statusState, statusAction, advancing] = useActionState(
    advanceStatus,
    {} as ActionState,
  );
  const [noteState, noteAction, noting] = useActionState(
    addNote,
    {} as ActionState,
  );
  const [closeState, closeAction, closing] = useActionState(
    closeAbandoned,
    {} as ActionState,
  );

  const moves = nextMoves(status);
  const finished = status === "resolved" || status === "closed";

  /*
     A reopened complaint is the one case where "assign it to the department it
     is already with" is the right move rather than a no-op.
  */
  const reopened = status === "open" && departmentId !== null;

  return (
    <section className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-xs">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
          Actions
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Every change here writes to the timeline.
        </p>
      </div>

      {/* ---- assign ----
          Not on a finished complaint: assign_complaint refuses one, so every
          control here was disabled and the rail opened with dead ones. */}
      {!finished ? (
        <form action={assignAction} className="space-y-2.5 px-4 py-4">
          <input type="hidden" name="complaint_id" value={complaintId} />
          <Label htmlFor="department_id">
            {!departmentId
              ? "Assign to a department"
              : reopened
                ? "Assign it again"
                : "Reassign to"}
          </Label>
          {/* Deliberately NOT defaulted to the current department. */}
          <NativeSelect
            id="department_id"
            name="department_id"
            /* Preselected on a reopen, because sending it back where it was is
             the expected action and not the rejected one. The note above about
             never defaulting this applies to a complaint whose status would not
             move — not to this. */
            defaultValue={reopened ? departmentId : ""}
          >
            <option value="">
              {reopened
                ? "Pick a department"
                : departmentId
                  ? "Choose a different one"
                  : "Pick one"}
            </option>
            {departments.map((d) => (
              <option
                key={d.id}
                value={d.id}
                disabled={!reopened && d.id === departmentId}
              >
                {d.name}
                {d.id === departmentId
                  ? reopened
                    ? " (where it was)"
                    : " (current)"
                  : ""}
              </option>
            ))}
          </NativeSelect>
          <Button
            type="submit"
            variant="secondary"
            className="w-full"
            disabled={assigning}
          >
            {assigning
              ? "Saving…"
              : departmentId && !reopened
                ? "Reassign"
                : "Assign"}
          </Button>
          {status === "open" ? (
            <p className="text-xs text-pretty text-muted-foreground">
              {reopened
                ? "The student reopened this, so it is Open again but still with the department that worked on it. Assigning it there again puts it back in their queue."
                : "Assigning moves this from Open to Assigned."}
            </p>
          ) : null}
          <Feedback state={assignState} />
        </form>
      ) : null}

      {/* ---- advance ---- */}
      {moves.length > 0 ? (
        <form
          action={statusAction}
          className="space-y-2.5 border-t border-border bg-muted/30 px-4 py-4"
        >
          <input type="hidden" name="complaint_id" value={complaintId} />
          <Label htmlFor="to_status">Move it to</Label>
          <NativeSelect id="to_status" name="to_status">
            {moves.map((m) => (
              <option key={m.to} value={m.to}>
                {m.label} ({STATUS_LABEL[m.to]})
              </option>
            ))}
          </NativeSelect>

          <Label htmlFor="note" className="pt-1">
            What was done
          </Label>
          <Textarea
            id="note"
            name="note"
            rows={3}
            defaultValue={statusState.values?.note ?? ""}
            placeholder="Required when resolving. The student reads this."
          />
          <Button type="submit" className="w-full" disabled={advancing}>
            {advancing ? "Saving…" : "Update status"}
          </Button>
          <Feedback state={statusState} />
        </form>
      ) : status === "resolved" && reporterGone ? (
        /* The one case where the office gets the last word. Normally this slot
           says "waiting for the student", which would be a lie here and would
           leave the complaint stuck in Resolved with no control anywhere in the
           app able to move it. */
        <form
          action={closeAction}
          className="space-y-2.5 bg-muted/30 px-4 py-4"
        >
          <input type="hidden" name="complaint_id" value={complaintId} />
          <p className="text-sm text-pretty text-muted-foreground">
            The student who filed this has deleted their account, so nobody can
            confirm the fix. Closing it here is the only way it can be closed.
          </p>
          {/* The default variant, like "Update status" — this form occupies the
              same slot and is the primary action on the complaint in this
              state. */}
          <Button type="submit" className="w-full" disabled={closing}>
            {closing ? "Closing…" : "Close it"}
          </Button>
          <Feedback state={closeState} />
        </form>
      ) : finished ? (
        <p className="bg-muted/30 px-4 py-3.5 text-sm text-muted-foreground">
          {status === "resolved"
            ? "Waiting for the student to confirm or reopen."
            : "This complaint is closed."}
        </p>
      ) : null}

      {/* ---- note ---- */}
      <form
        action={noteAction}
        className="space-y-2.5 border-t border-border px-4 py-4"
      >
        <input type="hidden" name="complaint_id" value={complaintId} />
        <Label htmlFor="new_note">Add a note</Label>
        <Textarea
          id="new_note"
          name="note"
          rows={2}
          defaultValue={noteState.values?.note ?? ""}
          placeholder="Anything worth recording."
        />
        {/* Two radios, not one checkbox. A checkbox only labels the checked
            state, so "who reads this note" was invisible until you ticked it —
            and getting that wrong either over-shares with the student or loses
            the record entirely. */}
        <fieldset className="space-y-1.5 pt-0.5">
          <legend className="pb-1 text-xs text-muted-foreground">
            Who can read this note?
          </legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="visibility"
              value="student"
              defaultChecked
              className="mt-1 size-3.5 accent-[var(--primary)]"
            />
            <span>
              The student and admins
              <span className="block text-xs text-muted-foreground">
                Use for progress they should know about
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="visibility"
              value="admins"
              className="mt-1 size-3.5 accent-[var(--primary)]"
            />
            <span>
              Admins only
              <span className="block text-xs text-muted-foreground">
                On the record, never shown to the student
              </span>
            </span>
          </label>
        </fieldset>
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={noting}
        >
          {noting ? "Saving…" : "Add note"}
        </Button>
        <Feedback state={noteState} />
      </form>
    </section>
  );
}
