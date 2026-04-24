import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function createClient(isPermanentParam?: boolean) {
  const cookieStore = await cookies()
  const isPermanent = isPermanentParam !== undefined 
    ? isPermanentParam 
    : cookieStore.get('sb-keep-logged-in')?.value === 'true';

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = { ...options };
              if (!isPermanent) {
                delete cookieOptions.maxAge;
                delete cookieOptions.expires;
              } else {
                cookieOptions.maxAge = 60 * 60 * 24 * 30; // 30 days
              }
              cookieStore.set(name, value, cookieOptions)
            })
          } catch {}
        },
      },
    }
  )
}
