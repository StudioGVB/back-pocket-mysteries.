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
    if (error.code === 'PGRST205') {
      console.warn('Leads table is missing. Faking success to generate code.');
    } else {
      if (error.code === '23505') { // Unique violation
        return { success: false, error: 'This email is already registered.' };
      }
      console.error('Error inserting lead:', error);
      return { success: false, error: 'Failed to submit email. Please try again later.' };
    }
  }

  // Generate a unique discount code, e.g. EARLY20-XXXX
  const uniqueCode = `EARLY20-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  try {
    if (process.env.RESEND_API_KEY) {
      const result = await resend.emails.send({
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: 'Hello@backpocketgames.com',
        subject: `New Marketing Lead: ${fullName || email}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border-top: 4px solid #F02882;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #1a1a1a; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Back Pocket Mysteries</h2>
              <p style="color: #F02882; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">New Marketing Lead</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Email</strong><br/><a href="mailto:${email}" style="color: #F02882; text-decoration: none; font-size: 16px; font-weight: bold;">${email}</a></p>
              
              ${fullName ? `<p style="margin: 0 0 15px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Name</strong><br/><span style="color: #1a1a1a; font-size: 14px;">${fullName}</span></p>` : ''}
              
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 3px solid #1a1a1a;">
                <p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Discount Code Generated</p>
                <p style="margin: 5px 0 0 0; color: #1a1a1a; font-size: 18px; font-family: monospace; font-weight: bold;">${uniqueCode}</p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #888; font-size: 12px; font-style: italic;">Log in to your Admin Dashboard to manage your marketing leads.</p>
            </div>
          </div>
        `
      });
      if (result.error) {
        console.error('[EMAIL NOTIFICATION] Resend API Error:', result.error);
      } else {
        console.log(`[EMAIL NOTIFICATION] Sent marketing lead email for ${email}`);
      }
    } else {
      console.warn('RESEND_API_KEY is not set. Marketing lead email notification was not sent.');
    }
  } catch (err) {
    console.error('Failed to send marketing lead email notification:', err);
  }

  return { success: true, uniqueCode };
}
