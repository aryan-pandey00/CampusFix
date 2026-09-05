import { createClient } from "@/lib/supabase/server";

/*
   A request that actually reaches Postgres, for an uptime monitor to call.

   Free Supabase projects pause after about a week with no activity, and pinging
   the landing page would not prevent it: an anonymous visit makes no database
   call at all — getSessionProfile() returns null as soon as it sees no cookie,
   and the hero's figures are constants. The monitor would report green for a
   week and the database would pause anyway.

   The query returns no rows, because `locations` is readable by signed-in users
   only and this request carries no session. That is fine and deliberate: what
   keeps the project awake is the round trip, and what this route reports is
   whether the database answered at all — not what it said.
*/
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.from("locations").select("id").limit(1);

  if (error) {
    return Response.json(
      { ok: false, database: error.message },
      { status: 503 },
    );
  }

  return Response.json(
    { ok: true, database: "reachable" },
    // Never cached, or the monitor would be answered by the edge and the
    // database would never hear from it.
    { headers: { "cache-control": "no-store" } },
  );
}
