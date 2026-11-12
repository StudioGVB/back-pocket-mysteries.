'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { GuestModal } from '@/components/account/GuestModal';
import { sendGuestInvitation, createShareableInviteLink, cancelInvitation, removeGuestConnection } from '@/app/actions/guest-invitations';
import { saveGuestAction, updateGuestAction, removeGuestAction } from '@/app/actions/guests';
import { buildAvatarUrl, extractAccentFromAvatarUrl } from '@/utils/avatar';

interface ManualGuest {
  id: string;
  name: string;
  gender?: string | null;
  accent?: string | null;
  avatar_url?: string | null;
  ethnicity?: string | null;
  traits?: string[] | null;
  bio?: string | null;
}

interface LinkedGuest {
  id: string;
  connectionId: string;
  guestUserId: string;
  name: string;
  isLinked: true;
  profile?: {
    bio?: string | null;
    location?: string | null;
    pronouns?: string | null;
    avatar_config?: any;
    dietary_needs?: string[] | null;
    character_preferences?: string[] | null;
  } | null;
}

interface PendingInvite {
  id: string;
  invite_email: string;
  invite_token?: string | null;
  personal_note?: string | null;
  created_at: string;
  expires_at: string;
  manual_guest_id?: string | null;
}

interface GuestsClientProps {
  initialGuests: ManualGuest[];
  linkedGuests: LinkedGuest[];
  pendingInvites: PendingInvite[];
  locale: string;
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    }, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  
  const d = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const h = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const m = Math.floor((timeLeft / 1000 / 60) % 60);
  return <span className="font-mono">{d}d {h}h {m}m</span>;
}

