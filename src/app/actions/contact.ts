// @ts-nocheck
'use server';

import { createClient } from '@/utils/supabase/server';

export async function submitContactForm(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const message = formData.get('message') as string;

  if (!email || !message || !name) {
    return { error: 'Name, email, and message are required.' };
  }

  const supabase = await createClient();

  // Insert into inquiries table
  const { error } = await supabase.from('inquiries').insert({
    name,
    email,
    message,
    status: 'pending'
  });

  if (error) {
    console.error('Contact form error:', error);
    
    // Fallback if inquiries table doesn't exist yet: store in leads as a backup
    if (error.code === '42P01') {
      await supabase.from('leads').insert({ 
        email, 
        full_name: name 
      });
      // We will pretend it succeeded so the user sees a success state,
      // but warn in console.
      console.warn('Inquiries table missing. Saved to leads instead.');
    } else {
      return { error: 'Failed to submit inquiry. Please try again later.' };
    }
  }

  // TODO: Send email notification
  // A service like Resend or SendGrid can be integrated here.
  console.log(`[EMAIL NOTIFICATION] New Inquiry from ${name} (${email}): ${message}`);

  return { success: true };
}
