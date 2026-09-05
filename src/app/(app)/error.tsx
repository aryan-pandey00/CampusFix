"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";

/**
 * Catches anything a signed-in screen throws.
 *
 * Deliberately does not print `error.message`. A Postgres error text is either
 * meaningless to a student or tells an attacker about the schema, and the ones
 * worth acting on are already shown inline by the forms. What a person needs
 * here is a way out, not a stack trace.
 *
 * `reset()` re-renders the segment, which is enough for the common case of a
 * dropped connection or an expired signed URL.
 */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      <h1 className="text-xl font-semibold tracking-[-0.015em]">
        That did not load
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Something went wrong on our side. Trying again usually fixes it — if it
        does not, sign out and back in.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Start over
        </Link>
      </div>
    </div>
  );
}
