import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Complaint filed · CampusFix" };

export default async function FiledPage({
  searchParams,
}: PageProps<"/report/filed">) {
  await requireUser();
  const { ticket, id } = await searchParams;
  const ticketNo = typeof ticket === "string" ? ticket : null;
  const complaintId = typeof id === "string" ? id : null;

  // Landing here without a ticket means someone typed the URL.
  if (!ticketNo) redirect("/report");

  return (
    <div className="mx-auto w-full max-w-md px-5 py-12 lg:py-20">
      <div className="rounded-[var(--radius)] border border-border bg-card px-6 py-8 text-center shadow-xs">
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
          <Check className="size-5" />
        </span>

        <p className="mt-5 text-sm text-muted-foreground">
          Your complaint is filed
        </p>

        {/* The ticket number is the one thing to take away from this screen, so
            it is the largest thing on it. */}
        <p className="mt-2 font-mono text-[2.5rem] leading-none font-medium tracking-tight">
          {ticketNo}
        </p>

        <p className="mx-auto mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
          Quote this number if you need to ask about it. Every step of what
          happens next shows up on its timeline.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          {complaintId ? (
            <Link href={`/complaints/${complaintId}`} className={buttonVariants()}>
              Track it
            </Link>
          ) : null}
          <Link
            href="/report"
            className={buttonVariants({ variant: "outline" })}
          >
            Report another
          </Link>
        </div>
      </div>
    </div>
  );
}
