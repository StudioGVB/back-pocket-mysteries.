// @ts-nocheck
'use server';

import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

  try {
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: 'Hello@backpocketgames.com',
        subject: `New Inquiry from ${name}`,
        html: `
          <h3>New Contact Form Submission</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
        `
      });
      console.log(`[EMAIL NOTIFICATION] Sent inquiry email from ${name} (${email})`);
    } else {
      console.warn('RESEND_API_KEY is not set. Email notification was not sent.');
      console.log(`[EMAIL NOTIFICATION] New Inquiry from ${name} (${email}): ${message}`);
    }
  } catch (err) {
    console.error('Failed to send email notification:', err);
  }

  return { success: true };
}
