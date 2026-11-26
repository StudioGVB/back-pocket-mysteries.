import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import {
  buildSafeCookieOptions,
  clearRefreshedAuthCookieCache,
  getEffectiveAuthCookies,
  readPersistedUserFromCookies,
  recordRefreshedAuthCookies,
  serverProcessLock,
} from './session-lock'

export async function createClient(
  isPermanentParam?: boolean,
  clientOptions?: { allowCookieClear?: boolean }
) {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null
  try {
    cookieStore = await cookies()
  } catch {
    cookieStore = null
  }

  const safeGetAllCookies = () => (cookieStore ? cookieStore.getAll() : [])

  // Default to permanent (30-day) session unless user explicitly set sb-keep-logged-in to 'false'
  const isPermanent =
    isPermanentParam !== undefined
      ? isPermanentParam
      : cookieStore?.get('sb-keep-logged-in')?.value !== 'false'

  const hasAuthCookie = safeGetAllCookies().some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token') && Boolean(c.value)
  )
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    (!hasAuthCookie && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase environment variables are missing. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file and restart your development server.'
    )
  }

  const client = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return getEffectiveAuthCookies(safeGetAllCookies())
      },
      setAll(cookiesToSet) {
        if (!cookieStore) return
        try {
          const isWipingAllCookies =
            cookiesToSet.length > 0 &&
            cookiesToSet.every(({ value, options }) => !value || options?.maxAge === 0)

          if (isWipingAllCookies && !clientOptions?.allowCookieClear) {
            // Prevent transient network hiccups or concurrent refresh races from wiping the user's session
            return
          }

          if (isWipingAllCookies && clientOptions?.allowCookieClear) {
            clearRefreshedAuthCookieCache()
          } else {
            recordRefreshedAuthCookies(safeGetAllCookies(), cookiesToSet)
          }

          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = buildSafeCookieOptions(value, options, isPermanent)
            cookieStore?.set(name, value, cookieOptions)
          })
        } catch {
          // Server Components cannot set cookies directly; middleware handles refreshing
        }
      },
    },
  })

  // Wrap auth.getUser so Server Components and Server Actions cryptographically verify
  // the JWT with Supabase Auth once per token (cached for 60s to prevent concurrent refresh races).
  const origGetUser = client.auth.getUser.bind(client.auth)
  client.auth.getUser = async (jwt?: string) => {
    if (jwt) {
      return origGetUser(jwt)
    }

    const activeCookies = getEffectiveAuthCookies(safeGetAllCookies()).filter(
      (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token') && Boolean(c.value)
    )
    if (activeCookies.length === 0) {
      return { data: { user: null }, error: null } as any
    }

    const cookieKey = activeCookies
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => `${c.name}=${c.value}`)
      .join(';')

    const g = globalThis as unknown as {
      __bpmVerifiedUserCache?: Map<string, { user: any; expiresAt: number }>
    }
    if (!g.__bpmVerifiedUserCache) {
      g.__bpmVerifiedUserCache = new Map()
    }

    const now = Date.now()
    const cached = g.__bpmVerifiedUserCache.get(cookieKey)
    if (cached && cached.expiresAt > now) {
      return { data: { user: cached.user }, error: null } as any
    }

    const verified = await origGetUser()
    if (verified?.data?.user) {
      g.__bpmVerifiedUserCache.set(cookieKey, {
        user: verified.data.user,
        expiresAt: now + 60_000,
      })
      return verified
    }

    return verified
  }

  return client
}
