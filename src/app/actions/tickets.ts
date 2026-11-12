'use server';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { createClient } from '@/utils/supabase/server';
import { isUserAdmin } from '@/utils/admin-auth';
import {
  SUPPORT_EMAIL,
  TicketSeverity,
  TicketStatus,
  TicketCategory,
  TicketSenderRole,
  TicketMessageRecord,
  SupportTicketRecord,
  formatTicketRef,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  CATEGORY_CONFIG,
} from '@/utils/tickets';

const VERIFIED_FALLBACK_FROM = 'Back Pocket Mysteries <support@lancii.com>';

function resolveResendApiKey(): string | null {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 10) {
    return process.env.RESEND_API_KEY.trim();
  }
  try {
    const envPath = path.join(/*turbopackIgnore: true*/ process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/^RESEND_API_KEY=(.+)$/m);
      if (match) {
        const key = match[1].trim().replace(/^"|"$/g, '');
        if (key.length > 10) return key;
      }
    }
  } catch {}
  return null;
}

function buildEmailAttachments(attachmentUrls: string[]): Array<{ filename: string; content: Buffer }> {
  const emailAttachments: Array<{ filename: string; content: Buffer }> = [];
  attachmentUrls.forEach((url, idx) => {
    if (url.startsWith('data:')) {
      const match = url.match(/^data:([^;,]+)(?:;name=([^;]+))?;base64,(.+)$/);
      if (match) {
        const mime = match[1] || 'application/octet-stream';
        const decodedName = match[2] ? decodeURIComponent(match[2]) : '';
        const base64Data = match[3];
        const rawSub = (mime.split('/')[1] || 'bin').split('+')[0].toLowerCase();
        const ext = rawSub === 'jpeg' ? 'jpg' : rawSub === 'plain' ? 'txt' : rawSub;
        const filename = decodedName || `ticket-attachment-${idx + 1}.${ext}`;
        emailAttachments.push({
          filename,
          content: Buffer.from(base64Data, 'base64'),
        });
      }
    }
  });
  return emailAttachments;
}

async function sendEmailWithDomainFallback(params: {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}): Promise<{ sent: boolean; id?: string; error?: string }> {
  const apiKey = resolveResendApiKey();
  if (!apiKey) {
    console.warn('[TICKETS EMAIL] Missing RESEND_API_KEY');
    return { sent: false, error: 'Missing RESEND_API_KEY' };
  }

  const resend = new Resend(apiKey);
  const primaryFrom = `Back Pocket Mysteries <${SUPPORT_EMAIL}>`;

  try {
    // 1. Try sending from Back Pocket Mysteries <hello@backpocketgames.com>
    let res = await resend.emails.send({
      from: primaryFrom,
      to: params.to,
      replyTo: params.replyTo || SUPPORT_EMAIL,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments && params.attachments.length > 0 ? params.attachments : undefined,
    });

    // 2. If backpocketgames.com domain is still pending verification in Resend DNS,
    // automatically fall back to verified sender domain so hello@backpocketgames.com always receives the email
    if (res.error) {
      res = await resend.emails.send({
        from: VERIFIED_FALLBACK_FROM,
        to: params.to,
        replyTo: params.replyTo || SUPPORT_EMAIL,
        subject: params.subject,
        html: params.html,
        attachments:
          params.attachments && params.attachments.length > 0 ? params.attachments : undefined,
      });
    }

    if (res.error) {
      console.error('[TICKETS EMAIL] Resend error:', res.error);
      return { sent: false, error: res.error.message };
    }

    console.log(`[TICKETS EMAIL] Delivered to ${params.to} (ID: ${res.data?.id})`);
    return { sent: true, id: res.data?.id };
  } catch (err: any) {
    console.error('[TICKETS EMAIL] Exception sending email:', err);
    return { sent: false, error: err?.message || String(err) };
  }
}

