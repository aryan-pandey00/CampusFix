import { AuthForm } from "@/components/auth-form";
import { AuthCard } from "@/components/auth-card";
import { signIn } from "@/app/auth/actions";

export const metadata = { title: "Sign in · CampusFix" };

/* Where a deleted account lands, and the only confirmation it gets. */
const NOTICE: Record<string, string> = {
  deleted:
    "Your account has been deleted. You can sign up again with the same address whenever you like.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = sp.next;
  const key = Array.isArray(sp.left) ? sp.left[0] : sp.left;
  const notice = key ? NOTICE[key] : undefined;

  return (
    <AuthCard
      title="Sign in"
      subtitle="Sign in to file a complaint, or check on one."
    >
      {notice ? (
        <p
          role="status"
          className="mb-4 rounded-[var(--radius-md)] border border-border bg-muted px-3 py-2 text-sm text-pretty"
        >
          {notice}
        </p>
      ) : null}
      <AuthForm
        mode="signin"
        action={signIn}
        next={typeof next === "string" ? next : undefined}
      />
    </AuthCard>
  );
}
