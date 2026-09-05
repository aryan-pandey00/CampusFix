"use client";

import { useActionState, useState } from "react";
import { Trash2, TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteAnnouncement,
  endAnnouncement,
  type AnnouncementState,
} from "./actions";
import type { Phase } from "@/lib/complaints/announcements";

/** Ending and deleting are not the same act. */
export function RowActions({ id, phase }: { id: string; phase: Phase }) {
  const [endState, endAction, ending] = useActionState(
    endAnnouncement,
    {} as AnnouncementState,
  );
  const [delState, delAction, deleting] = useActionState(
    deleteAnnouncement,
    {} as AnnouncementState,
  );
  const [confirming, setConfirming] = useState(false);

  const problem = endState.error ?? delState.error;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5 sm:min-w-36">
      <div className="flex items-center gap-1.5">
        {phase !== "ended" ? (
          <form action={endAction}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="outline" size="sm" disabled={ending}>
              <TimerOff className="size-3.5" />
              {ending ? "Ending…" : "End now"}
            </Button>
          </form>
        ) : null}

        {confirming ? (
          <form action={delAction} className="flex items-center gap-1.5">
            <input type="hidden" name="id" value={id} />
            <span className="text-xs text-muted-foreground">Delete it?</span>
            <Button type="submit" variant="destructive" size="sm" disabled={deleting}>
              {deleting ? "Deleting…" : "Yes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirming(false)}
            >
              No
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
            aria-label="Delete this announcement"
            className="hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      {problem ? (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