const BRAND_LOGO_URL = 'https://backpocketmysteries.com/logo-horizontal-white.png';
const SITE_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://backpocketmysteries.com';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildOfficialTicketEmailHtml(params: {
  audience: 'admin' | 'customer';
  headerBadge: string;
  headline: string;
  subheadline: string;
  ticket: SupportTicketRecord;
  featuredMessage: TicketMessageRecord;
  attachmentUrls?: string[];
  isCustomerConfirmation?: boolean;
}): string {
  const {
    audience,
    headline,
    subheadline,
    ticket,
    featuredMessage,
    attachmentUrls = [],
    isCustomerConfirmation = false,
  } = params;

  const ticketRef = formatTicketRef(ticket.ticket_number, ticket.id);
  const sevLabel = SEVERITY_CONFIG[ticket.severity]?.label || ticket.severity;
  const statusLabel = STATUS_CONFIG[ticket.status]?.label || ticket.status;
  const catLabel = CATEGORY_CONFIG[ticket.category]?.label || ticket.category;

  const customerName = escapeHtml(ticket.user_name || 'Customer');
  const customerEmail = escapeHtml(ticket.user_email || '');
  const safeSubject = escapeHtml(ticket.subject);
  const safeMessageHtml = escapeHtml(featuredMessage.message).replace(/\n/g, '<br/>');

  const ctaUrl =
    audience === 'admin'
      ? `${SITE_BASE_URL}/en/admin/tickets`
      : `${SITE_BASE_URL}/en/builder/support`;
  const ctaLabel =
    audience === 'admin' ? 'View & Reply in Admin Dashboard' : 'View Ticket in Support Portal';
  const faqUrl = `${SITE_BASE_URL}/en/faq`;

  const attachmentsHtml =
    attachmentUrls.length > 0
      ? `<p style="margin: 16px 0 0 0; font-size: 13px; color: #555555;">
           <strong>Attachments (${attachmentUrls.length}):</strong>
           ${attachmentUrls
             .map((url, idx) =>
               url.startsWith('http')
                 ? `<a href="${url}" target="_blank" style="color: #F02882; text-decoration: underline; margin-left: 8px;">Attachment #${idx + 1}</a>`
                 : `<span style="margin-left: 8px;">ticket-attachment-${idx + 1} (attached to email)</span>`
             )
             .join('')}
         </p>`
      : '';

  const customerFaqNoteHtml =
    audience === 'customer'
      ? `<p style="color: #444444; font-size: 15px; line-height: 24px; margin: 0 0 24px 0;">
           ${
             isCustomerConfirmation
               ? `We aim to respond to all support tickets within <strong>48 hours</strong>. In the meantime, if you aren't sure about something, please take a look at our <a href="${faqUrl}" target="_blank" style="color: #F02882; font-weight: 600; text-decoration: underline;">FAQs page</a> - most common hosting, PIN, and setup questions are answered there.`
               : `You can reply directly in your Support Portal or check our <a href="${faqUrl}" target="_blank" style="color: #F02882; font-weight: 600; text-decoration: underline;">FAQs page</a> anytime.`
           }
         </p>`
      : '';

  const secondaryFaqButtonHtml =
    audience === 'customer'
      ? `<a href="${faqUrl}" target="_blank" style="display: inline-block; background-color: #111111; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-left: 10px;">
           Browse FAQs
         </a>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          
          <!-- Simple Clean Branded Header -->
          <tr>
            <td align="center" style="background-color: #111111; padding: 28px 40px; border-bottom: 4px solid #F02882;">
              <img src="${BRAND_LOGO_URL}" width="190" alt="Back Pocket Mysteries" style="display: block; margin: 0 auto; border: 0;" />
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 40px;">
              <h1 style="color: #111111; font-size: 22px; font-weight: 700; margin: 0 0 10px 0;">
                ${escapeHtml(headline)}
              </h1>
              <p style="color: #444444; font-size: 15px; line-height: 24px; margin: 0 0 16px 0;">
                ${escapeHtml(subheadline)}
              </p>
              ${customerFaqNoteHtml}

              <!-- Clean Summary Block -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; color: #333333; line-height: 24px;">
                      <tr>
                        <td width="110" style="color: #777777; font-weight: 600;">Ticket:</td>
                        <td><strong>${ticketRef}</strong> - ${safeSubject}</td>
                      </tr>
                      <tr>
                        <td style="color: #777777; font-weight: 600;">Status:</td>
                        <td><strong>${escapeHtml(statusLabel)}</strong> &bull; Priority: ${escapeHtml(sevLabel)}</td>
                      </tr>
                      <tr>
                        <td style="color: #777777; font-weight: 600;">Customer:</td>
                        <td>${customerName} (<a href="mailto:${customerEmail}" style="color: #F02882; text-decoration: none;">${customerEmail}</a>)</td>
                      </tr>
                      <tr>
                        <td style="color: #777777; font-weight: 600;">Category:</td>
                        <td>${escapeHtml(catLabel)}${ticket.mystery_title ? ` &bull; ${escapeHtml(ticket.mystery_title)}` : ''}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Clean Message Block -->
              <div style="background-color: #f5f5f5; border-left: 4px solid #F02882; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0; color: #222222; font-size: 15px; line-height: 24px;">
                  ${safeMessageHtml}
                </p>
                ${attachmentsHtml}
              </div>

              <!-- Clean CTA Buttons -->
              <div style="margin: 28px 0 8px 0;">
                <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #F02882; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
                  ${ctaLabel}
                </a>
                ${secondaryFaqButtonHtml}
              </div>
            </td>
          </tr>

          <!-- Clean Light Footer -->
          <tr>
            <td align="center" style="background-color: #fafafa; border-top: 1px solid #e6ebf1; padding: 20px 40px;">
              <p style="color: #888888; font-size: 12px; line-height: 18px; margin: 0 0 4px 0;">
                &copy; ${new Date().getFullYear()} Back Pocket Mysteries &bull; <a href="mailto:${SUPPORT_EMAIL}" style="color: #F02882; text-decoration: none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="color: #888888; font-size: 12px; line-height: 18px; margin: 0;">
                <a href="${SITE_BASE_URL}" style="color: #F02882; text-decoration: none;">backpocketgames.com</a> &bull; <a href="${faqUrl}" style="color: #F02882; text-decoration: none;">FAQs</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

