/**
 * Buffer GraphQL API Integration Client
 */

const BUFFER_GRAPHQL_ENDPOINT = "https://api.buffer.com/graphql";

export interface BufferProfile {
  id: string;
  service: "linkedin" | "instagram" | "facebook" | string;
  name: string;
  displayName: string;
  type?: string;
}

export interface BufferCreateUpdateOptions {
  targetProfiles: { id: string; service: string }[];
  text: string;
  media?: {
    photo?: string;
    photos?: string[];
    link?: string;
  };
  scheduledAt?: string;
  now?: boolean;
}

function getAccessToken(): string {
  const token = process.env.BUFFER_ACCESS_TOKEN || process.env.NEXT_PUBLIC_BUFFER_ACCESS_TOKEN;
  if (!token) {
    throw new Error("BUFFER_ACCESS_TOKEN is missing in environment variables.");
  }
  return token;
}

async function fetchGraphQL(query: string, variables?: Record<string, any>) {
  const token = getAccessToken();
  const res = await fetch(BUFFER_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Buffer GraphQL HTTP Error (${res.status}): ${errorText}`);
  }

  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    const msg = json.errors.map((e: any) => e.message).join("; ");
    throw new Error(`Buffer GraphQL Error: ${msg}`);
  }

  return json.data;
}

/**
 * Fetch all connected social profiles/channels from Buffer for the user's organization
 */
export async function getBufferProfiles(): Promise<BufferProfile[]> {
  // 1. Get organization ID
  const accountData = await fetchGraphQL(`
    query GetAccountOrgs {
      account {
        id
        organizations {
          id
          name
        }
      }
    }
  `);

  const orgs = accountData?.account?.organizations || [];
  if (orgs.length === 0) {
    throw new Error("No Buffer organizations found for this account.");
  }

  const organizationId = orgs[0].id;

  // 2. Get channels for organization
  const channelsData = await fetchGraphQL(
    `
      query GetChannels($input: ChannelsInput!) {
        channels(input: $input) {
          id
          name
          displayName
          service
          type
        }
      }
    `,
    {
      input: { organizationId },
    }
  );

  const channels = channelsData?.channels || [];
  return channels as BufferProfile[];
}

/**
 * Push updates to connected Buffer profiles using createPost GraphQL mutation
 */
export async function createBufferUpdate(options: BufferCreateUpdateOptions) {
  const results = [];

  for (const profile of options.targetProfiles) {
    const channelId = profile.id;
    const mode = options.now
      ? "shareNow"
      : options.scheduledAt
      ? "customScheduled"
      : "addToQueue";

    const assets = [];
    if (Array.isArray(options.media?.photos) && options.media!.photos.length > 0) {
      for (const photoUrl of options.media!.photos) {
        if (photoUrl) {
          assets.push({
            image: {
              url: photoUrl,
            },
          });
        }
      }
    } else if (options.media?.photo) {
      assets.push({
        image: {
          url: options.media.photo,
        },
      });
    }

    const input: Record<string, any> = {
      channelId,
      text: options.text,
      mode,
      schedulingType: "automatic",
    };

    if (assets.length > 0) {
      input.assets = assets;
    }

    if (options.scheduledAt && mode === "customScheduled") {
      input.dueAt = options.scheduledAt;
    }

    if (profile.service.toLowerCase() === "instagram") {
      input.metadata = {
        instagram: {
          type: assets.length > 1 ? "carousel" : "post",
          shouldShareToFeed: true,
        },
      };
    } else if (profile.service.toLowerCase() === "facebook") {
      input.metadata = { facebook: { type: "post" } };
    } else if (profile.service.toLowerCase() === "linkedin" && options.media?.link && assets.length === 0) {
      // Attach the blog URL as a LinkedIn link preview card (mutually exclusive with image assets)
      input.metadata = { linkedin: { linkAttachment: { url: options.media.link } } };
    }

    const data = await fetchGraphQL(
      `
        mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            __typename
            ... on PostActionSuccess {
              post {
                id
                text
                dueAt
              }
            }
            ... on NotFoundError { message }
            ... on UnauthorizedError { message }
            ... on UnexpectedError { message }
            ... on LimitReachedError { message }
            ... on InvalidInputError { message }
          }
        }
      `,
      { input }
    );

    const payload = data?.createPost;
    if (payload?.__typename !== "PostActionSuccess") {
      const errorMsg = payload?.message || JSON.stringify(payload);
      throw new Error(`Buffer post creation failed for channel ${channelId}: ${errorMsg}`);
    }

    results.push(payload.post);
  }

  return results;
}

export interface BufferPostMetric {
  type: string;
  name: string;
  value: number;
  unit: string;
}

export interface ParsedBufferMetrics {
  views: number;
  impressions: number;
  reach: number;
  reactions: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  follows: number;
  engagementRate: number;
}

export interface BufferPostWithMetrics {
  id: string;
  status: string;
  channelService: string;
  channelId: string;
  dueAt: string | null;
  sentAt: string | null;
  externalLink: string | null;
  text: string;
  metricsUpdatedAt: string | null;
  metrics: BufferPostMetric[];
  parsedMetrics: ParsedBufferMetrics;
}

export function parseBufferMetricsList(metrics: BufferPostMetric[] = []): ParsedBufferMetrics {
  const out: ParsedBufferMetrics = {
    views: 0,
    impressions: 0,
    reach: 0,
    reactions: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks: 0,
    follows: 0,
    engagementRate: 0,
  };

  for (const m of metrics) {
    const val = Number(m?.value || 0);
    if (!Number.isFinite(val)) continue;
    switch (m.type) {
      case "views":
      case "viewers":
        out.views = Math.max(out.views, val);
        break;
      case "impressions":
        out.impressions = Math.max(out.impressions, val);
        break;
      case "reach":
        out.reach = Math.max(out.reach, val);
        break;
      case "reactions":
      case "likes":
        out.reactions = Math.max(out.reactions, val);
        break;
      case "comments":
        out.comments = Math.max(out.comments, val);
        break;
      case "shares":
      case "reposts":
        out.shares = Math.max(out.shares, val);
        break;
      case "saves":
        out.saves = Math.max(out.saves, val);
        break;
      case "clicks":
        out.clicks = Math.max(out.clicks, val);
        break;
      case "follows":
        out.follows = Math.max(out.follows, val);
        break;
      case "engagementRate":
        out.engagementRate = Math.max(out.engagementRate, val);
        break;
    }
  }

  return out;
}

/**
 * Fetch recent posts and live social engagement metrics from Buffer
 */
export async function getBufferPostsWithMetrics(first = 60): Promise<{
  channels: BufferProfile[];
  posts: BufferPostWithMetrics[];
}> {
  const accountData = await fetchGraphQL(`
    query GetAccountOrgs {
      account {
        id
        organizations {
          id
          name
        }
      }
    }
  `);

  const orgs = accountData?.account?.organizations || [];
  if (orgs.length === 0) {
    throw new Error("No Buffer organizations found for this account.");
  }

  const organizationId = orgs[0].id;

  const data = await fetchGraphQL(
    `
      query GetOrgChannelsAndPosts($chInput: ChannelsInput!, $postsInput: PostsInput!, $first: Int) {
        channels(input: $chInput) {
          id
          name
          displayName
          service
          type
        }
        posts(input: $postsInput, first: $first) {
          edges {
            node {
              id
              status
              channelService
              channelId
              dueAt
              sentAt
              externalLink
              text
              metricsUpdatedAt
              metrics {
                type
                name
                value
                unit
              }
            }
          }
        }
      }
    `,
    {
      chInput: { organizationId },
      postsInput: { organizationId },
      first,
    }
  );

  const channels = (data?.channels || []) as BufferProfile[];
  const edges = data?.posts?.edges || [];
  const posts: BufferPostWithMetrics[] = edges
    .map((e: any) => e?.node)
    .filter(Boolean)
    .map((node: any) => ({
      id: node.id,
      status: node.status || "unknown",
      channelService: (node.channelService || "").toLowerCase(),
      channelId: node.channelId || "",
      dueAt: node.dueAt || null,
      sentAt: node.sentAt || null,
      externalLink: node.externalLink || null,
      text: node.text || "",
      metricsUpdatedAt: node.metricsUpdatedAt || null,
      metrics: Array.isArray(node.metrics) ? node.metrics : [],
      parsedMetrics: parseBufferMetricsList(Array.isArray(node.metrics) ? node.metrics : []),
    }));

  return { channels, posts };
}

