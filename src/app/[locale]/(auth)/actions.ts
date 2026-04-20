'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

// Helper to extract the current locale from the request headers
async function getLocaleFromHeaders(): Promise<string> {
  const headersList = await headers()
  const referer = headersList.get('referer') || ''
  const match = referer.match(/\/([a-z]{2})\//)
  return match ? match[1] : 'en'
}


export async function signup(formData: FormData) {
  const supabase = await createClient()
  const locale = await getLocaleFromHeaders()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('full_name') as string,
      },
    },
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return redirect(`/${locale}/signup?error=` + encodeURIComponent(error.message))
  }

  revalidatePath('/', 'layout')
  redirect(`/${locale}/login?message=` + encodeURIComponent('Check your email to confirm your account.'))
}

export async function signOut() {
  const supabase = await createClient()
  const locale = await getLocaleFromHeaders()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect(`/${locale}/login`)
}
