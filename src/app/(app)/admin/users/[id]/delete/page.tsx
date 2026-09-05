import Link from "next/link";
import { Check, ShieldAlert, X } from "lucide-react";
import { requireAdmin, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Page, Panel } from "@/components/page";
import { RoleChip } from "@/components/role-chip";
import { buttonVariants } from "@/components/ui/button";
import { formatDay } from "@/lib/complaints/display";
import { DeleteAccountForm } from "./delete-form";

export const metadata = { title: "Delete an account · CampusFix" };

type Person = {
  id: string;
  full_name: string | null;
  roll_no: string | null;
  email: string | null;
  role: string;
  department: string | null;
  is_super_admin: boolean;
  created_at: string;
};

/** A whole page for one destructive click, and that is the point. */
export default async function DeleteUserPage({
  params,
}: PageProps<"/admin/users/[id]/delete">) {
  const session = await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: roster }, { count: filed }] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", id),
  ]);

  const person = ((roster ?? []) as Person[]).find((u) => u.id === id) ?? null;

  /*
     Every refusal says which rule applies rather than bouncing back to the
     list.
  */
  const refused = !session.isSuperAdmin
    ? {
        title: "Only the owner can delete an account",
        body: "Any admin can send someone a reset link, and the owner can change what an account is. Removing one outright is the owner's alone.",
      }
    : id === session.userId
      ? {
          title: "This is your own account",
          body: "Deleting your own account is a different flow, with its own confirmation. It is on your account page.",
          href: { label: "Go to your account", to: "/profile" },
        }
      : !person
        ? {
            title: "That account no longer exists",
            body: "It may already have been deleted, or the link may be stale.",
          }
        : person.is_super_admin
          ? {
              title: "The owner's account cannot be deleted",
              body: "It is the only account that can change roles, and nothing in the app can hand that over — so removing it would leave nobody able to add or remove an admin.",
            }
          : !person.email
            ? {
                // Without an address there is nothing to type, and an empty
                // confirmation box would match an empty expectation — turning
                // the deliberate step into no step at all.
                title: "This account has no email address",
                body: "The confirmation asks you to type the address, so there is nothing here to confirm against. Delete it from the Supabase dashboard instead.",
              }
            : null;

  if (refused) {
    return (
      <Page
        title="Delete an account"
        back={{ href: "/admin/users", label: "Users" }}
        width="narrow"
      >
        <div>
          <Panel>
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div>
                <h2 className="text-sm font-semibold">{refused.title}</h2>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">
                  {refused.body}
                </p>
                <Link
                  href={refused.href?.to ?? "/admin/users"}
                  className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-4`}
                >
                  {refused.href?.label ?? "Back to Users"}
                </Link>
              </div>
            </div>
          </Panel>
        </div>
      </Page>
    );
  }

  // Narrowed by the chain above: `refused` is null only when person and
  // person.email are both present.
  const target = person!;
  const email = target.email!;
  const who = target.full_name ?? email;
  const count = filed ?? 0;

  return (
    /*
       narrow, and no inner cap. This was the default width with the cards at
       `max-w-xl` inside it: 576px of card in a 960px column, so 384px of the
       row was empty and the header band ran on past everything under it.
       page.tsx says exactly this above its own WIDTH table — cap the page, not
       the content — and this screen was the one place ignoring it.
    */
    <Page
      title="Delete an account"
      description="This removes the person. It does not remove what they reported."
      back={{ href: "/admin/users", label: "Users" }}
      width="narrow"
    >
      <div className="space-y-5">
        <Panel bodyClassName="">
          <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p className="font-medium">{who}</p>
              <p className="mt-0.5 text-sm break-all text-muted-foreground">
                {email}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {target.roll_no ? `${target.roll_no} · ` : ""}
                Joined {formatDay(target.created_at)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <RoleChip role={target.role as Role} />
              {target.department ? (
                <span className="text-xs text-muted-foreground">
                  {target.department}
                </span>
              ) : null}
            </div>
          </div>
        </Panel>

        <section className="overflow-hidden rounded-[var(--radius)] border border-destructive/30 bg-card shadow-xs">
          <div className="border-b border-destructive/20 bg-destructive/6 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-destructive">
              What this does
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              This cannot be undone.
            </p>
          </div>

          <div className="space-y-5 px-4 py-4 sm:px-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Consequences
                icon={X}
                tone="text-destructive"
                title="Removed"
                items={[
                  "Their name, roll number and phone number",
                  "Their sign-in — they cannot get back in, and cannot be restored",
                ]}
              />
              <Consequences
                icon={Check}
                tone="text-primary"
                title="Kept"
                items={[
                  count === 0
                    ? "Any complaint they filed, with no name attached"
                    : count === 1
                      ? "The one complaint they filed, with no name attached"
                      : `All ${count} complaints they filed, with no name attached`,
                  "Their photos, every timeline entry, and this deletion in the activity log",
                ]}
              />
            </div>

            {/* The most likely reason to be on this page by mistake, said
                plainly. Demotion strips every power and is reversible; this is
                neither. */}
            <p className="rounded-[var(--radius-md)] border border-border bg-muted/50 px-3 py-2 text-xs text-pretty text-muted-foreground">
              If the point is to take away access rather than to erase them,
              change them to <strong className="font-medium">Student</strong> on
              the Users screen instead. That removes every power, and it can be
              undone.
            </p>

            <DeleteAccountForm userId={target.id} email={email} />
          </div>
        </section>
      </div>
    </Page>
  );
}

function Consequences({
  icon: Icon,
  tone,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <Icon className={`mt-0.5 size-3.5 shrink-0 ${tone}`} />
            <span className="text-pretty">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