interface TicketStoreData {
  initialized: boolean;
  nextTicketNumber: number;
  tickets: Record<string, SupportTicketRecord>;
  deletedIds: string[];
}

const STORE_FILENAME = '.tickets-store.json';

function getStorePath(): string {
  const cwdPath = path.join(/*turbopackIgnore: true*/ process.cwd(), STORE_FILENAME);
  try {
    fs.accessSync(process.cwd(), fs.constants.W_OK);
    return cwdPath;
  } catch {
    return path.join('/tmp', STORE_FILENAME);
  }
}

function readLocalStore(): TicketStoreData {
  const filePath = getStorePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      const ticketsMap: Record<string, SupportTicketRecord> = {};
      for (const [k, v] of Object.entries(parsed.tickets || {})) {
        // Ignore legacy demo seed ticket
        if (k === 'seed-ticket-1001') continue;
        ticketsMap[k] = v as SupportTicketRecord;
      }
      return {
        initialized: true,
        nextTicketNumber: Number(parsed.nextTicketNumber) || 1001,
        tickets: ticketsMap,
        deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
      };
    }
  } catch {
    // Ignore corrupted file
  }

  const initial: TicketStoreData = {
    initialized: true,
    nextTicketNumber: 1001,
    tickets: {},
    deletedIds: [],
  };
  writeLocalStore(initial);
  return initial;
}

function writeLocalStore(data: TicketStoreData): void {
  const filePath = getStorePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Non-fatal in read-only environments
  }
}

