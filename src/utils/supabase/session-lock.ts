/**
 * Server-side auth lock & token-refresh deduplication cache.
 *
 * Why this is needed:
 * 1. `@supabase/ssr` sets `lock: lockNoOp` on the server by default. When a page load
 *    triggers `middleware.ts`, layout Server Components, page Server Components, `<Link>`
 *    prefetches, or Playroom polls concurrently right as an access token expires,
 *    multiple server clients attempt to exchange the same single-use `refresh_token` simultaneously.
 * 2. Supabase Auth's Refresh Token Reuse Detection sees the same `refresh_token` used twice,
 *    revokes the session or returns an error on the losing request, and `@supabase/ssr`
 *    emits `SIGNED_OUT` (`maxAge: 0`), logging the user out even when "Keep me logged in" is checked.
 */

export interface CookieEntry {
  name: string;
  value: string;
  options?: Record<string, any>;
}

interface RefreshedCookieRecord {
  updatedAuthCookies: CookieEntry[];
  timestamp: number;
}

const GRACE_WINDOW_MS = 60 * 1000; // 60 seconds grace period for in-flight parallel requests

const globalForAuthLock = globalThis as unknown as {
  __bpmAuthLocks?: Map<string, Promise<any>>;
  __bpmRefreshedCookieCache?: Map<string, RefreshedCookieRecord>;
};

const authLocks =
  globalForAuthLock.__bpmAuthLocks ||
  (globalForAuthLock.__bpmAuthLocks = new Map<string, Promise<any>>());

const refreshedCookieCache =
  globalForAuthLock.__bpmRefreshedCookieCache ||
  (globalForAuthLock.__bpmRefreshedCookieCache = new Map<string, RefreshedCookieRecord>());

/**
 * In-process mutex lock compatible with `@supabase/auth-js` `auth.lock`.
 */
export async function serverProcessLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  const prev = authLocks.get(name) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>(resolve => {
    release = resolve;
  });
  const chain = prev.then(() => current, () => current);
  authLocks.set(name, chain);

  try {
    await prev.catch(() => {});
    return await fn();
  } finally {
    release();
    if (authLocks.get(name) === chain) {
      authLocks.delete(name);
    }
  }
}

function isAuthTokenCookieName(name: string): boolean {
  return name.startsWith('sb-') && name.includes('-auth-token') && !name.endsWith('-code-verifier');
}

function buildAuthCookieSignature(cookies: { name: string; value: string }[]): string {
  return cookies
    .filter(c => isAuthTokenCookieName(c.name) && Boolean(c.value))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => `${c.name}=${c.value}`)
    .join(';');
}

function pruneExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of refreshedCookieCache.entries()) {
    if (now - entry.timestamp > GRACE_WINDOW_MS) {
      refreshedCookieCache.delete(key);
    }
  }
}

/**
 * Returns request cookies with two protections:
 * 1. Strips any corrupted empty-value `sb-*-auth-token*` cookies left over in the browser.
 * 2. If a parallel request just rotated the refresh token for this exact incoming cookie state
 *    within the last 60 seconds, substitutes the newly refreshed auth cookies so we never
 *    send a consumed `refresh_token` to Supabase a second time.
 */
export function getEffectiveAuthCookies(
  rawCookies: { name: string; value: string }[]
): { name: string; value: string }[] {
  pruneExpiredCache();

  // Filter out empty-value auth token chunks that could corrupt chunk reconstruction
  const cleaned = rawCookies.filter(
    c => !(c.name.startsWith('sb-') && c.name.includes('-auth-token') && (!c.value || c.value.trim() === ''))
  );

  const sig = buildAuthCookieSignature(cleaned);
  if (!sig) {
    return cleaned;
  }

  const cached = refreshedCookieCache.get(sig);
  if (!cached) {
    return cleaned;
  }

  // Replace old auth token cookies with the newly refreshed ones
  const nonAuthCookies = cleaned.filter(c => !isAuthTokenCookieName(c.name));
  const activeNewAuthCookies = cached.updatedAuthCookies
    .filter(c => Boolean(c.value) && c.options?.maxAge !== 0)
    .map(c => ({ name: c.name, value: c.value }));

  if (activeNewAuthCookies.length === 0) {
    return cleaned;
  }

  return [...nonAuthCookies, ...activeNewAuthCookies];
}

/**
 * Records a newly refreshed set of auth cookies against the incoming cookie signature
 * so concurrent requests (prefetches, parallel RSCs, background polls) reuse the new session.
 */
