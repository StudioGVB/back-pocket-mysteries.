import { NextResponse } from "next/server";
import { requireAdmin } from "@/utils/admin-auth";
import { getBufferPostsWithMetrics, BufferPostWithMetrics } from "@/lib/buffer/client";

export interface PlatformAnalyticsSummary {
  sentCount: number;
  scheduledCount: number;
  totalViews: number;
  totalReach: number;
  totalReactions: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalClicks: number;
  totalFollows: number;
  avgEngagementRate: number;
}

function summarizePosts(posts: BufferPostWithMetrics[]): PlatformAnalyticsSummary {
  const sentPosts = posts.filter((p) => p.status === "sent");
  const scheduledPosts = posts.filter(
    (p) => p.status === "scheduled" || p.status === "buffer" || p.status === "queued"
  );

  let totalViews = 0;
  let totalReach = 0;
  let totalReactions = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalSaves = 0;
  let totalClicks = 0;
  let totalFollows = 0;
  let engRateSum = 0;
  let engRateCount = 0;

  for (const p of sentPosts) {
    const m = p.parsedMetrics;
    totalViews += m.views > 0 ? m.views : m.impressions;
    totalReach += m.reach;
    totalReactions += m.reactions;
    totalComments += m.comments;
    totalShares += m.shares;
    totalSaves += m.saves;
    totalClicks += m.clicks;
    totalFollows += m.follows;
    if (m.engagementRate > 0) {
      engRateSum += m.engagementRate;
      engRateCount += 1;
    }
  }

  return {
    sentCount: sentPosts.length,
    scheduledCount: scheduledPosts.length,
    totalViews,
    totalReach,
    totalReactions,
    totalComments,
    totalShares,
    totalSaves,
    totalClicks,
    totalFollows,
    avgEngagementRate:
      engRateCount > 0 ? Number((engRateSum / engRateCount).toFixed(2)) : 0,
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const platform = (searchParams.get("platform") || "all").toLowerCase();

    const { channels, posts } = await getBufferPostsWithMetrics(60);

    const igPosts = posts.filter((p) => p.channelService === "instagram");
    const fbPosts = posts.filter((p) => p.channelService === "facebook");
    const liPosts = posts.filter((p) => p.channelService === "linkedin");
    const igFbPosts = posts.filter(
      (p) => p.channelService === "instagram" || p.channelService === "facebook"
    );

    const filteredPosts =
      platform === "instagram_facebook"
        ? igFbPosts
        : platform === "linkedin"
        ? liPosts
        : platform === "instagram"
        ? igPosts
        : platform === "facebook"
        ? fbPosts
        : posts;

    return NextResponse.json({
      success: true,
      channels,
      posts: filteredPosts,
      summaries: {
        all: summarizePosts(posts),
        instagram_facebook: summarizePosts(igFbPosts),
        instagram: summarizePosts(igPosts),
        facebook: summarizePosts(fbPosts),
        linkedin: summarizePosts(liPosts),
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Buffer Analytics API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch Buffer analytics",
      },
      { status: 500 }
    );
  }
}
