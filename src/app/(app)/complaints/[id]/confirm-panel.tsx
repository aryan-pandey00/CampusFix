"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { confirmFix, reopenComplaint, type CloseState } from "./actions";

/**
 * The last step of the loop, and the only screen where the student decides
 * rather than waits — so it is the one panel on the page that wears the
 * accent.
 */
export function ConfirmOrReopen({ complaintId }: { complaintId: string }) {
  const [confirmState, confirmAction, confirming] = useActionState(
    confirmFix,
    {} as CloseState,
  );
  const [reopenState, reopenAction, reopening] = useActionState(
    reopenComplaint,
    {} as CloseState,
  );

  const [showReopen, setShowReopen] = useState(false);
  const [reason, setReason] = useState(reopenState.values?.reason ?? "");

  const error = confirmState.error ?? reopenState.error;

  return (
    <section className="rounded-[var(--radius)] border border-primary/25 bg-primary/[0.045] p-4 shadow-xs sm:p-5">
      <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
        Is it actually fixed?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Go and look before you answer. Nothing closes until you say so.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2.5">
        <form action={confirmAction}>
          <input type="hidden" name="complaint_id" value={complaintId} />
          <Button type="submit" disabled={confirming || reopening}>
            {confirming ? "Closing…" : "Yes, it is fixed"}
          </Button>
        </form>

        {!showReopen ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowReopen(true)}
            disabled={confirming}
          >
            No, it is still a problem
          </Button>
        ) : null}
      </div>

      {showReopen ? (
        <form
          action={reopenAction}
          className="mt-4 space-y-2 border-t border-primary/20 pt-4"
        >
          <input type="hidden" name="complaint_id" value={complaintId} />
          <Label htmlFor="reason">What is still wrong?</Label>
          <Textarea
            id="reason"
            name="reason"
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="The fan runs but only on the lowest speed."
          />
          <p className="text-xs text-muted-foreground">
            This goes back to the same department, along with everything already
            on the timeline.
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={reopening || reason.trim() === ""}>
              {reopening ? "Reopening…" : "Reopen it"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowReopen(false)}
              disabled={reopening}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