function GuestCard({ guest, locale, onRemove, onEdit, onShare, pendingInvite, onCancelInvite, isGenerating }: { guest: ManualGuest; locale: string; onRemove?: () => void; onEdit?: () => void; onShare?: () => void; pendingInvite?: PendingInvite; onCancelInvite?: () => void; isGenerating?: boolean }) {
  const [copiedBanner, setCopiedBanner] = useState(false);
  const initials = guest.name.charAt(0).toUpperCase();
  const defaultAvatar = buildAvatarUrl({
    seed: guest.name,
    top: guest.gender === 'Masculine' ? 'shortFlat' : 'straight01',
    hairColor: '282828',
    skinColor: 'ffe0bd',
    accessories: 'none'
  }, guest.name);
  
  const isDataUri = guest.avatar_url?.startsWith('data:image/');
  const displayAvatar = isDataUri ? defaultAvatar : (guest.avatar_url || defaultAvatar);
  const accent = guest.accent || extractAccentFromAvatarUrl(guest.avatar_url);

  const handleCopyPendingLink = async () => {
    if (!pendingInvite?.invite_token) {
      onShare?.();
      return;
    }
    const url = `${window.location.origin}/${locale}/invite/${pendingInvite.invite_token}`;
    await navigator.clipboard.writeText(url);
    setCopiedBanner(true);
    setTimeout(() => setCopiedBanner(false), 2500);
  };

  return (
    <div className="bg-white border border-slate-100 p-6 rounded-[2rem] flex flex-col group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden">
      {pendingInvite && (
        <div className="absolute top-0 left-0 w-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-widest px-5 py-2 flex justify-between items-center z-10">
          <span>Invite Pending</span>
          <div className="flex gap-2.5 items-center">
            <button
              onClick={handleCopyPendingLink}
              className="px-2 py-0.5 rounded-md bg-amber-950/10 hover:bg-amber-950/20 text-amber-950 font-black transition-colors flex items-center gap-1"
              title="Copy invite link"
            >
              {copiedBanner ? '✓ Copied' : '🔗 Copy Link'}
            </button>
            <Countdown expiresAt={pendingInvite.expires_at} />
            {onCancelInvite && (
              <button onClick={onCancelInvite} className="hover:text-white transition-colors" title="Cancel Invite">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>
      )}
      <div className={`flex items-start justify-between mb-6 ${pendingInvite ? 'mt-6' : ''}`}>
        <div className="flex items-center gap-4">
          <div className="relative">
            {displayAvatar ? (
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayAvatar} alt={guest.name} className="w-[120%] h-[120%] object-cover mt-2" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white border-2 border-white shadow-md" style={{ background: '#fe04c6' }}>
                {initials}
              </div>
            )}
            
            {/* Loading Overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-slate-900/60 rounded-2xl flex flex-col items-center justify-center border-2 border-white backdrop-blur-sm z-10 shadow-lg">
                <svg className="animate-spin h-5 w-5 text-brand-pink mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-[8px] font-black uppercase tracking-widest text-white">AI Gen</span>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{guest.name}</h3>
            <p className="text-xs font-bold text-slate-400">
              {guest.gender || 'Unspecified'}{accent ? ` · 🎙️ ${accent}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {onShare && (
            <button onClick={onShare} className="text-slate-300 hover:text-indigo-400 transition-colors p-1" title="Invite guest via link or email">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
          )}
          {onEdit && (
            <button onClick={onEdit} className="text-slate-300 hover:text-brand-pink transition-colors p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} className="text-slate-300 hover:text-red-400 transition-colors p-1" title="Delete guest">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6"/><path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          )}
        </div>
      </div>
      <div className="mt-auto pt-4 border-t border-slate-50 flex flex-wrap gap-2">
        {guest.traits?.map((trait, idx) => (
          <span key={idx} className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100">
            {trait}
          </span>
        ))}
        {(!guest.traits || guest.traits.length === 0) && (
          <span className="text-xs text-slate-400 italic">No traits added.</span>
        )}
      </div>
    </div>
  );
}

function LinkedGuestCard({ guest, onUnlink }: { guest: LinkedGuest; onUnlink?: () => void }) {
  const avatar = guest.profile?.avatar_config ? buildAvatarUrl(guest.profile.avatar_config, guest.name) : undefined;
  const initials = guest.name.charAt(0).toUpperCase();
  return (
    <div className="relative group rounded-[2rem] p-[3px] flex flex-col">
      {/* Animated rainbow background */}
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 animate-pulse opacity-70 group-hover:opacity-100 transition-opacity" />
      {/* Inner card */}
      <div className="relative bg-white p-6 rounded-[calc(2rem-3px)] h-full flex flex-col hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Linked badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(254,4,198,0.08)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fe04c6" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <span className="text-[10px] font-black" style={{ color: '#fe04c6' }}>Linked</span>
      </div>

      <div className="flex items-start gap-4 mb-6 pr-20">
        {avatar ? (
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1e191c, #2d1f2b)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar} alt={guest.name} className="w-full h-full object-cover scale-110" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white border-2 border-white shadow-md flex-shrink-0" style={{ background: '#fe04c6' }}>
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-900 truncate">{guest.name}</h3>
          {guest.profile?.pronouns && <p className="text-xs font-bold text-slate-400">{guest.profile.pronouns}</p>}
          {guest.profile?.location && <p className="text-xs text-slate-400">{guest.profile.location}</p>}
        </div>
      </div>

      {guest.profile?.character_preferences && guest.profile.character_preferences.length > 0 && (
        <div className="mt-auto pt-4 border-t border-slate-50 flex flex-wrap gap-2">
          {guest.profile.character_preferences.slice(0, 3).map((p, idx) => (
            <span key={idx} className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100" style={{ background: 'rgba(254,4,198,0.05)', color: '#fe04c6' }}>
              {p}
            </span>
          ))}
        </div>
      )}

      {onUnlink && (
        <button onClick={onUnlink} className="mt-4 text-xs font-bold text-slate-300 hover:text-red-400 transition-colors text-left">
          Unlink guest
        </button>
      )}
      </div>
    </div>
  );
}

function PendingCard({ invite, locale, onCancel }: { invite: PendingInvite; locale: string; onCancel: () => void }) {
  const [copied, setCopied] = useState(false);
  const daysLeft = Math.max(0, Math.ceil((new Date(invite.expires_at).getTime() - Date.now()) / 86400000));
  const isShareLink = invite.invite_email?.startsWith('link:');
  const displayTarget = isShareLink
    ? `Shareable Link (${invite.invite_email.replace(/^link:/, '') || 'Friend'})`
    : invite.invite_email;

  const handleCopy = async () => {
    if (!invite.invite_token) return;
    const url = `${window.location.origin}/${locale}/invite/${invite.invite_token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white border-2 border-dashed border-amber-200 p-6 rounded-[2rem] flex flex-col" style={{ background: 'rgba(251,191,36,0.03)' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.1)' }}>
          {isShareLink ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          )}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', color: '#d97706' }}>
          Pending · {daysLeft}d left
        </span>
      </div>
      <p className="font-black text-slate-900 text-sm truncate mb-1">{displayTarget}</p>
      <p className="text-xs text-slate-400 font-medium mb-4">
        {isShareLink ? 'Link ready, waiting for your friend to claim.' : 'Invite sent, waiting for them to join.'}
      </p>
      <div className="flex items-center justify-between mt-auto pt-2">
        {invite.invite_token ? (
          <button
            onClick={handleCopy}
            className="text-xs font-black px-3 py-1.5 rounded-lg transition-all"
            style={{ background: copied ? '#ecfdf5' : 'rgba(254,4,198,0.08)', color: copied ? '#059669' : '#fe04c6' }}
          >
            {copied ? '✓ Link Copied!' : '🔗 Copy Invite Link'}
          </button>
        ) : <span />}
        <button onClick={onCancel} className="text-xs font-bold text-slate-300 hover:text-red-400 transition-colors">
          Cancel invite
        </button>
      </div>
    </div>
  );
}

// --- Invite Modal ---
function InviteModal({
  isOpen,
  onClose,
  onSent,
  sharingGuest,
  existingInvite,
  locale,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSent: (invite: PendingInvite) => void;
  sharingGuest: ManualGuest | null;
  existingInvite?: PendingInvite;
  locale: string;
}) {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setCopiedLink(false);
      setNote(existingInvite?.personal_note || '');
      if (existingInvite?.invite_token && typeof window !== 'undefined') {
        setShareUrl(`${window.location.origin}/${locale}/invite/${existingInvite.invite_token}`);
      } else {
        setShareUrl(null);
      }
    }
  }, [isOpen, existingInvite, locale]);

  if (!isOpen) return null;

  const ensureInviteLink = async (): Promise<string | null> => {
    if (shareUrl && (!note.trim() || note.trim() === (existingInvite?.personal_note || ''))) {
      return shareUrl;
    }
    setLoadingLink(true);
    setError('');
    const result = await createShareableInviteLink({
      manualGuestId: sharingGuest?.id,
      guestName: sharingGuest?.name,
      note: note.trim() || undefined,
    });
    setLoadingLink(false);

    if (result.error || !result.inviteToken) {
      setError(result.error || 'Could not create invite link.');
      return null;
    }

    const url = `${window.location.origin}/${locale}/invite/${result.inviteToken}`;
    setShareUrl(url);
    onSent({
      id: result.inviteId!,
      invite_email: result.inviteEmail || (sharingGuest?.name ? `link:${sharingGuest.name}` : 'link:Friend'),
      invite_token: result.inviteToken,
      personal_note: note.trim() || null,
      created_at: new Date().toISOString(),
      expires_at: result.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString(),
      manual_guest_id: sharingGuest?.id,
    });
    return url;
  };

  const handleCopyLink = async () => {
    const url = await ensureInviteLink();
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3500);
  };

  const handleNativeShare = async () => {
    const url = await ensureInviteLink();
    if (!url) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Mystery Night Roster!',
          text: sharingGuest
            ? `Hey ${sharingGuest.name}! Claim your character profile on my Back Pocket Mysteries roster:`
            : 'Claim your character profile on my Back Pocket Mysteries roster:',
          url,
        });
      } catch {
        // User cancelled share sheet; still copy to clipboard as fallback
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
    }
  };

  const handleSendEmail = async () => {
    if (!email.trim()) {
      setError('Please enter an email address, or use Copy Invite Link above.');
      return;
    }
    setLoadingEmail(true);
    setError('');

    const result = await sendGuestInvitation(email.trim(), note.trim() || undefined, sharingGuest?.id);
    setLoadingEmail(false);
    if (result.error) {
      setError(result.error);
    } else {
      const expiresAt = result.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString();
      onSent({
        id: result.inviteId!,
        invite_email: email.trim(),
        invite_token: result.inviteToken || null,
        personal_note: note.trim() || null,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
        manual_guest_id: sharingGuest?.id,
      });
      setEmail('');
      setNote('');
      onClose();
    }
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 outline-none transition-all";
  const targetName = sharingGuest?.name || ' your friend';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-1.5">
              {sharingGuest ? `Invite ${sharingGuest.name}` : 'Invite a Friend'}
            </h3>
            <p className="text-sm text-slate-500">
              {sharingGuest
                ? `Copy a personal invite link to text ${sharingGuest.name}, or send an email so they can claim their profile and customize their avatar!`
                : 'Copy a link to text your friend directly, or send them an email invite.'}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Optional Personal Note (applies to both Link & Email) */}
        <div className="mb-5">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
            Personal Note <span className="font-medium normal-case tracking-normal text-slate-300">(optional - shown on their invite card)</span>
          </label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Join my mystery nights! I promise you'll love it..."
          />
        </div>

        {/* Primary Option: Copy Shareable Link to Text */}
        <div className="p-4 rounded-2xl border-2 mb-6" style={{ borderColor: copiedLink ? '#10b981' : 'rgba(254,4,198,0.22)', background: copiedLink ? 'rgba(16,185,129,0.05)' : 'rgba(254,4,198,0.03)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: copiedLink ? '#059669' : '#fe04c6' }}>
              Fastest · Text or DM Link
            </span>
            <span className="text-[11px] font-bold text-slate-400">No email needed</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={loadingLink}
              className="flex-1 py-3.5 px-4 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              style={{ background: copiedLink ? '#10b981' : '#fe04c6' }}
            >
              {loadingLink ? (
                'Creating Link...'
              ) : copiedLink ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  Link Copied! Ready to Text
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  {sharingGuest ? `Copy Invite Link for ${sharingGuest.name}` : 'Copy Invite Link'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              disabled={loadingLink}
              className="px-3.5 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm transition-all flex items-center justify-center"
              title="Share via Messages / WhatsApp"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>
          </div>

          {shareUrl && (
            <div className="mt-3 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onClick={e => (e.target as HTMLInputElement).select()}
                className="w-full text-xs font-mono text-slate-600 bg-transparent outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-[11px] font-black px-2.5 py-1 rounded-lg flex-shrink-0 transition-colors"
                style={{ background: 'rgba(254,4,198,0.1)', color: '#fe04c6' }}
              >
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}

          <p className="text-[11px] text-slate-500 font-medium mt-2.5 leading-relaxed">
            Paste this link in iMessage, WhatsApp, or SMS. When {targetName} opens it, they can create their login and customize their avatar in one step.
          </p>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-5">
          <div className="border-t border-slate-100 w-full" />
          <span className="bg-white px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 flex-shrink-0">
            Or send by email
          </span>
          <div className="border-t border-slate-100 w-full" />
        </div>

        {/* Secondary Option: Email Invite */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Friend's Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="friend@email.com"
                onKeyDown={e => e.key === 'Enter' && handleSendEmail()}
              />
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={loadingEmail}
                className="px-5 py-3 rounded-xl text-sm font-black text-white bg-slate-900 hover:bg-slate-800 transition-all disabled:opacity-50 flex-shrink-0"
              >
                {loadingEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---
export default function GuestsClient({ initialGuests, linkedGuests: initialLinked, pendingInvites: initialPending, locale }: GuestsClientProps) {
  const [guests, setGuests] = useState<ManualGuest[]>(initialGuests);
  const [linkedGuests, setLinkedGuests] = useState<LinkedGuest[]>(initialLinked);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(initialPending);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<ManualGuest | null>(null);
  const [sharingGuest, setSharingGuest] = useState<ManualGuest | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generatingAvatars, setGeneratingAvatars] = useState<Set<string>>(new Set());

  const handleSaveGuest = async (newGuest: any) => {
    setError(null);
    const guestPayload = {
      name: newGuest.name,
      email: newGuest.email,
      gender: newGuest.gender,
      eye_color: newGuest.eyeColor,
      height: newGuest.height,
      ethnicity: newGuest.ethnicity,
      avatar_url: newGuest.avatarUrl,
      traits: newGuest.traits,
      bio: newGuest.bio,
    };

    let result;
    if (editingGuest) {
      result = await updateGuestAction(editingGuest.id, guestPayload);
    } else {
      result = await saveGuestAction(guestPayload);
    }

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.guest) {
      const savedGuest = result.guest as ManualGuest;
      if (editingGuest) {
        setGuests(prev => prev.map(g => g.id === editingGuest.id ? savedGuest : g));
      } else {
        setGuests(prev => [savedGuest, ...prev]);
      }

      // Background generation of avatar
      setGeneratingAvatars(prev => new Set(prev).add(savedGuest.id));
      import('@/app/actions/ai-guests').then(({ generateGuestAvatarAction }) => {
        generateGuestAvatarAction(savedGuest.id, guestPayload)
          .then((res) => {
            setGuests(prev => prev.map(g => g.id === savedGuest.id ? { ...g, avatar_url: res.publicUrl } : g));
          })
          .catch(err => console.error('Failed to generate guest avatar:', err))
          .finally(() => {
            setGeneratingAvatars(prev => {
              const newSet = new Set(prev);
              newSet.delete(savedGuest.id);
              return newSet;
            });
          });
      });
    }
  };
  const handleInviteSent = (invite: PendingInvite) => {
    setPendingInvites(prev => {
      const filtered = prev.filter(i => i.id !== invite.id && (!invite.manual_guest_id || i.manual_guest_id !== invite.manual_guest_id));
      return [invite, ...filtered];
    });
  };

  const handleCancelInvite = async (id: string) => {
    await cancelInvitation(id);
    setPendingInvites(pendingInvites.filter(i => i.id !== id));
  };

  const handleUnlink = async (connectionId: string) => {
    await removeGuestConnection(connectionId);
    setLinkedGuests(linkedGuests.filter(g => g.connectionId !== connectionId));
  };

  const handleRemoveManualGuest = async (id: string) => {
    const result = await removeGuestAction(id);
    if (!result.error) {
      setGuests(guests.filter(g => g.id !== id));
    } else {
      setError(result.error);
    }
  };

  const totalCount = guests.length + linkedGuests.length + pendingInvites.length;
  const isEmpty = totalCount === 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">My Guests</h1>
          <p className="text-slate-500 font-medium text-lg">
            Save your crew for quick casting, or invite them to create their own profile.
          </p>
          <div className="mt-3">
            <Link href={`/${locale}/account/profile`} className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors hover:opacity-80" style={{ color: '#fe04c6' }}>
              Create your own profile/character <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold border-2 transition-all"
            style={{ borderColor: '#fe04c6', color: '#fe04c6' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Invite Guest
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Guest
          </button>
        </div>
      </div>

      {isEmpty ? (
        /* Empty state */
        <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-16 md:p-24 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8 text-slate-300" style={{ background: '#f9f9f9' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-3">No guests yet</h3>
          <p className="text-slate-500 font-medium max-w-sm mb-10">
            Add guests manually or invite friends to create their own profile, their details will automatically appear here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-8 py-4 rounded-full font-black text-sm border-2 transition-all"
              style={{ borderColor: '#fe04c6', color: '#fe04c6' }}
            >
              Invite a Friend
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-8 py-4 rounded-full font-black text-sm text-white transition-all"
              style={{ background: '#fe04c6' }}
            >
              Add Guest Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Linked guests */}
          {linkedGuests.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Linked Accounts</h2>
                <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(254,4,198,0.1)', color: '#fe04c6' }}>{linkedGuests.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {linkedGuests.map(g => (
                  <LinkedGuestCard key={g.id} guest={g} onUnlink={() => handleUnlink(g.connectionId)} />
                ))}
              </div>
            </section>
          )}

          {/* Pending standalone invites (not attached to a manual guest) */}
          {pendingInvites.filter(i => !i.manual_guest_id).length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Standalone Invites</h2>
                <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#d97706' }}>{pendingInvites.filter(i => !i.manual_guest_id).length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingInvites.filter(i => !i.manual_guest_id).map(invite => (
                  <PendingCard key={invite.id} invite={invite} locale={locale} onCancel={() => handleCancelInvite(invite.id)} />
                ))}
              </div>
            </section>
          )}

          {/* Manual guests */}
          {guests.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Saved Guests</h2>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{guests.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guests.map(g => {
                  const pendingInvite = pendingInvites.find(inv => inv.manual_guest_id === g.id);
                  return (
                    <GuestCard 
                      key={g.id} 
                      guest={g} 
                      locale={locale}
                      pendingInvite={pendingInvite}
                      onCancelInvite={pendingInvite ? () => handleCancelInvite(pendingInvite.id) : undefined}
                      onRemove={() => handleRemoveManualGuest(g.id)} 
                      onEdit={() => setEditingGuest(g)}
                      onShare={() => {
                        setSharingGuest(g);
                        setIsInviteModalOpen(true);
                      }}
                      isGenerating={generatingAvatars.has(g.id)}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <GuestModal 
        isOpen={isAddModalOpen || editingGuest !== null} 
        onClose={() => { setIsAddModalOpen(false); setEditingGuest(null); }} 
        onSave={handleSaveGuest}
        onDelete={(id) => {
          handleRemoveManualGuest(id);
          setIsAddModalOpen(false);
          setEditingGuest(null);
        }}
        initialData={editingGuest}
      />
      <InviteModal 
        isOpen={isInviteModalOpen} 
        onClose={() => { setIsInviteModalOpen(false); setSharingGuest(null); }} 
        onSent={handleInviteSent} 
        sharingGuest={sharingGuest}
        existingInvite={sharingGuest ? pendingInvites.find(inv => inv.manual_guest_id === sharingGuest.id) : undefined}
        locale={locale}
      />
    </div>
  );
}
