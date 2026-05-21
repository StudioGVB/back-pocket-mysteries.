import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function createClient(isPermanentParam?: boolean) {
  const cookieStore = await cookies()
  const isPermanent = isPermanentParam !== undefined 
    ? isPermanentParam 
    : cookieStore.get('sb-keep-logged-in')?.value === 'true';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase environment variables are missing. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file and restart your development server.'
    );
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
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
