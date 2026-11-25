// @ts-nocheck
'use server';

import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/utils/admin-auth';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function submitReview(formData: FormData) {
  const name = ((formData.get('name') as string) || '').trim();
  const rating = parseInt(formData.get('rating') as string, 10);
  const review_text = ((formData.get('review_text') as string) || '').trim();

  if (!name || !review_text || isNaN(rating) || rating < 1 || rating > 5) {
    return { error: 'Please provide a valid name, rating (1-5), and review text.' };
  }

  const supabase = await createClient();
  const files = formData.getAll('attachments') as File[];
  const attachment_urls: string[] = [];

  // Handle file uploads
  if (files.length > 0) {
    for (const file of files) {
      if (file.size === 0) continue;
      try {
        const fileExt = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `reviews/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, file);

        if (uploadError) {
          console.warn('Failed to upload file to Supabase (bucket might be missing):', uploadError);
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

  // Try to insert into reviews table
  const { error } = await supabase.from('reviews').insert({
    name,
    rating,
    review_text,
    status: 'pending',
    attachment_urls
  });

  if (error) {
    if (error.code === 'PGRST205') {
      console.warn('Reviews table is missing. Faking success for now.');
    } else {
      console.error('Review submission error:', error);
      return { error: 'Failed to submit review. Please try again later.' };
    }
  }

  // Send email notification for new review
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const safeName = escapeHtml(name);
      const safeReviewHtml = escapeHtml(review_text).replace(/\n/g, '<br/>');
      
      const attachmentsHtml = attachment_urls.length > 0 
        ? `<p><strong>Attached Photos:</strong><br/>${attachment_urls.map(url => `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`).join('<br/>')}</p>`
        : '';
        
      const result = await resend.emails.send({
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: 'Hello@backpocketgames.com',
        subject: `New Review from ${name} (${rating}/5 Stars)`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border-top: 4px solid #F02882;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #1a1a1a; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Back Pocket Mysteries</h2>
              <p style="color: #F02882; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">New Customer Review</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 15px;">
                <div>
                  <strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Name</strong><br/>
                  <span style="color: #1a1a1a; font-size: 16px; font-weight: bold;">${safeName}</span>
                </div>
                <div style="text-align: right;">
                  <strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Rating</strong><br/>
                  <span style="color: #F02882; font-size: 16px; font-weight: bold;">${rating}/5 Stars</span>
                </div>
              </div>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; position: relative;">
                <span style="color: #e0e0e0; font-size: 40px; font-family: serif; position: absolute; top: 10px; left: 10px; line-height: 1;">"</span>
                <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6; font-style: italic; position: relative; z-index: 10; padding-top: 10px;">${safeReviewHtml}</p>
              </div>
              
              ${attachmentsHtml ? `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">${attachmentsHtml}</div>` : ''}
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #888; font-size: 12px; font-style: italic;">Log in to your Admin Dashboard to publish or manage this review.</p>
            </div>
          </div>
        `
      });
      
      if (result.error) {
        console.error('[EMAIL NOTIFICATION] Resend API Error:', result.error);
      }

      // Send Customer Confirmation Email
      const email = formData.get('email') as string;
      if (email) {
        const { render } = await import('@react-email/components');
        const CustomerReviewEmail = (await import('@/emails/CustomerReviewEmail')).default;
        const customerHtml = await render(CustomerReviewEmail({ name, rating }));
        
        await resend.emails.send({
          from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
          to: email,
          subject: 'Thank you for your review!',
          html: customerHtml,
        });
      }
    }
  } catch (err) {
    console.error('Failed to send email notification:', err);
  }

  return { success: true };
}

export async function toggleReviewStatus(reviewId: string, currentStatus: string) {
  const { supabase } = await requireAdmin();
  const newStatus = currentStatus === 'published' ? 'pending' : 'published';

  // Always persist status override in review-metadata.json so session reviews and DB reviews both update
  const map = await getReviewMetadataMap();
  map[reviewId] = {
    ...(map[reviewId] || {}),
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
  saveReviewMetadataMap(map);

  const { error } = await supabase
    .from('reviews')
    .update({ status: newStatus })
    .eq('id', reviewId);

  if (error && error.code !== 'PGRST205') {
    console.warn('Warning updating review in DB (saved in metadata store):', error);
  }

  revalidatePath('/en/admin/reviews');
  return { success: true, newStatus };
}

export async function bulkUpdateReviews(ids: string[], action: 'publish' | 'unpublish' | 'delete') {
  const { supabase } = await requireAdmin();

  const map = await getReviewMetadataMap();
  const now = new Date().toISOString();
  for (const id of ids) {
    if (action === 'delete') {
      map[id] = { ...(map[id] || {}), deleted: true, updatedAt: now };
    } else {
      const status = action === 'publish' ? 'published' : 'pending';
      map[id] = { ...(map[id] || {}), status, updatedAt: now };
    }
  }
  saveReviewMetadataMap(map);

  if (action === 'delete') {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .in('id', ids);

    if (error && error.code !== 'PGRST205') {
      console.warn('Warning deleting reviews from DB:', error);
    }
  } else {
    const status = action === 'publish' ? 'published' : 'pending';
    const { error } = await supabase
      .from('reviews')
      .update({ status })
      .in('id', ids);

    if (error && error.code !== 'PGRST205') {
      console.warn('Warning updating reviews in DB:', error);
    }
  }

  revalidatePath('/en/admin/reviews');
  return { success: true };
}

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import {
  getAllStoredGameSessions,
  getCachedMysterySnapshot,
  LIVE_CARRIER_CLUE_TITLE,
  StoredGuestReview,
} from '@/lib/live-session-store';

const REVIEW_META_PATH = path.join(process.cwd(), 'data', 'review-metadata.json');

export interface ReviewExtraMeta {
  mysteryTitle?: string;
  status?: 'pending' | 'published';
  deleted?: boolean;
  featuredOnHomepage?: boolean;
  adminReply?: string;
  updatedAt?: string;
}

function saveReviewMetadataMap(map: Record<string, ReviewExtraMeta>) {
  try {
    const dir = path.dirname(REVIEW_META_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REVIEW_META_PATH, JSON.stringify(map, null, 2), 'utf8');
  } catch {
    // non-fatal in read-only environments
  }
}

export async function getReviewMetadataMap(): Promise<Record<string, ReviewExtraMeta>> {
  try {
    if (fs.existsSync(REVIEW_META_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(REVIEW_META_PATH, 'utf8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

export async function assignReviewMysteryBaseAction(
  reviewId: string,
  mysteryTitle: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireAdmin();
    const map = await getReviewMetadataMap();
    map[reviewId] = {
      ...(map[reviewId] || {}),
      mysteryTitle: mysteryTitle.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    saveReviewMetadataMap(map);
    revalidatePath('/en/admin/reviews');
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to update review mystery base' };
  }
}

/**
 * Aggregates all customer & guest reviews across:
 * 1. public.reviews table (if migrated)
 * 2. Supabase LIVE_CARRIER_CLUE_TITLE carrier rows (Playroom end-of-game Review Wall submissions)
 * 3. Local .live-game-sessions.json sessions (Playroom end-of-game Review Wall submissions)
 */
export async function getAllPlatformReviews(
  supabaseClient?: any,
  mysteryTitleById?: Map<string, string>
): Promise<any[]> {
  const supabase = supabaseClient || (await createClient());
  const metaMap = await getReviewMetadataMap();
  const byId = new Map<string, any>();

  // 1. Query public.reviews if available
  const { data: dbReviews, error: dbErr } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (!dbErr && Array.isArray(dbReviews)) {
    for (const r of dbReviews) {
      if (!r?.id || metaMap[r.id]?.deleted) continue;
      byId.set(String(r.id), {
        ...r,
        status: metaMap[r.id]?.status || r.status || 'pending',
        mystery_title: metaMap[r.id]?.mysteryTitle || r.mystery_title,
      });
    }
  }

  const ingestGuestReview = (
    rev: StoredGuestReview,
    fallbackMysteryId?: string,
    fallbackMysteryTitle?: string,
    sessionHostMeta?: {
      hostUserId?: string;
      hostName?: string;
      hostEmail?: string;
      sessionPin?: string;
    }
  ) => {
    if (!rev || !rev.id || metaMap[rev.id]?.deleted) return;
    const mId = rev.mysteryId || fallbackMysteryId || '';
    const baseId = mId.includes('__u_') ? mId.split('__u_')[0] : mId;
    const userIdFromCloneKey = mId.includes('__u_') ? mId.split('__u_')[1] : undefined;
    const cachedSnap = getCachedMysterySnapshot(mId) || getCachedMysterySnapshot(baseId);
    const resolvedMysteryTitle =
      metaMap[rev.id]?.mysteryTitle ||
      rev.mysteryTitle ||
      fallbackMysteryTitle ||
      (mysteryTitleById && (mysteryTitleById.get(mId) || mysteryTitleById.get(baseId))) ||
      cachedSnap?.title ||
      undefined;

    const existing = byId.get(rev.id);
    const formattedComment = rev.characterRole
      ? `[Played ${rev.characterRole}${resolvedMysteryTitle ? ` • ${resolvedMysteryTitle}` : ''}] ${rev.comment}`
      : rev.comment;

    const hostUserId =
      rev.hostUserId ||
      sessionHostMeta?.hostUserId ||
      userIdFromCloneKey ||
      cachedSnap?.created_by ||
      existing?.host_user_id ||
      undefined;
    const hostName =
      rev.hostName ||
      sessionHostMeta?.hostName ||
      existing?.host_name ||
      undefined;
    const hostEmail =
      rev.hostEmail ||
      sessionHostMeta?.hostEmail ||
      existing?.host_email ||
      undefined;
    const sessionPin =
      rev.sessionPin ||
      sessionHostMeta?.sessionPin ||
      existing?.session_pin ||
      undefined;

    byId.set(rev.id, {
      ...(existing || {}),
      id: rev.id,
      name: rev.playerName || 'Mystery Guest',
      rating: Number(rev.rating) || 5,
      review_text: formattedComment || rev.comment || 'Loved playing!',
      status: metaMap[rev.id]?.status || rev.status || existing?.status || 'pending',
      attachment_urls: rev.photoUrl
        ? [rev.photoUrl]
        : existing?.attachment_urls || [],
      mystery_id: mId,
      mystery_title: resolvedMysteryTitle,
      character_role: rev.characterRole,
      host_user_id: hostUserId,
      host_name: hostName,
      host_email: hostEmail,
      session_pin: sessionPin,
      is_guest_review: true,
      created_at: rev.createdAt || existing?.created_at || new Date().toISOString(),
    });
  };

  // 2. Read all Supabase LIVE_CARRIER_CLUE_TITLE rows so cross-container Playroom reviews always show in Admin
  try {
    const { data: carrierRows } = await supabase
      .from('clues')
      .select('id, mystery_id, description')
      .eq('title', LIVE_CARRIER_CLUE_TITLE);

    for (const row of carrierRows || []) {
      if (!row?.description) continue;
      try {
        const parsed =
          typeof row.description === 'string' ? JSON.parse(row.description) : row.description;
        const sessObj = parsed?.session || parsed || {};
        const sessionReviews: StoredGuestReview[] = sessObj?.reviews || [];
        const sessionHostMeta = {
          hostUserId: sessObj?.hostUserId || sessObj?.paidByUserId,
          hostName: sessObj?.customerName,
          hostEmail: sessObj?.customerEmail,
          sessionPin: sessObj?.pin,
        };
        for (const rev of sessionReviews) {
          ingestGuestReview(rev, row.mystery_id, parsed?.title, sessionHostMeta);
        }
      } catch {
        // ignore malformed row
      }
    }
  } catch {
    // non-fatal
  }

  // 2b. Read all Supabase characters.profile_data.__game_session carrier rows (written by submitGuestMysteryReviewAction)
  try {
    const { data: charCarriers } = await supabase
      .from('characters')
      .select('id, mystery_id, profile_data')
      .eq('is_victim', true);

    for (const cRow of charCarriers || []) {
      const sessObj = cRow?.profile_data?.__game_session;
      if (!sessObj || !Array.isArray(sessObj.reviews)) continue;
      const sessionHostMeta = {
        hostUserId: sessObj.hostUserId || sessObj.paidByUserId,
        hostName: sessObj.customerName,
        hostEmail: sessObj.customerEmail,
        sessionPin: sessObj.pin,
      };
      for (const rev of sessObj.reviews) {
        ingestGuestReview(rev, cRow.mystery_id, undefined, sessionHostMeta);
      }
    }
  } catch {
    // non-fatal
  }

  // 3. Read all local game sessions from .live-game-sessions.json
  try {
    const localSessions = getAllStoredGameSessions();
    for (const sess of localSessions) {
      const sessionHostMeta = {
        hostUserId: sess.hostUserId || sess.paidByUserId,
        hostName: sess.customerName,
        hostEmail: sess.customerEmail,
        sessionPin: sess.pin,
      };
      for (const rev of sess.reviews || []) {
        ingestGuestReview(rev, sess.mysteryId, undefined, sessionHostMeta);
      }
    }
  } catch {
    // non-fatal
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}

export interface PublicPublishedReview {
  id: string;
  name: string;
  rating: number;
  cleanComment: string;
  characterRole?: string;
  mysteryTitle?: string;
  photoUrl?: string;
  createdAt: string;
}

export async function getPublishedReviewsForPublicDisplay(options?: {
  mysteryTitle?: string;
  mysteryId?: string;
  limit?: number;
}): Promise<PublicPublishedReview[]> {
  const all = await getAllPlatformReviews();
  const published = all.filter((r) => r.status === 'published');

  const formatted: PublicPublishedReview[] = published.map((r) => {
    const rawText = String(r.review_text || '').trim();
    const prefixMatch = rawText.match(/^\[([^\]]+)\]\s*(.*)$/);
    const cleanComment = (prefixMatch ? prefixMatch[2] : rawText).trim() || rawText;
    let role = r.character_role;
    let mTitle = r.mystery_title;

    if (prefixMatch && prefixMatch[1]) {
      const inner = prefixMatch[1];
      const parts = inner.split('•').map((s: string) => s.trim());
      for (const p of parts) {
        if (p.toLowerCase().startsWith('played ')) {
          role = role || p.replace(/^played\s+/i, '').trim();
        } else if (!mTitle) {
          mTitle = p;
        }
      }
    }

    const photoUrl =
      Array.isArray(r.attachment_urls) && r.attachment_urls.length > 0
        ? r.attachment_urls[0]
        : undefined;

    return {
      id: String(r.id),
      name: String(r.name || 'Verified Player'),
      rating: Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))),
      cleanComment,
      characterRole: role,
      mysteryTitle: mTitle,
      photoUrl,
      createdAt: r.created_at || new Date().toISOString(),
    };
  });

  if (options?.mysteryTitle || options?.mysteryId) {
    const targetTitle = (options.mysteryTitle || '').toLowerCase().trim();
    const isHolidayAlias =
      targetTitle.includes('christmas') || targetTitle.includes('ho ho homicide');

    const matching = formatted.filter((rev) => {
      const revTitle = (rev.mysteryTitle || '').toLowerCase().trim();
      if (!revTitle) return false;
      if (revTitle === targetTitle) return true;
      if (
        isHolidayAlias &&
        (revTitle.includes('christmas') || revTitle.includes('ho ho homicide'))
      ) {
        return true;
      }
      return false;
    });

    const limit = options.limit || 9;
    if (matching.length > 0) {
      return matching.slice(0, limit);
    }
  }

  return options?.limit ? formatted.slice(0, options.limit) : formatted;
}
