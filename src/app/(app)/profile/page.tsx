import Link from "next/link";
import { CircleUser, IdCard, KeyRound, Lock, UserPen } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Initial } from "@/components/initial";
import { Page, Panel } from "@/components/page";
import { RoleChip } from "@/components/role-chip";
import { formatDay } from "@/lib/complaints/display";
import { DeletePanel } from "./delete-panel";
import { PasswordForm } from "./password-form";
import { DetailsForm } from "./details-form";

export const metadata = { title: "Your account · CampusFix" };

/** Your account. */
export default async function ProfilePage() {
  const session = await requireUser();
  const supabase = await createClient();

  const [{ data: profile }, { count: filed }] = await Promise.all([
    supabase
      .from("profiles")
      .select("roll_no, phone, created_at")
      .eq("id", session.userId)
      .single(),
    supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", session.userId),
  ]);

  const filedCount = filed ?? 0;

  return (
    <Page
      title="Your account"
      description="Your details, your password, and how to leave."
      icon={CircleUser}
      width="narrow"
    >
      <div className="space-y-5">
        {/* One band and a two-cell strip, where this was four stacked rows. */}
        <Panel
          title="Who you are"
          icon={IdCard}
          bodyClassName=""
          footer="You sign in with this address, and a password reset can only be sent to it — so it cannot be changed."
        >
          <div className="flex items-center gap-3.5 px-4 py-4 sm:px-5">
            <Initial
              name={session.fullName}
              email={session.email}
              size="lg"
              className="bg-secondary text-secondary-foreground"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <p className="text-[0.9375rem] font-medium tracking-[-0.01em]">
                  {session.fullName ?? "No name yet"}
                </p>
                <RoleChip
                  role={session.role}
                  isSuperAdmin={session.isSuperAdmin}
                />
              </div>
              {/* A department member is their department first. It reads
                  before the email for the same reason the nav prints it in
                  place of the word "staff". */}
              <p className="mt-0.5 text-sm break-words text-muted-foreground">
                {session.departmentName ? `${session.departmentName} · ` : ""}
                {session.email ?? "—"}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 divide-x divide-border border-t border-border">
            <Fact label="Joined">
              {profile?.created_at ? formatDay(profile.created_at) : "—"}
            </Fact>
            <Fact label="Complaints filed">
              {filedCount === 0 ? (
                <span className="text-muted-foreground">None yet</span>
              ) : (
                <Link
                  href="/my-complaints"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {filedCount}
                </Link>
              )}
            </Fact>
          </dl>
        </Panel>

        <Panel
          title="Your details"
          icon={UserPen}
          description="The three things you filled in when you joined."
        >
          <DetailsForm
            fullName={session.fullName ?? ""}
            rollNo={profile?.roll_no ?? ""}
            phone={profile?.phone ?? ""}
          />
        </Panel>

        <Panel
          title="Password"
          icon={KeyRound}
          description="A signed-in browser is not proof of who is holding it."
        >
          <PasswordForm />
        </Panel>

        {session.isSuperAdmin ? (
          /* The owner is refused by delete_own_account() itself, not only
             here. Saying why rather than showing a dead button: a control
             that looks available and then fails is the version of this that
             wastes someone's time. */
          <Panel title="This account cannot be deleted" icon={Lock}>
            <p className="max-w-prose text-sm text-pretty text-muted-foreground">
              It is the only account that can change anyone&rsquo;s role, and
              the app has no way to hand that over &mdash; so deleting it would
              leave nobody able to add or remove an admin.
            </p>
          </Panel>
        ) : (
          <DeletePanel filedCount={filedCount} />
        )}
      </div>
    </Page>
  );
}

/** One cell of the strip: label above, value below. */
function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3 sm:px-5">
      <dt className="text-[10px] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
