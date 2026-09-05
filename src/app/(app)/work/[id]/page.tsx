import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PriorityTag, StatusChip } from "@/components/status-chip";
import { Page, Panel } from "@/components/page";
import { ComplaintPhoto } from "@/components/complaint-photo";
import { StaffActions } from "./action-panel";
import { Timeline } from "@/components/timeline";
import {
  CATEGORY_LABEL,
  formatWhen,
  relName,
  type Status,
  type TimelineEvent,
} from "@/lib/complaints/display";

export const metadata = { title: "Complaint · CampusFix" };

export default async function WorkComplaintPage({
  params,
}: PageProps<"/work/[id]">) {
  const session = await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const { data: complaint } = await supabase
    .from("complaints")
    .select(
      "id, reporter_id, ticket_no, title, description, status, category, priority, location_detail, photo_path, department_id, created_at, assigned_at, reopen_count, locations(name), departments(name), profiles!complaints_reporter_id_fkey(full_name, roll_no, phone)",
    )
    .eq("id", id)
    .maybeSingle();

  /* Two ways to get nothing, one answer. */
  if (!complaint || complaint.department_id !== session.departmentId) {
    notFound();
  }

  const { data: events } = await supabase
    .from("complaint_events")
    .select("id, type, from_status, to_status, note, is_internal, created_at, actor_id")
    .eq("complaint_id", id)
    .order("created_at", { ascending: true });

  /* Names, where the policies allow them. */
  const actorIds = [
    ...new Set((events ?? []).map((e) => e.actor_id).filter(Boolean)),
  ];
  const { data: actors } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds as string[])
    : { data: [] };
  const actorName = new Map(
    (actors ?? []).map((a) => [a.id, a.full_name as string | null]),
  );

  // A signed URL minted per request, valid five minutes. The bucket is private
  // permanently; 0011_staff.sql is what lets this department mint one at all.
  let photoUrl: string | null = null;
  if (complaint.photo_path) {
    const { data } = await supabase.storage
      .from("complaint-photos")
      .createSignedUrl(complaint.photo_path, 300);
    photoUrl = data?.signedUrl ?? null;
  }

  const reporter = complaint.profiles as unknown as
    | { full_name: string | null; roll_no: string | null; phone: string | null }
    | null;
  const status = complaint.status as Status;

  return (
    <Page
      meta={complaint.ticket_no}
      title={complaint.title}
      back={{ href: "/work", label: "Your queue" }}
      actions={<StatusChip status={status} />}
      width="wide"
    >
      {/* Two rows and two columns, so the action panel sits beside the
          details on a desktop and directly under them on a phone — where
          it is the reason the screen was opened. */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem] xl:grid-rows-[min-content_1fr]">
        <div className="space-y-5 xl:col-start-1 xl:row-start-1">
          <Panel title="Details">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              {/* First, and with the phone number, because this is the one
                  field a person about to walk to a room actually needs. */}
              <Fact label="Reported by">
                {complaint.reporter_id === null ? (
                  /* They deleted their account (0015). Said outright rather
                     than left blank, because this is the field someone reads
                     before walking to a room — "no name" would send them
                     looking for a phone number that no longer exists. */
                  <span className="text-muted-foreground">
                    Deleted account
                    <span className="block text-xs">Nobody to contact</span>
                  </span>
                ) : (
                  <>
                    {reporter?.full_name ?? "Unknown"}
                    {reporter?.roll_no || reporter?.phone ? (
                      <span className="tnum block text-xs text-muted-foreground">
                        {[reporter?.roll_no, reporter?.phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </>
                )}
              </Fact>
              <Fact label="Where">
                {relName(complaint.locations)}
                {complaint.location_detail
                  ? ` · ${complaint.location_detail}`
                  : ""}
              </Fact>
              <Fact label="Category">
                {CATEGORY_LABEL[complaint.category] ?? complaint.category}
              </Fact>
              <Fact label="Priority">
                <PriorityTag priority={complaint.priority} />
              </Fact>
              <Fact label="Filed">
                <span className="tnum">{formatWhen(complaint.created_at)}</span>
              </Fact>
              <Fact label="Given to you">
                {complaint.assigned_at ? (
                  <span className="tnum">
                    {formatWhen(complaint.assigned_at)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not yet</span>
                )}
              </Fact>
            </dl>
          </Panel>

          <Panel title="What was reported">
            <p className="text-sm whitespace-pre-wrap">
              {complaint.description}
            </p>

            {photoUrl ? (
              <ComplaintPhoto url={photoUrl} ticketNo={complaint.ticket_no} />
            ) : null}
          </Panel>
        </div>

        <aside className="xl:sticky xl:top-6 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-start">
          <StaffActions
            complaintId={complaint.id}
            ticketNo={complaint.ticket_no}
            status={status}
          />
        </aside>

        <div className="xl:col-start-1 xl:row-start-2 xl:self-start">
          <Panel
            title="Timeline"
            description={
              complaint.reopen_count > 0
                ? `Reopened ${complaint.reopen_count} ${complaint.reopen_count === 1 ? "time" : "times"} — worth reading before starting again`
                : "Oldest first"
            }
          >
            <Timeline
              events={(events ?? []) as TimelineEvent[]}
              viewerId={session.userId}
              departmentName={relName(complaint.departments)}
              actorNames={actorName}
            />
          </Panel>
        </div>
      </div>
    </Page>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
