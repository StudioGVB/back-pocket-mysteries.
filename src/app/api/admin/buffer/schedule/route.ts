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

    // 2. Strictly target ONLY the requested platform's Buffer channels (never fall back to other platforms!)
    // Buffer service names: 'linkedin', 'instagram', 'facebook'
    let targetProfiles = profiles;
    const normalizedPlatform = (platform || "all").toLowerCase();
    const isLinkedInRequest = normalizedPlatform === "linkedin";
    const isIgFbRequest =
      normalizedPlatform === "instagram_facebook" ||
      normalizedPlatform === "instagram" ||
      normalizedPlatform === "facebook";

    if (isLinkedInRequest) {
      targetProfiles = profiles.filter((p) => p.service.toLowerCase() === "linkedin");
    } else if (isIgFbRequest) {
      targetProfiles = profiles.filter((p) => {
        const svc = p.service.toLowerCase();
        return svc === "instagram" || svc === "facebook";
      });
    } else if (normalizedPlatform !== "all") {
      targetProfiles = profiles.filter((p) =>
        normalizedPlatform.includes(p.service.toLowerCase())
      );
    }

    if (targetProfiles.length === 0) {
      return NextResponse.json(
        {
          error: `No connected Buffer channel found for ${
            isLinkedInRequest ? "LinkedIn" : isIgFbRequest ? "Instagram / Facebook" : platform
          }. Please check your connected channels in Buffer.`,
        },
        { status: 400 }
      );
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

    // 4. Send to Buffer API (ONLY to the matched platform's profiles)
    const result = await createBufferUpdate({
      targetProfiles: targetProfiles.map((p: any) => ({ id: p.id, service: p.service })),
      text: text || "New update from Back Pocket Mysteries",
      media: {
        photo: absoluteMediaUrl || undefined,
        link: linkUrl || undefined,
      },
      scheduledAt: effectiveScheduledAt,
    });

    // 5. Update local database status ONLY for this specific platform so LinkedIn & IG/FB stay completely separate!
    const supabase = await createClient();
    const platformKey = isLinkedInRequest
      ? "linkedin"
      : isIgFbRequest
        ? "instagram_facebook"
        : normalizedPlatform;

    const { data: existingPost } = await (supabase as any)
      .from("social_posts")
      .select("id, status, slide_content")
      .eq("id", postId)
      .single();

    const prevSlideContent =
      existingPost?.slide_content && typeof existingPost.slide_content === "object"
        ? existingPost.slide_content
        : {};
    const prevPlatformStatuses =
      prevSlideContent.platform_statuses &&
      typeof prevSlideContent.platform_statuses === "object"
        ? prevSlideContent.platform_statuses
        : {};

    // Preserve the other platform's current status (defaulting to 'draft' if it wasn't explicitly scheduled yet)
    const otherPlatformKey =
      platformKey === "linkedin" ? "instagram_facebook" : "linkedin";
    const otherPlatformStatus =
      prevPlatformStatuses[otherPlatformKey] || "draft";

    const nextPlatformStatuses = {
      ...prevPlatformStatuses,
      [otherPlatformKey]: otherPlatformStatus,
      [platformKey]: "scheduled",
    };

    const nextSlideContent = {
      ...prevSlideContent,
      platform_statuses: nextPlatformStatuses,
    };

    // Only mark the parent row 'scheduled' if BOTH platforms are scheduled; otherwise keep parent status independent per platform_statuses
    const bothScheduled =
      nextPlatformStatuses.linkedin === "scheduled" &&
      nextPlatformStatuses.instagram_facebook === "scheduled";

    const updatePayload: Record<string, any> = {
      status: bothScheduled ? "scheduled" : existingPost?.status || "draft",
      slide_content: nextSlideContent,
      updated_at: new Date().toISOString(),
    };
    if (effectiveScheduledAt) {
      updatePayload.scheduled_at = effectiveScheduledAt;
    }

    const { error: dbErr } = await (supabase as any)
      .from("social_posts")
      .update(updatePayload)
      .eq("id", postId);

    const { executeStoreOperation } = await import("@/lib/marketing-store");
    if (dbErr) {
      await executeStoreOperation({
        table: "social_posts",
        action: "update",
        filters: [{ type: "eq", column: "id", value: postId }],
        values: updatePayload,
      });
    }

    // Also update the platform-specific social_post_captions rows in the local marketing store
    const targetCaptionPlatforms = isLinkedInRequest
      ? ["linkedin"]
      : ["instagram", "facebook", "instagram_facebook"];
    await executeStoreOperation({
      table: "social_post_captions",
      action: "update",
      filters: [
        { type: "eq", column: "post_id", value: postId },
        { type: "in", column: "platform", value: targetCaptionPlatforms },
      ],
      values: { status: "scheduled" },
    });

    return NextResponse.json({
      success: true,
      bufferResult: result,
      scheduledAt: effectiveScheduledAt,
      platformKey,
      platformStatuses: nextPlatformStatuses,
      targetChannelsCount: profileIds.length,
      message: `Pushed ${
        isLinkedInRequest ? "LinkedIn" : "Instagram/Facebook"
      } post to ${profileIds.length} Buffer channel(s)!`,
    });
  } catch (error: any) {
    console.error("[Buffer Schedule API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to schedule post with Buffer" },
      { status: 500 }
    );
  }
}
