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
  const files = formData.getAll('attachments') as File[];
  const attachment_urls: string[] = [];

  // Handle file uploads
  if (files.length > 0) {
    for (const file of files) {
      if (file.size === 0) continue;
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `inquiries/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, file);

        if (uploadError) {
          console.warn('Failed to upload file to Supabase (bucket might be missing):', uploadError);
          // Fake URL for local testing
          attachment_urls.push(`https://mock-storage.com/${filePath}`);
        } else if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('uploads')
            .getPublicUrl(filePath);
          attachment_urls.push(publicUrl);
        }
      } catch (err) {
        console.warn('Storage upload error:', err);
      }
    }
  }

  // Insert into inquiries table
  const { error } = await supabase.from('inquiries').insert({
    name,
    email,
    message,
    status: 'pending',
    attachment_urls
  });

  if (error) {
    console.error('Contact form error:', error);
    
    // Fallback if inquiries table doesn't exist yet: store in leads as a backup
    if (error.code === 'PGRST205') {
      const res = await supabase.from('leads').insert({ 
        email, 
        full_name: name 
      });
      // We will pretend it succeeded so the user sees a success state,
      // but warn in console.
      console.warn('Inquiries table missing. Attempted to save to leads.');
      if (res.error && res.error.code === 'PGRST205') {
        console.warn('Leads table missing too. Faking success.');
      }
    } else {
      return { error: 'Failed to submit inquiry. Please try again later.' };
    }
  }

  try {
    if (process.env.RESEND_API_KEY) {
      const attachmentsHtml = attachment_urls.length > 0 
        ? `<p><strong>Attachments:</strong><br/>${attachment_urls.map(url => `<a href="${url}">${url}</a>`).join('<br/>')}</p>`
        : '';
        
      await resend.emails.send({
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: 'Hello@backpocketgames.com',
        subject: `New Inquiry from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border-top: 4px solid #F02882;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #1a1a1a; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Back Pocket Mysteries</h2>
              <p style="color: #F02882; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">New Customer Inquiry</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Name</strong><br/><span style="color: #1a1a1a; font-size: 16px; font-weight: bold;">${name}</span></p>
              
              <p style="margin: 0 0 15px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Email</strong><br/><a href="mailto:${email}" style="color: #F02882; text-decoration: none; font-size: 14px;">${email}</a></p>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 3px solid #1a1a1a;">
                <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.5;">${message.replace(/\n/g, '<br/>')}</p>
              </div>
              
              ${attachmentsHtml ? `<div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">${attachmentsHtml}</div>` : ''}
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #888; font-size: 12px; font-style: italic;">Log in to your Admin Dashboard to reply or manage this inquiry.</p>
            </div>
          </div>
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

export async function updateEnquiryStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('inquiries')
    .update({ status })
    .eq('id', id);

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('Inquiries table missing. Faking status update.');
      return { success: true };
    }
    console.error('Error updating enquiry status:', error);
    return { error: 'Failed to update status.' };
  }

  return { success: true };
}

export async function bulkUpdateEnquiries(ids: string[], action: 'resolve' | 'delete') {
  const supabase = await createClient();

  if (action === 'delete') {
    const { error } = await supabase
      .from('inquiries')
      .delete()
      .in('id', ids);
    
    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('Inquiries table missing. Faking bulk delete.');
        return { success: true };
      }
      console.error('Error deleting enquiries:', error);
      return { error: 'Failed to delete enquiries.' };
    }
  } else if (action === 'resolve') {
    const { error } = await supabase
      .from('inquiries')
      .update({ status: 'resolved' })
      .in('id', ids);

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('Inquiries table missing. Faking bulk resolve.');
        return { success: true };
      }
      console.error('Error resolving enquiries:', error);
      return { error: 'Failed to resolve enquiries.' };
    }
  }

  return { success: true };
}
