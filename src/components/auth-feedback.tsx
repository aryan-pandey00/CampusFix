import type { AuthState } from "@/app/auth/actions";

/** The error and notice blocks every auth form shows. */
export function AuthFeedback({ state }: { state: AuthState }) {
  return (
    <>
      {state.error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-border bg-muted px-3 py-2 text-sm text-pretty"
        >
          {state.notice}
        </p>
      ) : null}
    </>
  );
}
