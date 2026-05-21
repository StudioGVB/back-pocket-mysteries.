'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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
        country: formData.get('country') as string,
        how_found_us: formData.get('how_found_us') as string,
      },
    },
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return redirect(`/${locale}/signup?error=` + encodeURIComponent(error.message))
  }

  // Send Admin Notification Email
  try {
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: 'Hello@backpocketgames.com',
        subject: `New User Signed Up: ${data.options.data.full_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border-top: 4px solid #F02882;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #1a1a1a; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Back Pocket Mysteries</h2>
              <p style="color: #F02882; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">New Account Created</p>
            </div>
            <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Name</strong><br/><span style="color: #1a1a1a; font-size: 16px; font-weight: bold;">${data.options.data.full_name}</span></p>
              <p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Email</strong><br/><span style="color: #1a1a1a; font-size: 16px; font-weight: bold;">${data.email}</span></p>
              ${data.options.data.country ? `<p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Country</strong><br/><span style="color: #1a1a1a; font-size: 16px; font-weight: bold;">${data.options.data.country}</span></p>` : ''}
              ${data.options.data.how_found_us ? `<p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">How they found us</strong><br/><span style="color: #1a1a1a; font-size: 16px; font-weight: bold;">${data.options.data.how_found_us}</span></p>` : ''}
            </div>
          </div>
        `
      });
      console.log(`[EMAIL NOTIFICATION] Sent new account notification for ${data.email}`);
    }
  } catch (err) {
    console.error('Failed to send new account email notification:', err);
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
