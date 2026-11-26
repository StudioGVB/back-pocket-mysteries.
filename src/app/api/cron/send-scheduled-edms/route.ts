import { NextResponse } from "next/server";
import { loadMarketingStore } from "@/lib/marketing-store";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/admin-auth";
import { dispatchEdmCampaign } from "@/app/api/admin/edm/send/route";

/**
 * Cron endpoint (/api/cron/send-scheduled-edms) that checks for any EDM campaign
 * with status === 'scheduled' and scheduled_at <= now(), and dispatches it via dispatchEdmCampaign.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const userAgent = request.headers.get("user-agent") || "";
    const isVercelCron =
      Boolean(process.env.CRON_SECRET && authHeader === process.env.CRON_SECRET) ||
      userAgent.includes("vercel-cron") ||
      request.headers.get("x-vercel-cron") === "1";

    if (!isVercelCron && process.env.CRON_SECRET) {
      await requireAdmin();
    }

    const nowIso = new Date().toISOString();
    const supabase = await createClient();
    const store = await loadMarketingStore();

    // Merge DB campaigns and versioned marketing-store campaigns by ID (latest updated_at wins)
    const mergedById = new Map<string, any>();
    for (const c of store.edm_campaigns || []) {
      if (c?.id) mergedById.set(c.id, c);
    }

    const { data: dbCampaigns, error } = await (supabase as any)
      .from("edm_campaigns")
      .select("id, subject, status, scheduled_at, updated_at");

    if (!error && Array.isArray(dbCampaigns)) {
      for (const dbRow of dbCampaigns) {
        const existing = mergedById.get(dbRow.id);
        if (!existing) {
          mergedById.set(dbRow.id, dbRow);
        } else {
          const storeTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
          const dbTime = new Date(dbRow.updated_at || 0).getTime();
          if (dbTime > storeTime) {
            mergedById.set(dbRow.id, { ...existing, ...dbRow });
          }
        }
      }
    }

    const dueCampaigns = Array.from(mergedById.values()).filter(
      (c) =>
        c.status === "scheduled" &&
        typeof c.scheduled_at === "string" &&
        new Date(c.scheduled_at).getTime() <= Date.now()
    );

    const results = [];

    for (const c of dueCampaigns) {
      try {
        const dispatchResult = await dispatchEdmCampaign({
          campaignId: c.id,
          mode: "production",
        });
        results.push({ id: c.id, subject: c.subject, ...dispatchResult });
      } catch (sendErr: any) {
        results.push({
          id: c.id,
          subject: c.subject,
          error: sendErr?.message || "Failed to dispatch scheduled campaign",
        });
      }
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

