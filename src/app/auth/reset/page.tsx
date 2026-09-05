import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { RECOVERY_COOKIE } from "@/lib/recovery";
import { AuthCard } from "@/components/auth-card";
import { buttonVariants } from "@/components/ui/button";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Set a new password · CampusFix" };

/** Set a new password. */
export default async function ResetPage() {
  const session = await getSessionProfile();
  const fromLink = (await cookies()).get(RECOVERY_COOKIE)?.value === "1";

  // Signed in, but not from a link. They already know their password, or they
  // should have to — /profile asks for it.
  if (session && !fromLink) redirect("/profile");

  /*
     MEASURED: an expired or already-used link never reaches this branch. Every
     failure in /auth/callback — a token Supabase has already rejected, a
     verifyOtp error, a code that will not exchange, a URL with neither —
     returns to /auth/forgot?failed=…, which explains that case and offers
     another link. So the copy here was written for the one scenario that
     cannot happen.

     What does reach it: this URL typed, bookmarked or followed from an old
     tab, with no link involved at all — and, rarely, a callback that succeeded
     while its cookies did not stick. "This link is no longer live" told the
     first of those about a link they never had.
  */
  if (!session) {
    return (
      <AuthCard
        title="Ask for a reset link"
        /*
           Two sentences, one line each, and the break between them is
           structural rather than left to the wrap.

           MEASURED, twice. It was one long sentence with two commas and every
           break landed after one: a line ending "still landed here," with the
           space after it reads as a deliberate break that is not one. Shorter
           sentences did not fix it either — `text-balance` broke after
           "emailed to" and started the next line with "you.", because it
           optimises for equal widths and a full stop is worth nothing to it.
        */
        subtitle={
          <>
            <span className="block">
              Setting a new password starts with a link emailed to you.
            </span>
            <span className="block">
              A link that has expired or been used lands here too.
            </span>
          </>
        }
      >
        <Link
          href="/auth/forgot"
          className={`${buttonVariants({ size: "lg" })} w-full`}
        >
          Ask for a new link
        </Link>
        {/* The same way out as /auth/forgot offers, in the same words: someone
            who reached this URL by accident wanted to sign in. */}
        <p className="mt-5 text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      /*
         Naming the account is the confirmation that the right link was opened,
         and the one thing that catches someone who clicked an old email.
      */
      subtitle={`Signed in as ${session.email ?? "your account"}. You will not need your old password.`}
    >
      <ResetForm />
    </AuthCard>
  );
}
