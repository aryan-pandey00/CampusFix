"use client";

import { useActionState } from "react";
import { AlertCircle, Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { STATUS_LABEL, type Status } from "@/lib/complaints/display";
import { addNote, advanceStatus, sendBack, type ActionState } from "./actions";

/** What this department may do next, given where the complaint is. */
function nextMoves(status: Status): Array<{ to: Status; label: string }> {
  switch (status) {
    case "assigned":
      return [
        { to: "in_progress", label: "Start work" },
        { to: "resolved", label: "It is fixed" },
      ];
    case "in_progress":
      return [{ to: "resolved", label: "It is fixed" }];
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

export function StaffActions({
  complaintId,
  ticketNo,
  status,
}: {
  complaintId: string;
  ticketNo: string;
  status: Status;
}) {
  const [statusState, statusAction, advancing] = useActionState(
    advanceStatus,
    {} as ActionState,
  );
  const [noteState, noteAction, noting] = useActionState(
    addNote,
    {} as ActionState,
  );
  const [backState, backAction, sending] = useActionState(
    sendBack,
    {} as ActionState,
  );

  const moves = nextMoves(status);

  return (
    <section className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-xs">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
          Your actions
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Every change here writes to the timeline the student reads.
        </p>
      </div>

      {/* ---- move it along ---- */}
      {moves.length > 0 ? (
        <form action={statusAction} className="space-y-2.5 px-4 py-4">
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
            What you did
          </Label>
          <Textarea
            id="note"
            name="note"
            rows={3}
            defaultValue={statusState.values?.note ?? ""}
            placeholder="Required to mark it fixed. The student reads this before deciding."
          />
          <Button type="submit" className="w-full" disabled={advancing}>
            {advancing ? "Saving…" : "Update"}
          </Button>
          <Feedback state={statusState} />
        </form>
      ) : (
        <p className="px-4 py-3.5 text-sm text-muted-foreground">
          {status === "resolved"
            ? "You have marked this fixed. It is with the student now — they confirm it, or reopen it if it is not right."
            : status === "closed"
              ? "The student has confirmed this fix. Nothing left to do."
              : "The student reopened this, so it is back with the office. They have to hand it to you again before you can work on it."}
        </p>
      )}

      {/* ---- note ---- */}
      <form
        action={noteAction}
        className="space-y-2.5 border-t border-border bg-muted/30 px-4 py-4"
      >
        <input type="hidden" name="complaint_id" value={complaintId} />
        <Label htmlFor="new_note">Add a note</Label>
        <Textarea
          id="new_note"
          name="note"
          rows={2}
          defaultValue={noteState.values?.note ?? ""}
          placeholder="Waiting on a part, cannot get access, anything worth recording."
        />
        {/* Two radios rather than one checkbox, as on the office's panel: a
            checkbox only labels its checked state, so "who reads this" stays
            invisible until you tick it — and getting that wrong either
            over-shares or loses the record entirely. */}
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
              The student too
              <span className="block text-xs text-muted-foreground">
                Use for anything they are waiting to hear
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="visibility"
              value="internal"
              className="mt-1 size-3.5 accent-[var(--primary)]"
            />
            <span>
              Your department and the office
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

      {/* ---- hand it back ---- */}
      {status === "assigned" || status === "in_progress" ? (
        <form
          action={backAction}
          className="space-y-2.5 border-t border-border px-4 py-4"
        >
          <input type="hidden" name="complaint_id" value={complaintId} />
          <input type="hidden" name="ticket_no" value={ticketNo} />
          <Label htmlFor="reason" className="flex items-center gap-2">
            <Undo2 aria-hidden className="size-3.5 text-muted-foreground" />
            Not ours — send it back
          </Label>
          {/* A department cannot pass work sideways to another department, only
              back to the office. */}
          <p className="text-xs text-muted-foreground">
            It goes back to the office to be sent to the right department. The
            reason is shown to them and to the student.
          </p>
          <Textarea
            id="reason"
            name="reason"
            rows={2}
            defaultValue={backState.values?.reason ?? ""}
            placeholder="For example: this is a water leak, not wiring."
          />
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={sending}
          >
            {sending ? "Sending…" : "Send back to the office"}
          </Button>
          <Feedback state={backState} />
        </form>
      ) : null}
    </section>
  );
}
