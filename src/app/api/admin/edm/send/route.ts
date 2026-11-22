import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";
import { executeStoreOperation, loadMarketingStore, saveMarketingStore } from "@/lib/marketing-store";
import { getUnifiedNewsletterDirectoryAction } from "@/app/actions/marketing";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campaignId, mode = "test", testEmail } = body as {
      campaignId: string;
      mode?: "test" | "production";
      testEmail?: string;
    };

    if (!campaignId) {
      return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is missing in environment variables." },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const store = await loadMarketingStore();

    // Load campaign from Supabase or fallback store
    let campaign: any = null;
    const { data: dbCampaign, error: dbErr } = await (supabase as any)
      .from("edm_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (!dbErr && dbCampaign) {
      campaign = dbCampaign;
    } else {
      campaign = store.edm_campaigns.find((c) => c.id === campaignId) || null;
    }

    if (!campaign) {
      return NextResponse.json({ error: "EDM campaign not found" }, { status: 404 });
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
        return NextResponse.json(
          { error: "Please provide a valid test email address." },
          { status: 400 }
        );
      }

      const personalizedHtml = baseHtml.replace(/\{\{\s*first_name\s*\}\}/gi, "Detective");
      const { data: sendRes, error: sendErr } = await resend.emails.send({
        from: fromAddress,
        to: [testEmail.trim()],
        subject: `[TEST] ${campaign.subject}`,
        html: personalizedHtml,
      });

      if (sendErr) {
        throw new Error(sendErr.message || "Resend failed to send test email");
      }

      return NextResponse.json({
        success: true,
        id: sendRes?.id,
        message: `Test email sent to ${testEmail}!`,
      });
    }

    // 2. PRODUCTION SEND MODE (Send to all Newsletter Leads + Registered Customers, deduplicated)
    const { combinedActiveEmails: activeLeads } = await getUnifiedNewsletterDirectoryAction();

    if (activeLeads.length === 0) {
      return NextResponse.json(
        { error: "No subscribed marketing leads or customers found to send this campaign to." },
        { status: 400 }
      );
    }

    let deliveredCount = 0;
    let failedCount = 0;
    const nowIso = new Date().toISOString();

    for (const lead of activeLeads) {
      const firstName = lead.full_name
        ? lead.full_name.trim().split(/\s+/)[0]
        : "Detective";
      const personalizedHtml = baseHtml.replace(/\{\{\s*first_name\s*\}\}/gi, firstName);

      try {
        const { error: sendErr } = await resend.emails.send({
          from: fromAddress,
          to: [lead.email],
          subject: campaign.subject,
          html: personalizedHtml,
        });

        if (sendErr) {
          failedCount++;
        } else {
          deliveredCount++;
          // Record delivered event
          await (supabase as any)
            .from("edm_events")
            .insert({
              campaign_id: campaignId,
              recipient_email: lead.email,
              status: "delivered",
              created_at: nowIso,
            })
            .catch(() => {});
          store.edm_events.push({
            id: crypto.randomUUID(),
            campaign_id: campaignId,
            recipient_email: lead.email,
            status: "delivered",
            created_at: nowIso,
          });
        }
      } catch {
        failedCount++;
      }
    }

    // Update campaign status to 'sent'
    const updatePayload = {
      status: "sent",
      sent_at: nowIso,
      delivered_count: deliveredCount,
      failed_count: failedCount,
      updated_at: nowIso,
    };

    const { error: updErr } = await (supabase as any)
      .from("edm_campaigns")
      .update(updatePayload)
      .eq("id", campaignId);

    if (updErr) {
      await executeStoreOperation({
        table: "edm_campaigns",
        action: "update",
        filters: [{ type: "eq", column: "id", value: campaignId }],
        values: updatePayload,
      });
    } else {
      await saveMarketingStore(store);
    }

    return NextResponse.json({
      success: true,
      deliveredCount,
      failedCount,
      message: `Sent campaign to ${deliveredCount} subscriber(s)!`,
    });
  } catch (error: any) {
    console.error("[EDM Send API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send EDM campaign" },
      { status: 500 }
    );
  }
}