async function uploadAttachments(supabase: any, files: File[]): Promise<string[]> {
  const urls: string[] = [];
  if (!files || files.length === 0) return urls;

  for (const file of files.slice(0, 5)) {
    if (!file || typeof file.size !== 'number' || file.size === 0) continue;

    const rawName = (file.name || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${rawName}`;
    const storagePath = `tickets/${safeName}`;
    const contentType = file.type || 'application/octet-stream';

    let uploadedUrl: string | null = null;

    // 1. Try dedicated `ticket-attachments` bucket
    if (supabase) {
      try {
        const { data: upData, error: upErr } = await supabase.storage
          .from('ticket-attachments')
          .upload(storagePath, file, { contentType, upsert: false });

        if (!upErr && upData) {
          const { data: pub } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(storagePath);
          if (pub?.publicUrl) uploadedUrl = pub.publicUrl;
        }
      } catch {
        // Fall through
      }

      // 2. Fallback to existing `character-images` public bucket
      if (!uploadedUrl) {
        try {
          const { data: upData, error: upErr } = await supabase.storage
            .from('character-images')
            .upload(storagePath, file, { contentType, upsert: false });

          if (!upErr && upData) {
            const { data: pub } = supabase.storage
              .from('character-images')
              .getPublicUrl(storagePath);
            if (pub?.publicUrl) uploadedUrl = pub.publicUrl;
          }
        } catch {
          // Fall through
        }
      }
    }

    // 3. Fallback to inline base64 data URL (preserving filename & mime type for all file types)
    if (!uploadedUrl) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const encodedName = encodeURIComponent(file.name || 'attachment');
        uploadedUrl = `data:${contentType};name=${encodedName};base64,${base64}`;
      } catch (err) {
        console.warn('Could not encode ticket attachment:', err);
      }
    }

    if (uploadedUrl) {
      urls.push(uploadedUrl);
    }
  }

  return urls;
}

/**
 * Merges tickets from the local JSON store and Supabase database tables (if migrated).
 */
async function loadAllMergedTickets(): Promise<SupportTicketRecord[]> {
  const local = readLocalStore();
  const deletedSet = new Set(local.deletedIds);
  const map = new Map<string, SupportTicketRecord>();

  for (const [id, t] of Object.entries(local.tickets)) {
    if (!deletedSet.has(id)) {
      map.set(id, {
        ...t,
        messages: Array.isArray(t.messages)
          ? [...t.messages].sort((a, b) => a.created_at.localeCompare(b.created_at))
          : [],
      });
    }
  }

  try {
    const supabase = await createClient();
    const { data: dbTickets, error: tErr } = await (supabase as any)
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!tErr && Array.isArray(dbTickets) && dbTickets.length > 0) {
      const ticketIds = dbTickets.map((t: any) => t.id);
      const { data: dbMessages } = await (supabase as any)
        .from('support_ticket_messages')
        .select('*')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: true });

      const messagesByTicket = new Map<string, TicketMessageRecord[]>();
      for (const m of dbMessages || []) {
        const list = messagesByTicket.get(m.ticket_id) || [];
        list.push({
          id: String(m.id),
          ticket_id: String(m.ticket_id),
          sender_id: m.sender_id || null,
          sender_role: (m.sender_role as TicketSenderRole) || 'customer',
          sender_name: m.sender_name || null,
          message: String(m.message || ''),
          attachment_urls: Array.isArray(m.attachment_urls) ? m.attachment_urls : [],
          status_change_to: (m.status_change_to as TicketStatus) || null,
          created_at: m.created_at || new Date().toISOString(),
        });
        messagesByTicket.set(m.ticket_id, list);
      }

      for (const row of dbTickets) {
        if (deletedSet.has(row.id)) continue;
        const existing = map.get(row.id);
        const dbMsgList = messagesByTicket.get(row.id) || [];

        const mergedMessagesMap = new Map<string, TicketMessageRecord>();
        for (const em of existing?.messages || []) {
          mergedMessagesMap.set(em.id, em);
        }
        for (const dm of dbMsgList) {
          mergedMessagesMap.set(dm.id, dm);
        }
        const mergedMessages = Array.from(mergedMessagesMap.values()).sort((a, b) =>
          a.created_at.localeCompare(b.created_at)
        );

        const record: SupportTicketRecord = {
          id: String(row.id),
          ticket_number: Number(row.ticket_number) || existing?.ticket_number || 1001,
          user_id: row.user_id || existing?.user_id || null,
          user_name: row.user_name || existing?.user_name || null,
          user_email: String(row.user_email || existing?.user_email || ''),
          mystery_id: row.mystery_id || existing?.mystery_id || null,
          mystery_title: existing?.mystery_title || null,
          category: (row.category as TicketCategory) || existing?.category || 'general',
          subject: String(row.subject || existing?.subject || 'Support Request'),
          severity: (row.severity as TicketSeverity) || existing?.severity || 'medium',
          status: (row.status as TicketStatus) || existing?.status || 'open',
          last_reply_by:
            (row.last_reply_by as 'customer' | 'admin') || existing?.last_reply_by || 'customer',
          created_at: row.created_at || existing?.created_at || new Date().toISOString(),
          updated_at:
            existing && existing.updated_at > (row.updated_at || '')
              ? existing.updated_at
              : row.updated_at || new Date().toISOString(),
          messages: mergedMessages,
        };

        map.set(record.id, record);
      }
    }
  } catch {
    // Table may not be migrated yet; local store handles everything seamlessly
  }

  return Array.from(map.values()).sort((a, b) =>
    (b.updated_at || '').localeCompare(a.updated_at || '')
  );
}

/**
 * Fetches tickets belonging to the currently logged-in customer.
 */
export async function getCustomerTicketsAction(): Promise<{
  tickets: SupportTicketRecord[];
  user: { id: string; name: string; email: string } | null;
  mysteries: Array<{ id: string; title: string }>;
}> {
  const allTickets = await loadAllMergedTickets();
  let user: any = null;
  let supabase: any = null;

  try {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch {}

  let profileName = user?.user_metadata?.full_name || '';
  if (user && supabase) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.full_name) profileName = profile.full_name;
    } catch {}
  }

  const userEmail = (user?.email || '').toLowerCase().trim();

  const myTickets = !user
    ? []
    : allTickets.filter(
        (t) =>
          t.user_id === user.id ||
          (userEmail && (t.user_email || '').toLowerCase().trim() === userEmail)
      );

  // Only load PUBLISHED mysteries for the customer selector
  let mysteries: Array<{ id: string; title: string }> = [];
  if (supabase) {
    try {
      const { data: mysData } = await supabase
        .from('mysteries')
        .select('id, title, status')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(30);
      if (Array.isArray(mysData)) {
        mysteries = mysData
          .filter((m: any) => m.title && m.title.trim().toLowerCase() !== 'testing')
          .map((m: any) => ({ id: m.id, title: m.title }));
      }
    } catch {}
  }

  const mysteriesMap = new Map(mysteries.map((m) => [m.id, m.title]));
  for (const t of myTickets) {
    if (t.mystery_id && !t.mystery_title && mysteriesMap.has(t.mystery_id)) {
      t.mystery_title = mysteriesMap.get(t.mystery_id) || null;
    }
  }

  return {
    tickets: myTickets,
    user: user
      ? {
          id: user.id,
          name: profileName || user.email?.split('@')[0] || 'Customer',
          email: user.email || '',
        }
      : null,
    mysteries,
  };
}

/**
 * Fetches all tickets for the Admin dashboard.
 */
export async function getAllAdminTicketsAction(): Promise<SupportTicketRecord[]> {
  const allTickets = await loadAllMergedTickets();

  try {
    const supabase = await createClient();
    const mysteryIds = [
      ...new Set(allTickets.map((t) => t.mystery_id).filter(Boolean) as string[]),
    ];
    if (mysteryIds.length > 0) {
      const { data: mysData } = await supabase
        .from('mysteries')
        .select('id, title')
        .in('id', mysteryIds);
      if (Array.isArray(mysData)) {
        const mMap = new Map(mysData.map((m: any) => [m.id, m.title]));
        for (const t of allTickets) {
          if (t.mystery_id && !t.mystery_title && mMap.has(t.mystery_id)) {
            t.mystery_title = mMap.get(t.mystery_id) || null;
          }
        }
      }
    }
  } catch {}

  return allTickets;
}

/**
 * Creates a new support ticket from the Customer Builder / Account Portal
 * and emails hello@backpocketgames.com every time a ticket is submitted.
 */
export async function createSupportTicketAction(formData: FormData): Promise<{
  success: boolean;
  ticket?: SupportTicketRecord;
  emailSent?: boolean;
  emailId?: string;
  error?: string;
}> {
  let supabase: any = null;
  let user: any = null;
  try {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch {}

  const subject = ((formData.get('subject') as string) || '').trim();
  const comment = ((formData.get('comment') as string) || '').trim();
  const rawSeverity = ((formData.get('severity') as string) || 'medium').toLowerCase();
  const rawCategory = ((formData.get('category') as string) || 'general').toLowerCase();
  const mysteryId = ((formData.get('mystery_id') as string) || '').trim() || null;
  const mysteryTitle = ((formData.get('mystery_title') as string) || '').trim() || null;

  const submittedName = ((formData.get('user_name') as string) || '').trim();
  const submittedEmail = ((formData.get('user_email') as string) || '').trim();

  if (!subject) {
    return { success: false, error: 'Please enter a subject for your ticket.' };
  }
  if (!comment) {
    return { success: false, error: 'Please provide a comment or description of the issue.' };
  }

  let profileName = user?.user_metadata?.full_name || '';
  if (user && supabase) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.full_name) profileName = profile.full_name;
    } catch {}
  }

  const userEmail = user?.email || submittedEmail || '';
  if (!userEmail) {
    return { success: false, error: 'Could not determine your account email address.' };
  }

  const userName =
    profileName ||
    submittedName ||
    userEmail.split('@')[0] ||
    'Customer';

  const severity: TicketSeverity = ['low', 'medium', 'high', 'urgent'].includes(rawSeverity)
    ? (rawSeverity as TicketSeverity)
    : 'medium';

  const category: TicketCategory = [
    'bug',
    'mystery_content',
    'billing',
    'feature_request',
    'general',
  ].includes(rawCategory)
    ? (rawCategory as TicketCategory)
    : 'general';

  // Upload any attached files
  const files = formData.getAll('attachments') as File[];
  const attachmentUrls = await uploadAttachments(supabase, files);

  const nowIso = new Date().toISOString();
  const ticketId = crypto.randomUUID();
  const messageId = crypto.randomUUID();

  const local = readLocalStore();
  const ticketNumber = local.nextTicketNumber++;

  const initialMessage: TicketMessageRecord = {
    id: messageId,
    ticket_id: ticketId,
    sender_id: user?.id || null,
    sender_role: 'customer',
    sender_name: userName,
    message: comment,
    attachment_urls: attachmentUrls,
    status_change_to: null,
    created_at: nowIso,
  };

  const newTicket: SupportTicketRecord = {
    id: ticketId,
    ticket_number: ticketNumber,
    user_id: user?.id || null,
    user_name: userName,
    user_email: userEmail,
    mystery_id: mysteryId,
    mystery_title: mysteryTitle,
    category,
    subject,
    severity,
    status: 'open',
    last_reply_by: 'customer',
    created_at: nowIso,
    updated_at: nowIso,
    messages: [initialMessage],
  };

  // 1. Save to local store
  local.tickets[ticketId] = newTicket;
  writeLocalStore(local);

  // 2. Best-effort save to Supabase tables
  if (supabase) {
    try {
      const isMysteryUuid =
        mysteryId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mysteryId)
          ? mysteryId
          : null;

      const { data: insertedTicket, error: tErr } = await supabase
        .from('support_tickets')
        .insert({
          id: ticketId,
          user_id: user?.id || null,
          user_name: userName,
          user_email: userEmail,
          mystery_id: isMysteryUuid,
          category,
          subject,
          severity,
          status: 'open',
          last_reply_by: 'customer',
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('ticket_number')
        .maybeSingle();

      if (!tErr && insertedTicket?.ticket_number) {
        newTicket.ticket_number = Number(insertedTicket.ticket_number);
        local.tickets[ticketId] = newTicket;
        writeLocalStore(local);
      }

      if (!tErr) {
        await supabase.from('support_ticket_messages').insert({
          id: messageId,
          ticket_id: ticketId,
          sender_id: user?.id || null,
          sender_role: 'customer',
          sender_name: userName,
          message: comment,
          attachment_urls: attachmentUrls,
          status_change_to: null,
          created_at: nowIso,
        });
      }
    } catch (err) {
      console.warn('Supabase support_tickets insert fallback to local store:', err);
    }
  }

  // 3. Send Email Notification to hello@backpocketgames.com (+ Customer Confirmation)
  const ticketRef = formatTicketRef(newTicket.ticket_number, newTicket.id);
  const sevLabel = SEVERITY_CONFIG[severity]?.label || severity.toUpperCase();
  const emailAttachments = buildEmailAttachments(attachmentUrls);

  // Email to Admin (hello@backpocketgames.com)
  const adminEmailResult = await sendEmailWithDomainFallback({
    to: SUPPORT_EMAIL,
    replyTo: userEmail,
    subject: `[${ticketRef}] [${sevLabel.toUpperCase()}] ${subject}`,
    attachments: emailAttachments,
    html: buildOfficialTicketEmailHtml({
      audience: 'admin',
      headerBadge: `Support Desk • New Ticket ${ticketRef}`,
      headline: 'New Support Ticket Submitted',
      subheadline: `${userName} (${userEmail}) submitted a ${sevLabel.toLowerCase()} priority support ticket.`,
      ticket: newTicket,
      featuredMessage: initialMessage,
      attachmentUrls,
    }),
  });

  // Confirmation Email to Customer
  await sendEmailWithDomainFallback({
    to: userEmail,
    replyTo: SUPPORT_EMAIL,
    subject: `We've received your support ticket (${ticketRef}): ${subject}`,
    attachments: emailAttachments,
    html: buildOfficialTicketEmailHtml({
      audience: 'customer',
      headerBadge: `Ticket Logged • ${ticketRef}`,
      headline: `We've received your support ticket!`,
      subheadline: `Hi ${userName}, thank you for reaching out to Back Pocket Mysteries. We've logged your ticket (${ticketRef}) and our team is looking into it.`,
      ticket: newTicket,
      featuredMessage: initialMessage,
      attachmentUrls,
      isCustomerConfirmation: true,
    }),
  });

  try {
    revalidatePath('/', 'layout');
  } catch {}
  return {
    success: true,
    ticket: newTicket,
    emailSent: adminEmailResult.sent,
    emailId: adminEmailResult.id,
  };
}

