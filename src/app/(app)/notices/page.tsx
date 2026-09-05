import { Megaphone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, Page, Panel } from "@/components/page";
import { NoticeList, type Notice } from "@/components/notice-list";

export const metadata = { title: "Notices · CampusFix" };

/** Every live notice, in full. */
export default async function NoticesPage() {
  const session = await requireUser();
  const supabase = await createClient();

  // No date filter, and that is the point: `announcements_select` in
  // 0010_announcements.sql hands back only what is live, so an expired
  // notice cannot reach this screen even if this query asked for it.
  const { data: notices } = await supabase
    .from("announcements")
    .select("id, title, body, location_id, starts_at, ends_at, locations(name)")
    .order("starts_at", { ascending: false });

  const announcements = (notices ?? []) as Notice[];

  return (
    <Page
      title="Notices"
      description={
        session.role === "student"
          ? "Everything the maintenance office has announced that is running now."
          : "Live notices from the maintenance office — the same ones students are shown."
      }
      icon={Megaphone}
    >
      {announcements.length > 0 ? (
        <NoticeList notices={announcements} heading={false} />
      ) : (
        <Panel bodyClassName="">
          <EmptyState
            icon={Megaphone}
            title="Nothing announced right now"
            description="Scheduled outages and campus-wide notices from the office appear here while they are running."
          />
        </Panel>
      )}
    </Page>
  );
}
