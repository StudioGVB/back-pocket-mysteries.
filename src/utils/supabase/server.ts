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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    (!cookieStore && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
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

  // Wrap auth.getUser so Server Components and Server Actions resolve the active session
  // without firing multiple redundant /auth/v1/user network requests that can race or fail.
  const origGetUser = client.auth.getUser.bind(client.auth)
  client.auth.getUser = async (jwt?: string) => {
    if (jwt) {
      return origGetUser(jwt)
    }
    try {
      const {
        data: { session },
      } = await client.auth.getSession()
      if (session?.user) {
        return {
          data: { user: session.user },
          error: null,
        } as any
      }
    } catch {
      // fall through
    }

    if (isPermanent && !clientOptions?.allowCookieClear) {
      const persistedUser = readPersistedUserFromCookies(safeGetAllCookies())
      if (persistedUser) {
        return {
          data: { user: persistedUser },
          error: null,
        } as any
      }
    }

    const hasAnyAuthCookie = safeGetAllCookies()
      .some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token') && Boolean(c.value))
    if (!hasAnyAuthCookie) {
      return { data: { user: null }, error: null } as any
    }

    return origGetUser()
  }

  return client
}
