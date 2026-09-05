import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Not found · CampusFix" };

/** Also what a student sees when they open a complaint that is not theirs. */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-xl font-semibold tracking-[-0.015em]">Nothing here</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This page does not exist, or it belongs to someone else.
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to CampusFix
        </Link>
      </div>
    </div>
  );
}
