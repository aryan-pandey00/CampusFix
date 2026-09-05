import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PriorityTag, StatusChip } from "@/components/status-chip";
import { Page, Panel } from "@/components/page";
import { ComplaintPhoto } from "@/components/complaint-photo";
import { ConfirmOrReopen } from "./confirm-panel";
import { Timeline } from "@/components/timeline";
import {
  CATEGORY_LABEL,
  STATUS_MEANING,
  formatWhen,
  relName,
  type Status,
  type TimelineEvent,
} from "@/lib/complaints/display";

export const metadata = { title: "Complaint · CampusFix" };

export default async function ComplaintPage({
  params,
}: PageProps<"/complaints/[id]">) {
  const session = await requireUser();
  const { id } = await params;
  const supabase = await createClient();

  const { data: complaint } = await supabase
    .from("complaints")
    .select(
      "id, ticket_no, title, description, status, category, priority, location_detail, photo_path, resolution_note, created_at, reopen_count, reporter_id, locations(name), departments(name)",
    )
    .eq("id", id)
    .maybeSingle();

  // RLS returns nothing for someone else's complaint, so "not yours" and
  // "does not exist" are the same 404 here. That is deliberate: a different
  // message would confirm the complaint exists.
  if (!complaint) notFound();

  const { data: events } = await supabase
    .from("complaint_events")
    .select("id, type, from_status, to_status, note, is_internal, created_at, actor_id")
    .eq("complaint_id", id)
    .order("created_at", { ascending: true });

  // A signed URL, minted per request and valid for five minutes. The bucket is
  // private, so this is the only way the image is ever readable — and RLS
  // decides whether we are allowed to mint one at all.
  let photoUrl: string | null = null;
  if (complaint.photo_path) {
    const { data } = await supabase.storage
      .from("complaint-photos")
      .createSignedUrl(complaint.photo_path, 300);
    photoUrl = data?.signedUrl ?? null;
  }

  const department = relName(complaint.departments);
  const location = relName(complaint.locations);
  const status = complaint.status as Status;

  // An admin can open this page too (RLS lets them read everything), but the
  // confirm-or-reopen decision belongs to the person who reported it.
  const isReporter = complaint.reporter_id === session.userId;
  const categoryLabel =
    CATEGORY_LABEL[complaint.category] ?? complaint.category;
  const sameWords = department !== null && department === categoryLabel;

  return (
    <Page
      meta={complaint.ticket_no}
      title={complaint.title}
      back={{ href: "/my-complaints", label: "My complaints" }}
      actions={<StatusChip status={status} />}
    >
      {/* Where it has got to, in a sentence, before any of the detail. */}
      <p className="mb-5 rounded-[var(--radius)] border border-border bg-card px-4 py-3 text-sm shadow-xs">
        {STATUS_MEANING[status]}
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        {/* Placed explicitly, so DOM order and column order can differ. */}
        <aside className="lg:col-start-2 lg:row-start-1">
          <Panel title="Details">
            <dl className="space-y-3.5 text-sm">
              <Fact label="Where">
                {location}
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
                    <span className="text-muted-foreground">
                      Not assigned yet
                    </span>
                  )}
                </Fact>
              )}
              <Fact label="Filed">
                <span className="tnum">{formatWhen(complaint.created_at)}</span>
              </Fact>
              {complaint.reopen_count > 0 ? (
                <Fact label="Reopened">
                  {complaint.reopen_count}{" "}
                  {complaint.reopen_count === 1 ? "time" : "times"}
                </Fact>
              ) : null}
            </dl>
          </Panel>
        </aside>

        <div className="space-y-5 lg:col-start-1 lg:row-start-1">
          <Panel title="What you reported">
            <p className="text-sm whitespace-pre-wrap">{complaint.description}</p>

            {photoUrl ? (
              <ComplaintPhoto url={photoUrl} ticketNo={complaint.ticket_no} />
            ) : null}
          </Panel>

          {complaint.resolution_note ? (
            <Panel title="What was done">
              <p className="text-sm whitespace-pre-wrap">
                {complaint.resolution_note}
              </p>
            </Panel>
          ) : null}

          {/* After "What was done", never before it: the student should read
              the claim before being asked to judge it. */}
          {status === "resolved" && isReporter ? (
            <ConfirmOrReopen complaintId={complaint.id} />
          ) : null}

          <Panel title="Timeline" description="Everything that has happened, oldest first">
            <Timeline
              events={(events ?? []) as TimelineEvent[]}
              viewerId={session.userId}
              departmentName={department}
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