/**
 * Appends a message to a ticket's text chain (used by both Customers and Admins)
 * and optionally transitions the ticket's status and/or severity.
 */
export async function addTicketReplyAction(formData: FormData): Promise<{
  success: boolean;
  ticket?: SupportTicketRecord;
  emailSent?: boolean;
  error?: string;
}> {
  const ticketId = ((formData.get('ticket_id') as string) || '').trim();
  const messageText = ((formData.get('message') as string) || '').trim();
  const requestedRole = ((formData.get('sender_role') as string) || 'customer') as TicketSenderRole;
  const newStatusRaw = ((formData.get('new_status') as string) || '').trim() as TicketStatus | '';
  const newSeverityRaw = ((formData.get('new_severity') as string) || '').trim() as TicketSeverity | '';

  if (!ticketId) {
    return { success: false, error: 'Missing ticket ID.' };
  }

  let supabase: any = null;
  let user: any = null;
  try {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch {}

  const senderRole: TicketSenderRole = requestedRole === 'admin' ? 'admin' : 'customer';

  const allTickets = await loadAllMergedTickets();
  const target = allTickets.find((t) => t.id === ticketId);
  if (!target) {
    return { success: false, error: 'Ticket not found.' };
  }

  // Upload any attached images on the reply
  const files = formData.getAll('attachments') as File[];
  const attachmentUrls = await uploadAttachments(supabase, files);

  if (!messageText && attachmentUrls.length === 0 && !newStatusRaw) {
    return { success: false, error: 'Please enter a message or attach an image.' };
  }

  const nowIso = new Date().toISOString();

  // Determine status transition
  let statusChangedTo: TicketStatus | null = null;
  let updatedStatus: TicketStatus = target.status;

  if (
    newStatusRaw &&
    ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'].includes(newStatusRaw) &&
    newStatusRaw !== target.status
  ) {
    updatedStatus = newStatusRaw;
    statusChangedTo = newStatusRaw;
  } else if (senderRole === 'admin' && target.status === 'open') {
    updatedStatus = 'in_progress';
    statusChangedTo = 'in_progress';
  } else if (
    senderRole === 'customer' &&
    (target.status === 'waiting_on_customer' || target.status === 'resolved')
  ) {
    updatedStatus = 'open';
    statusChangedTo = 'open';
  }

  const updatedSeverity: TicketSeverity =
    newSeverityRaw && ['low', 'medium', 'high', 'urgent'].includes(newSeverityRaw)
      ? newSeverityRaw
      : target.severity;

  const senderName =
    senderRole === 'admin'
      ? user?.user_metadata?.full_name || 'Back Pocket Support'
      : target.user_name || user?.user_metadata?.full_name || 'Customer';

  const finalMessageText =
    messageText ||
    (statusChangedTo
      ? `Updated ticket status to ${STATUS_CONFIG[statusChangedTo]?.label || statusChangedTo}.`
      : 'Attached image update.');

  const newMessage: TicketMessageRecord = {
    id: crypto.randomUUID(),
    ticket_id: ticketId,
    sender_id: user?.id || null,
    sender_role: senderRole,
    sender_name: senderName,
    message: finalMessageText,
    attachment_urls: attachmentUrls,
    status_change_to: statusChangedTo,
    created_at: nowIso,
  };

  const updatedTicket: SupportTicketRecord = {
    ...target,
    status: updatedStatus,
    severity: updatedSeverity,
    last_reply_by: senderRole === 'admin' ? 'admin' : 'customer',
    updated_at: nowIso,
    messages: [...target.messages, newMessage],
  };

  // 1. Update local store
  const local = readLocalStore();
  local.tickets[ticketId] = updatedTicket;
  writeLocalStore(local);

  // 2. Best-effort update in Supabase
  if (supabase) {
    try {
      await supabase
        .from('support_tickets')
        .update({
          status: updatedStatus,
          severity: updatedSeverity,
          last_reply_by: updatedTicket.last_reply_by,
          updated_at: nowIso,
        })
        .eq('id', ticketId);

      await supabase.from('support_ticket_messages').insert({
        id: newMessage.id,
        ticket_id: ticketId,
        sender_id: newMessage.sender_id,
        sender_role: newMessage.sender_role,
        sender_name: newMessage.sender_name,
        message: newMessage.message,
        attachment_urls: newMessage.attachment_urls,
        status_change_to: newMessage.status_change_to,
        created_at: nowIso,
      });
    } catch (err) {
      console.warn('Supabase ticket reply fallback to local store:', err);
    }
  }

  // 3. Send Email Notification via Resend
  const ticketRef = formatTicketRef(updatedTicket.ticket_number, updatedTicket.id);
  const statusLabel = STATUS_CONFIG[updatedStatus]?.label || updatedStatus;
  const emailAttachments = buildEmailAttachments(attachmentUrls);
  let emailSent = false;

  if (senderRole === 'admin' && updatedTicket.user_email) {
    const res = await sendEmailWithDomainFallback({
      to: updatedTicket.user_email,
      replyTo: SUPPORT_EMAIL,
      subject: `Update on your ticket (${ticketRef}): ${updatedTicket.subject}`,
      attachments: emailAttachments,
      html: buildOfficialTicketEmailHtml({
        audience: 'customer',
        headerBadge: `Support Update • ${ticketRef}`,
        headline: 'New Response from Back Pocket Support',
        subheadline: `Our team replied to your ticket. Current status: ${statusLabel}.`,
        ticket: updatedTicket,
        featuredMessage: newMessage,
        attachmentUrls,
      }),
    });
    emailSent = res.sent;
  } else if (senderRole === 'customer') {
    const res = await sendEmailWithDomainFallback({
      to: SUPPORT_EMAIL,
      replyTo: updatedTicket.user_email,
      subject: `New Customer Reply on [${ticketRef}] ${updatedTicket.subject}`,
      attachments: emailAttachments,
      html: buildOfficialTicketEmailHtml({
        audience: 'admin',
        headerBadge: `Customer Reply • ${ticketRef}`,
        headline: `New Reply from ${senderName}`,
        subheadline: `${senderName} (${updatedTicket.user_email}) added a new message to the ticket chain.`,
        ticket: updatedTicket,
        featuredMessage: newMessage,
        attachmentUrls,
      }),
    });
    emailSent = res.sent;
  }

  try {
    revalidatePath('/', 'layout');
  } catch {}
  return { success: true, ticket: updatedTicket, emailSent };
}

/**
 * Updates a ticket's status or severity directly and logs the change in the text chain.
 */
export async function updateTicketStatusAction(params: {
  ticketId: string;
  status: TicketStatus;
  severity?: TicketSeverity;
  note?: string;
}): Promise<{
  success: boolean;
  ticket?: SupportTicketRecord;
  error?: string;
}> {
  const formData = new FormData();
  formData.set('ticket_id', params.ticketId);
  formData.set('new_status', params.status);
  if (params.severity) {
    formData.set('new_severity', params.severity);
  }

  let isAdmin = true;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      isAdmin = await isUserAdmin(supabase, user);
    }
  } catch {}

  formData.set('sender_role', isAdmin ? 'admin' : 'customer');
  formData.set(
    'message',
    params.note?.trim() ||
      `Status updated to "${STATUS_CONFIG[params.status]?.label || params.status}".`
  );

  return addTicketReplyAction(formData);
}

/**
 * Admin-only action to delete a ticket.
 */
export async function deleteTicketAction(ticketId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const local = readLocalStore();
  delete local.tickets[ticketId];
  if (!local.deletedIds.includes(ticketId)) {
    local.deletedIds.push(ticketId);
  }
  writeLocalStore(local);

  try {
    const supabase = await createClient();
    await (supabase as any).from('support_tickets').delete().eq('id', ticketId);
  } catch {}

  try {
    revalidatePath('/', 'layout');
  } catch {}
  return { success: true };
}
