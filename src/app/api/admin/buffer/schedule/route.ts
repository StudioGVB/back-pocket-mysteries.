import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/admin-auth";
import { getBufferProfiles, createBufferUpdate } from "@/lib/buffer/client";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://backpocketmysteries.com";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { postId, platform, scheduledAt, text, mediaUrl, linkUrl } = body;

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    // 1. Fetch Buffer Profiles
    let profiles;
    try {
      profiles = await getBufferProfiles();
    } catch (err: any) {
      return NextResponse.json(
        { error: `Buffer API error: ${err.message}. Please check BUFFER_ACCESS_TOKEN.` },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: "No connected Buffer channels found. Please check your Buffer account." },
        { status: 400 }
      );
    }

    // 2. Target specific platform or all matching channels
    // Buffer service names: 'linkedin', 'instagram', 'facebook'
    let targetProfiles = profiles;
    if (platform && platform !== "all") {
      const normalizedPlatform = platform.toLowerCase();
      targetProfiles = profiles.filter((p) => normalizedPlatform.includes(p.service.toLowerCase()));
    }

    if (targetProfiles.length === 0) {
      // Fallback to all profiles if no specific profile match
      targetProfiles = profiles;
    }

    const profileIds = targetProfiles.map((p) => p.id);

    // 3. Format full image URL if relative path
    let absoluteMediaUrl = mediaUrl;
    if (mediaUrl && mediaUrl.startsWith("/")) {
      absoluteMediaUrl = `${BASE_URL}${mediaUrl}`;
    }

    // 3.5. Ensure scheduledAt is in the future so Buffer never rejects a past dueAt
    let effectiveScheduledAt: string | undefined = scheduledAt || undefined;
    if (effectiveScheduledAt) {
      const parsed = new Date(effectiveScheduledAt);
      const now = new Date();
      const minFutureMs = now.getTime() + 15 * 60_000;
      if (!Number.isNaN(parsed.getTime()) && parsed.getTime() <= minFutureMs) {
        const preferredHours = parsed.getUTCHours() || 9;
        const preferredMinutes = parsed.getUTCMinutes() || 0;
        const rolled = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            preferredHours,
            preferredMinutes,
            0,
            0
          )
        );
        if (rolled.getTime() <= minFutureMs) {
          rolled.setUTCDate(rolled.getUTCDate() + 1);
        }
        effectiveScheduledAt = rolled.toISOString().replace(".000Z", "Z");
      }
    }

    // 4. Send to Buffer API
    const result = await createBufferUpdate({
      targetProfiles: targetProfiles.map((p: any) => ({ id: p.id, service: p.service })),
      text: text || "New update from Back Pocket Mysteries",
      media: {
        photo: absoluteMediaUrl || undefined,
        link: linkUrl || undefined,
      },
      scheduledAt: effectiveScheduledAt,
    });

    // 5. Update local database status in social_posts to 'scheduled'
    const supabase = await createClient();
    const updatePayload: Record<string, any> = {
      status: "scheduled",
      updated_at: new Date().toISOString(),
    };
    if (effectiveScheduledAt) {
      updatePayload.scheduled_at = effectiveScheduledAt;
    }

    const { error: dbErr } = await (supabase as any)
      .from("social_posts")
      .update(updatePayload)
      .eq("id", postId);

    if (dbErr) {
      const { executeStoreOperation } = await import("@/lib/marketing-store");
      await executeStoreOperation({
        table: "social_posts",
        action: "update",
        filters: [{ type: "eq", column: "id", value: postId }],
        values: updatePayload,
      });
    }

    return NextResponse.json({
      success: true,
      bufferResult: result,
      scheduledAt: effectiveScheduledAt,
      targetChannelsCount: profileIds.length,
      message: `Pushed post directly to ${profileIds.length} Buffer channel(s)!`,
    });
  } catch (error: any) {
    console.error("[Buffer Schedule API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to schedule post with Buffer" },
      { status: 500 }
    );
  }
}
