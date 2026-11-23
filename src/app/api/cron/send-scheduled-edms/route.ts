import { NextResponse } from "next/server";
import { loadMarketingStore } from "@/lib/marketing-store";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/admin-auth";

/**
 * Cron endpoint (/api/cron/send-scheduled-edms) that checks for any EDM campaign
 * with status === 'scheduled' and scheduled_at <= now(), and dispatches it via /api/admin/edm/send.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const validCron = Boolean(process.env.CRON_SECRET && authHeader === process.env.CRON_SECRET);
    if (!validCron) {
      await requireAdmin();
    }

    const nowIso = new Date().toISOString();
    const supabase = await createClient();
    const store = await loadMarketingStore();

    let dueCampaigns: any[] = [];
    const { data: dbDue, error } = await (supabase as any)
      .from("edm_campaigns")
      .select("id, subject, scheduled_at")
      .eq("status", "scheduled")
      .lte("scheduled_at", nowIso);

    if (!error && Array.isArray(dbDue)) {
      dueCampaigns = dbDue;
    } else {
      dueCampaigns = store.edm_campaigns.filter(
        (c) => c.status === "scheduled" && c.scheduled_at && c.scheduled_at <= nowIso
      );
    }

    const origin = new URL(request.url).origin;
    const results = [];

    for (const c of dueCampaigns) {
      const res = await fetch(`${origin}/api/admin/edm/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CRON_SECRET ? { "x-cron-secret": process.env.CRON_SECRET } : {}),
          ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
        },
        body: JSON.stringify({ campaignId: c.id, mode: "production" }),
      });
      const json = await res.json();
      results.push({ id: c.id, subject: c.subject, ...json });
    }

    return NextResponse.json({
      checkedAt: nowIso,
      dueCount: dueCampaigns.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Cron execution failed" },
      { status: 500 }
    );
  }
}
