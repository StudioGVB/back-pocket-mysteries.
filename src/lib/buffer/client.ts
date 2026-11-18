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
    if (options.media?.photo) {
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
      input.metadata = { instagram: { type: "post", shouldShareToFeed: true } };
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
