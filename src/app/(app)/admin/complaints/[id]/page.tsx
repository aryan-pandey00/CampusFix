import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PriorityTag, StatusChip } from "@/components/status-chip";
import { Page, Panel } from "@/components/page";
import { ComplaintPhoto } from "@/components/complaint-photo";
import { AdminActions } from "./action-panel";
import { Timeline } from "@/components/timeline";
import {
  CATEGORY_LABEL,
  formatWhen,
  relName,
  type Status,
  type TimelineEvent,
} from "@/lib/complaints/display";

export const metadata = { title: "Complaint · CampusFix" };

export default async function AdminComplaintPage({
  params,
}: PageProps<"/admin/complaints/[id]">) {
  const session = await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: complaint } = await supabase
    .from("complaints")
    .select(
      "id, reporter_id, ticket_no, title, description, status, category, priority, location_detail, photo_path, resolution_note, department_id, created_at, assigned_at, resolved_at, closed_at, reopen_count, locations(name), departments(name), profiles!complaints_reporter_id_fkey(full_name, roll_no, phone)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!complaint) notFound();

  const { data: events } = await supabase
    .from("complaint_events")
    .select("id, type, from_status, to_status, note, is_internal, created_at, actor_id")
    .eq("complaint_id", id)
    .order("created_at", { ascending: true });

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  // Admins can read every profile, so the timeline names people. A student
  // viewing the same events sees "Admin" — see describeEvent.
  const actorIds = [...new Set((events ?? []).map((e) => e.actor_id).filter(Boolean))];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds as string[])
    : { data: [] };
  const actorName = new Map(
    (actors ?? []).map((a) => [a.id, a.full_name as string | null]),
  );

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
  const department = relName(complaint.departments);
  const status = complaint.status as Status;
  const categoryLabel =
    CATEGORY_LABEL[complaint.category] ?? complaint.category;
  const sameWords = department !== null && department === categoryLabel;

  return (
    <Page
      meta={complaint.ticket_no}
      title={complaint.title}
      back={{ href: "/admin/complaints", label: "Queue" }}
      actions={<StatusChip status={status} />}
      width="wide"
    >
      {/* Two rows and two columns, so the action panel sits beside the
          details on a desktop and directly under them on a phone — where
          it is the reason the screen was opened.

          At xl, not lg: the 336px rail plus the 240px nav leaves the content
          column 349px at 1024, which put the six Details facts into three
          86px columns and wrapped every one of them. */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem] xl:grid-rows-[min-content_1fr]">
        <div className="space-y-5 xl:col-start-1 xl:row-start-1">
          <Panel title="Details">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              {/* A null reporter_id is someone who deleted their account, and
                  the complaint they filed deliberately outlives them (0015). */}
              <Fact label="Reported by">
                {complaint.reporter_id === null ? (
                  <span className="text-muted-foreground">Deleted account</span>
                ) : (
                  <>
                    {reporter?.full_name ?? "Unknown"}
                    {reporter?.roll_no ? (
                      <span className="block text-xs text-muted-foreground tnum">
                        {reporter.roll_no}
                        {reporter.phone ? ` · ${reporter.phone}` : ""}
                      </span>
                    ) : null}
                  </>
                )}
              </Fact>
              <Fact label="Where">
                {relName(complaint.locations)}
                {complaint.location_detail ? ` · ${complaint.location_detail}` : ""}
              </Fact>
              {/*
                 One row when the two are the same words. Three of the seven
                 categories ARE a department name — Carpentry & Furniture,
                 Cleaning & Housekeeping, Building & Infrastructure — and the
                 panel printed them twice, which reads as a copy-paste fault.
                 The list rows were fixed for this; the details panel was not.
              */}
              <Fact label={sameWords ? "Category and department" : "Category"}>
                {categoryLabel}
              </Fact>
              <Fact label="Priority">
                <PriorityTag priority={complaint.priority} />
              </Fact>
              {sameWords ? null : (
                <Fact label="Department">
                  {department ?? (
                    <span className="text-muted-foreground">Not assigned</span>
                  )}
                </Fact>
              )}
              <Fact label="Filed">
                <span className="tnum">{formatWhen(complaint.created_at)}</span>
              </Fact>
            </dl>
          </Panel>

          <Panel title="What was reported">
            <p className="text-sm whitespace-pre-wrap">{complaint.description}</p>

            {photoUrl ? (
              <ComplaintPhoto url={photoUrl} ticketNo={complaint.ticket_no} />
            ) : null}
          </Panel>

          {/* The same title the student reads it under, and the same words as
              the box it was typed into. */}
          {complaint.resolution_note ? (
            <Panel title="What was done">
              <p className="text-sm whitespace-pre-wrap">
                {complaint.resolution_note}
              </p>
            </Panel>
          ) : null}
        </div>

        <aside className="xl:sticky xl:top-6 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-start">
          <AdminActions
            complaintId={complaint.id}
            status={status}
            departmentId={complaint.department_id}
            departments={departments ?? []}
            reporterGone={complaint.reporter_id === null}
          />
        </aside>

        <div className="xl:col-start-1 xl:row-start-2 xl:self-start">
          <Panel
            title="Timeline"
            description={
              complaint.reopen_count > 0
                ? `Reopened ${complaint.reopen_count} ${complaint.reopen_count === 1 ? "time" : "times"}`
                : "Oldest first"
            }
          >
            <Timeline
              events={(events ?? []) as TimelineEvent[]}
              viewerId={session.userId}
              departmentName={department}
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
