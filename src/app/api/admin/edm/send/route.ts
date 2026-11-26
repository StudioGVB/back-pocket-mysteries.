import crypto from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/admin-auth";
import { loadMarketingStore, saveMarketingStore } from "@/lib/marketing-store";
import { getUnifiedNewsletterDirectoryAction } from "@/app/actions/marketing";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

export async function dispatchEdmCampaign(params: {
  campaignId: string;
  mode?: "test" | "production";
  testEmail?: string;
}): Promise<{
  status: number;
  body: Record<string, any>;
}> {
  const { campaignId, mode = "test", testEmail } = params;

  if (!campaignId) {
    return { status: 400, body: { error: "Missing campaignId" } };
  }

  if (!process.env.RESEND_API_KEY) {
    return {
      status: 500,
      body: { error: "RESEND_API_KEY is missing in environment variables." },
    };
  }

  const supabase = await createClient();
  const store = await loadMarketingStore();

  // Load campaign from Supabase or fallback store
  let campaign: any = store.edm_campaigns.find((c) => c.id === campaignId) || null;
  try {
    const { data: dbCampaign, error: dbErr } = await (supabase as any)
      .from("edm_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (!dbErr && dbCampaign) {
      campaign = { ...(campaign || {}), ...dbCampaign };
    }
  } catch {
    // use fallback store campaign
  }

  if (!campaign) {
    return { status: 404, body: { error: "EDM campaign not found" } };
  }

  const rawFromEmail = String(campaign.from_email || "hello@backpocketgames.com").replace(
    /@backpocketmysteries\.com$/i,
    "@backpocketgames.com"
  );
  const fromAddress = `${campaign.from_name || "Back Pocket Mysteries"} <${rawFromEmail}>`;
  const baseHtml = String(campaign.html_content || "");

  // 1. TEST SEND MODE
  if (mode === "test") {
    if (!testEmail || !testEmail.includes("@")) {
      return {
        status: 400,
        body: { error: "Please provide a valid test email address." },
      };
    }

    const personalizedHtml = baseHtml.replace(/\{\{\s*first_name\s*\}\}/gi, "Detective");
    const plainEdmText = personalizedHtml
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h1|h2|h3|tr|li)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const { data: sendRes, error: sendErr } = await resend.emails.send({
      from: fromAddress,
      to: [testEmail.trim()],
      replyTo: rawFromEmail,
      subject: `[TEST] ${campaign.subject}`,
      html: personalizedHtml,
      text: plainEdmText,
      headers: {
        "List-Unsubscribe": `<mailto:${rawFromEmail}?subject=unsubscribe>`,
      },
    });

    if (sendErr) {
      throw new Error(sendErr.message || "Resend failed to send test email");
    }

    return {
      status: 200,
      body: {
        success: true,
        id: sendRes?.id,
        message: `Test email sent to ${testEmail}!`,
      },
    };
  }

  // Prevent accidental duplicate full-list blast if campaign is already marked 'sent' or currently 'sending'
  if (campaign.status === "sent" || campaign.status === "sending") {
    return {
      status: 200,
      body: {
        success: true,
        alreadySent: true,
        deliveredCount: campaign.delivered_count || 0,
        failedCount: campaign.failed_count || 0,
        message: `Campaign "${campaign.subject}" was already sent (skipping duplicate dispatch).`,
      },
    };
  }

  // 2. PRODUCTION SEND MODE (Send to all Newsletter Leads + Registered Customers, strictly deduplicated)
  const { combinedActiveEmails: activeLeads } = await getUnifiedNewsletterDirectoryAction();

  if (activeLeads.length === 0) {
    return {
      status: 400,
      body: {
        error: "No subscribed marketing leads or customers found to send this campaign to.",
      },
    };
  }

  // Build set of emails that already received this specific campaignId (idempotency guard)
  const alreadyDeliveredForCampaign = new Set<string>();
  for (const ev of store.edm_events || []) {
    if (
      ev?.campaign_id === campaignId &&
      ev?.status === "delivered" &&
      typeof ev?.recipient_email === "string"
    ) {
      alreadyDeliveredForCampaign.add(ev.recipient_email.toLowerCase().trim());
    }
  }
  try {
    const { data: dbEvents } = await (supabase as any)
      .from("edm_events")
      .select("recipient_email, status")
      .eq("campaign_id", campaignId);
    for (const ev of dbEvents || []) {
      if (ev?.status === "delivered" && typeof ev?.recipient_email === "string") {
        alreadyDeliveredForCampaign.add(ev.recipient_email.toLowerCase().trim());
      }
    }
  } catch {
    // ignore if edm_events table is not in schema
  }

  // Lock campaign as 'sending' before starting the loop
  const lockIso = new Date().toISOString();
  store.edm_campaigns = store.edm_campaigns.map((c) =>
    c.id === campaignId ? { ...c, status: "sending", updated_at: lockIso } : c
  );
  await saveMarketingStore(store);

  let deliveredCount = alreadyDeliveredForCampaign.size;
  let failedCount = 0;
  let skippedDuplicateCount = 0;
  const nowIso = new Date().toISOString();
  const seenEmailsInRun = new Set<string>();

  for (const lead of activeLeads) {
    const cleanEmail = (lead.email || "").toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes("@")) continue;

    // Layer 1: Cross-list deduplication within this run (if on both VIP leads & customer profiles)
    if (seenEmailsInRun.has(cleanEmail)) {
      skippedDuplicateCount++;
      continue;
    }
    seenEmailsInRun.add(cleanEmail);

    // Layer 2: Campaign-level idempotency (skip if already delivered for this campaignId)
    if (alreadyDeliveredForCampaign.has(cleanEmail)) {
      skippedDuplicateCount++;
      continue;
    }

    const firstName = lead.full_name
      ? lead.full_name.trim().split(/\s+/)[0]
      : "Detective";
    const personalizedHtml = baseHtml.replace(/\{\{\s*first_name\s*\}\}/gi, firstName);
    const plainLeadText = personalizedHtml
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h1|h2|h3|tr|li)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    try {
      // Layer 3: Resend Idempotency-Key per (campaignId + recipient email)
      const { error: sendErr } = await resend.emails.send(
        {
          from: fromAddress,
          to: [cleanEmail],
          replyTo: rawFromEmail,
          subject: campaign.subject,
          html: personalizedHtml,
          text: plainLeadText,
          headers: {
            "List-Unsubscribe": `<mailto:${rawFromEmail}?subject=unsubscribe>`,
            "X-Entity-Ref-ID": `${campaignId}:${cleanEmail}`,
          },
        },
        {
          idempotencyKey: `edm-${campaignId}-${cleanEmail}`,
        }
      );

      if (sendErr) {
        failedCount++;
      } else {
        deliveredCount++;
        alreadyDeliveredForCampaign.add(cleanEmail);
        try {
          await (supabase as any).from("edm_events").insert({
            campaign_id: campaignId,
            recipient_email: cleanEmail,
            status: "delivered",
            created_at: nowIso,
          });
        } catch {
          // ignore if edm_events table is missing
        }
        store.edm_events.push({
          id: crypto.randomUUID(),
          campaign_id: campaignId,
          recipient_email: cleanEmail,
          status: "delivered",
          created_at: nowIso,
        });
      }
    } catch {
      failedCount++;
    }
  }

  // Update campaign status to 'sent' in BOTH Supabase table and versioned Marketing Store
  const updatePayload = {
    status: "sent",
    sent_at: nowIso,
    delivered_count: deliveredCount,
    failed_count: failedCount,
    updated_at: nowIso,
  };

  try {
    await (supabase as any)
      .from("edm_campaigns")
      .update(updatePayload)
      .eq("id", campaignId);
  } catch {
    // non-fatal
  }

  const existsInStore = store.edm_campaigns.some((c) => c.id === campaignId);
  if (existsInStore) {
    store.edm_campaigns = store.edm_campaigns.map((c) =>
      c.id === campaignId ? { ...c, ...updatePayload } : c
    );
  } else {
    store.edm_campaigns.push({ ...campaign, ...updatePayload });
  }
  await saveMarketingStore(store);

  return {
    status: 200,
    body: {
      success: true,
      deliveredCount,
      failedCount,
      skippedDuplicateCount,
      message: `Sent campaign to ${deliveredCount} unique subscriber(s)!`,
    },
  };
}

export async function POST(request: Request) {
  try {
    const cronHeader =
      request.headers.get("x-cron-secret") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const validCron = Boolean(process.env.CRON_SECRET && cronHeader === process.env.CRON_SECRET);
    if (!validCron) {
      await requireAdmin();
    }

    const body = await request.json();
    const result = await dispatchEdmCampaign(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: any) {
    console.error("[EDM Send API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send EDM campaign" },
      { status: 500 }
    );
  }
}

