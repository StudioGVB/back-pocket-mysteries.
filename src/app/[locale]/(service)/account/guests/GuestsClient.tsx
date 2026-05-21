'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GuestModal } from '@/components/account/GuestModal';
import { sendGuestInvitation, cancelInvitation, removeGuestConnection } from '@/app/actions/guest-invitations';
import { saveGuestAction } from '@/app/actions/guests';
import { buildAvatarUrl } from '@/components/account/AvatarBuilder';

interface ManualGuest {
  id: string;
  name: string;
  gender?: string | null;
  avatar_url?: string | null;
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
  personal_note?: string | null;
  created_at: string;
  expires_at: string;
}

interface GuestsClientProps {
  initialGuests: ManualGuest[];
  linkedGuests: LinkedGuest[];
  pendingInvites: PendingInvite[];
  locale: string;
}

function GuestCard({ guest, onRemove }: { guest: ManualGuest; onRemove?: () => void }) {
  const initials = guest.name.charAt(0).toUpperCase();
  const defaultAvatar = buildAvatarUrl({
    seed: guest.name,
    top: guest.gender === 'Masculine' ? 'shortFlat' : 'longButNotTooLong',
    hairColor: '282828',
    skinColor: 'ffe0bd',
    accessories: 'none'
  }, guest.name);
  const displayAvatar = guest.avatar_url || defaultAvatar;

  return (
    <div className="bg-white border border-slate-100 p-6 rounded-[2rem] flex flex-col group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
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
          <div>
            <h3 className="text-lg font-bold text-slate-900">{guest.name}</h3>
            <p className="text-xs font-bold text-slate-400">{guest.gender || 'Unspecified'}</p>
          </div>
        </div>
        {onRemove && (
          <button onClick={onRemove} className="text-slate-300 hover:text-red-400 transition-colors p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
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
    <div className="bg-white border border-slate-100 p-6 rounded-[2rem] flex flex-col group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden">
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
  );
}

function PendingCard({ invite, onCancel }: { invite: PendingInvite; onCancel: () => void }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(invite.expires_at).getTime() - Date.now()) / 86400000));
  return (
    <div className="bg-white border-2 border-dashed border-amber-200 p-6 rounded-[2rem] flex flex-col" style={{ background: 'rgba(251,191,36,0.03)' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.1)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', color: '#d97706' }}>
          Pending · {daysLeft}d left
        </span>
      </div>
      <p className="font-black text-slate-900 text-sm truncate mb-1">{invite.invite_email}</p>
      <p className="text-xs text-slate-400 font-medium mb-4">Invite sent — waiting for them to join.</p>
      <button onClick={onCancel} className="text-xs font-bold text-slate-300 hover:text-red-400 transition-colors text-left mt-auto">
        Cancel invite
      </button>
    </div>
  );
}

// --- Invite Modal ---
function InviteModal({ isOpen, onClose, onSent }: { isOpen: boolean; onClose: () => void; onSent: (invite: PendingInvite) => void }) {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!email.trim()) { setError('Please enter an email address.'); return; }
    setLoading(true);
    setError('');
    const result = await sendGuestInvitation(email.trim(), note.trim() || undefined);
    setLoading(false);
    if (result.error) { setError(result.error); }
    else {
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      onSent({ id: result.inviteId!, invite_email: email.trim(), personal_note: note || null, created_at: new Date().toISOString(), expires_at: expiresAt });
      setEmail(''); setNote(''); onClose();
    }
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 outline-none transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Invite a Guest</h2>
            <p className="text-sm text-slate-400 font-medium mt-1">They'll create their own profile and link to your roster.</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Friend's Email</label>
            <input
              type="email"
              className={inputClass}
              style={{ focusBorderColor: '#fe04c6' } as any}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="friend@email.com"
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Personal Note <span className="font-medium normal-case tracking-normal text-slate-300">(optional)</span></label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Join my mystery nights! I promise you'll love it..."
            />
          </div>

          {error && <p className="text-red-500 text-sm font-bold">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={loading}
              className="flex-1 py-3 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50"
              style={{ background: '#fe04c6' }}
            >
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(254,4,198,0.05)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fe04c6" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Your friend will receive a branded invite email. They'll create their own account and their profile will appear on your guest list. Invites expire after 7 days.
          </p>
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
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveGuest = async (newGuest: any) => {
    setError(null);
    const result = await saveGuestAction({
      name: newGuest.name,
      email: newGuest.email,
      gender: newGuest.gender,
      eye_color: newGuest.eyeColor,
      height: newGuest.height,
      avatar_url: newGuest.avatarUrl,
      traits: newGuest.traits,
      bio: newGuest.bio,
    });

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.guest) {
      setGuests([result.guest as ManualGuest, ...guests]);
    }
  };
  const handleInviteSent = (invite: PendingInvite) => setPendingInvites([invite, ...pendingInvites]);

  const handleCancelInvite = async (id: string) => {
    await cancelInvitation(id);
    setPendingInvites(pendingInvites.filter(i => i.id !== id));
  };

  const handleUnlink = async (connectionId: string) => {
    await removeGuestConnection(connectionId);
    setLinkedGuests(linkedGuests.filter(g => g.connectionId !== connectionId));
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
            Save your crew for quick casting — or invite them to create their own profile.
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
            Add guests manually or invite friends to create their own profile — their details will automatically appear here.
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

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Awaiting Response</h2>
                <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#d97706' }}>{pendingInvites.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingInvites.map(invite => (
                  <PendingCard key={invite.id} invite={invite} onCancel={() => handleCancelInvite(invite.id)} />
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
                {guests.map(g => <GuestCard key={g.id} guest={g} />)}
              </div>
            </section>
          )}
        </div>
      )}

      <GuestModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={handleSaveGuest} />
      <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onSent={handleInviteSent} />
    </div>
  );
}