export function recordRefreshedAuthCookies(
  incomingRawCookies: { name: string; value: string }[],
  cookiesToSet: CookieEntry[]
): void {
  const hasActiveAuthToken = cookiesToSet.some(
    c => isAuthTokenCookieName(c.name) && Boolean(c.value) && c.options?.maxAge !== 0
  );
  if (!hasActiveAuthToken) {
    return;
  }

  const incomingSig = buildAuthCookieSignature(incomingRawCookies);
  const outgoingSig = buildAuthCookieSignature(
    cookiesToSet.filter(c => Boolean(c.value) && c.options?.maxAge !== 0)
  );

  if (incomingSig && outgoingSig && incomingSig !== outgoingSig) {
    refreshedCookieCache.set(incomingSig, {
      updatedAuthCookies: cookiesToSet,
      timestamp: Date.now(),
    });
  }
}

/**
 * Clears the in-memory refresh cache (called on explicit user sign-out).
 */
export function clearRefreshedAuthCookieCache(): void {
  refreshedCookieCache.clear();
}

/**
 * Fallback decoder for the persisted 30-day `sb-*-auth-token` cookie when "Keep me logged in"
 * is enabled (`sb-keep-logged-in !== 'false'`).
 * If a background token refresh ever fails due to network hiccups or multi-tab rotation,
 * this recovers the user object from the active auth cookie so the user is not kicked to `/login`.
 */
export function readPersistedUserFromCookies(
  rawCookies: { name: string; value: string }[]
): any | null {
  try {
    const keepLoggedIn = rawCookies.find(c => c.name === 'sb-keep-logged-in')?.value;
    if (keepLoggedIn === 'false') {
      return null;
    }

    const effective = getEffectiveAuthCookies(rawCookies);
    const authCookies = effective.filter(c => isAuthTokenCookieName(c.name) && Boolean(c.value));
    if (authCookies.length === 0) {
      return null;
    }

    // Reconstruct unchunked or chunked (.0, .1, ...) cookie value
    const direct = authCookies.find(c => !/\.\d+$/.test(c.name));
    let combined = '';
    if (direct?.value) {
      combined = direct.value;
    } else {
      const sortedChunks = authCookies
        .filter(c => /\.\d+$/.test(c.name))
        .sort((a, b) => {
          const idxA = parseInt(a.name.split('.').pop() || '0', 10);
          const idxB = parseInt(b.name.split('.').pop() || '0', 10);
          return idxA - idxB;
        });
      combined = sortedChunks.map(c => c.value).join('');
    }

    if (!combined) {
      return null;
    }

    try {
      combined = decodeURIComponent(combined);
    } catch {
      // ignore if not URI-encoded
    }

    const base64Prefix = 'base64-';
    const jsonStr = combined.startsWith(base64Prefix)
      ? Buffer.from(combined.slice(base64Prefix.length), 'base64url').toString('utf8')
      : combined;

    const parsed = JSON.parse(jsonStr);
    if (parsed?.user?.id) {
      return parsed.user;
    }

    // Fallback: decode JWT payload from access_token if user object wasn't embedded
    if (typeof parsed?.access_token === 'string') {
      const parts = parsed.access_token.split('.');
      if (parts.length === 3) {
        const jwtPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (jwtPayload?.sub) {
          return {
            id: jwtPayload.sub,
            aud: jwtPayload.aud || 'authenticated',
            role: jwtPayload.role || 'authenticated',
            email: jwtPayload.email || '',
            user_metadata: jwtPayload.user_metadata || {},
            app_metadata: jwtPayload.app_metadata || {},
          };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Computes safe cookie options that:
 * - Always preserve `maxAge: 0` when `@supabase/ssr` is deleting a stale chunk (`!value` or `options.maxAge === 0`).
 * - Persist auth cookies for 30 days whenever `isPermanent` is true.
 */
export function buildSafeCookieOptions(
  value: string,
  options: Record<string, any> | undefined,
  isPermanent: boolean
): Record<string, any> {
  const cookieOptions: Record<string, any> = {
    path: '/',
    sameSite: 'lax',
    ...(options || {}),
  };

  // Never override maxAge: 0 when Supabase is removing an old cookie chunk or code verifier!
  if (!value || options?.maxAge === 0) {
    cookieOptions.maxAge = 0;
    return cookieOptions;
  }

  if (isPermanent) {
    cookieOptions.maxAge = 60 * 60 * 24 * 30; // 30 days
  } else {
    delete cookieOptions.maxAge;
    delete cookieOptions.expires;
  }

  return cookieOptions;
}
