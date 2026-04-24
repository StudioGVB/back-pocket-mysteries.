'use server';

import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function submitEmailLead(email: string, fullName?: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('leads')
    .insert([{ email, full_name: fullName }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique violation
      return { success: false, error: 'This email is already registered.' };
    }
    console.error('Error inserting lead:', error);
    return { success: false, error: 'Failed to submit email. Please try again later.' };
  }

  // Generate a unique discount code, e.g. EARLY20-XXXX
  const uniqueCode = `EARLY20-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  try {
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: 'Hello@backpocketgames.com',
        subject: `New Marketing Lead: ${fullName || email}`,
        html: `
          <h3>New Marketing Lead Subscribed</h3>
          <p><strong>Email:</strong> ${email}</p>
          ${fullName ? `<p><strong>Name:</strong> ${fullName}</p>` : ''}
          <p><strong>Discount Code Generated:</strong> ${uniqueCode}</p>
        `
      });
      console.log(`[EMAIL NOTIFICATION] Sent marketing lead email for ${email}`);
    } else {
      console.warn('RESEND_API_KEY is not set. Marketing lead email notification was not sent.');
    }
  } catch (err) {
    console.error('Failed to send marketing lead email notification:', err);
  }

  return { success: true, uniqueCode };
}
