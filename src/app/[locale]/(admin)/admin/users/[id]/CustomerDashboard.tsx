'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/utils/date';
import {
  adminUpdateProfile,
  adminAddGuest,
  adminUpdateGuest,
  adminDeleteGuest,
  adminManageMonthlyMembership,
  adminGiftMystery,
  adminResetMysteryProgress,
  adminRevokeMystery,
  adminRefundOrder,
  adminCreateCustomerPromo,
  adminDeleteCustomerPromo,
  adminAdjustCreditBalance,
  adminUpdateAiQuota,
  adminAddNote,
  adminDeleteNote,
  adminToggleTag,
  adminToggleProvidedReview,
  adminToggleSuspendAccount,
  adminSendPasswordReset,
  CustomerCrmRecord,
} from '@/app/actions/admin-users';
import { CustomSelect } from '@/components/ui/CustomSelect';

const AVAILABLE_TAGS = [
  'VIP',
  'Influencer',
  'Press',
  'Repeat Host',
  'Corporate',
  'Beta Tester',
  'Flagged',
];

export function CustomerDashboard({
  profile,
  orders,
  mysteries,
  guests,
  crm: initialCrm,
  catalogMysteries = [],
  aiUsage = { generationsCount: 0, totalTokens: 0, estimatedCost: 0 },
}: {
  profile: any;
  orders: any[];
  mysteries: any[];
  guests: any[];
  crm: CustomerCrmRecord;
  catalogMysteries?: any[];
  aiUsage?: { generationsCount: number; totalTokens: number; estimatedCost: number };
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'perks' | 'mysteries' | 'orders' | 'guests' | 'personal'
  >('perks');
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // AI Avatar Photo rendering logic
  const AIPhotoRenderer = ({ avatarUrl, name }: { avatarUrl: string; name: string }) => {
    const [photo, setPhoto] = useState<string | null>(null);
    const [loadingPhoto, setLoadingPhoto] = useState(true);

    React.useEffect(() => {
      let isMounted = true;
      const fetchPhoto = async () => {
        try {
          const urlObj = new URL(avatarUrl);
          const aiUrl = urlObj.searchParams.get('aiPhotoUrl');
          const aiHash = urlObj.searchParams.get('aiPhotoHash');

          if (aiUrl) {
            if (isMounted) setPhoto(decodeURIComponent(aiUrl));
          } else if (aiHash) {
            const res = await fetch(`/api/admin/get-avatar-by-hash?hash=${aiHash}`).catch(
              () => null
            );
            if (res && res.ok) {
              const data = await res.json();
              if (isMounted) setPhoto(data.url);
            }
          } else if (avatarUrl.startsWith('data:')) {
            if (isMounted) setPhoto(avatarUrl);
          }
        } catch {
          if (avatarUrl.startsWith('data:')) {
            if (isMounted) setPhoto(avatarUrl);
          }
        }
        if (isMounted) setLoadingPhoto(false);
      };
      fetchPhoto();
      return () => {
        isMounted = false;
      };
    }, [avatarUrl]);

    if (photo) {
      /* eslint-disable-next-line @next/next/no-img-element */
      return <img src={photo} alt={name} className="absolute inset-0 w-full h-full object-cover" />;
    }

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-4 opacity-50"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <p className="font-bold text-sm">{loadingPhoto ? 'Loading...' : 'No Photo Generated'}</p>
      </div>
    );
  };

  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedCount, setRegeneratedCount] = useState(0);
  const [currentlyGeneratingId, setCurrentlyGeneratingId] = useState<string | null>(null);

  // Edit Player Details states
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [detailBio, setDetailBio] = useState('');
  const [detailFunFacts, setDetailFunFacts] = useState('');
  const [detailPrefs, setDetailPrefs] = useState<string[]>([]);
  const [detailDiet, setDetailDiet] = useState<string[]>([]);
  const [prefInput, setPrefInput] = useState('');
  const [dietInput, setDietInput] = useState('');

  // Add Guest states
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [addGuestName, setAddGuestName] = useState('');
  const [addGuestEmail, setAddGuestEmail] = useState('');
  const [addGuestGender, setAddGuestGender] = useState('adaptable');
  const [addGuestEyeColor, setAddGuestEyeColor] = useState('');
  const [addGuestHeight, setAddGuestHeight] = useState('');
  const [addGuestEthnicity, setAddGuestEthnicity] = useState('');
  const [addGuestTraits, setAddGuestTraits] = useState<string[]>([]);
  const [addGuestBio, setAddGuestBio] = useState('');
  const [addTraitInput, setAddTraitInput] = useState('');

  // Edit Guest states
  const [isEditingGuest, setIsEditingGuest] = useState(false);
  const [editGuestName, setEditGuestName] = useState('');
  const [editGuestEmail, setEditGuestEmail] = useState('');
  const [editGuestGender, setEditGuestGender] = useState('adaptable');
  const [editGuestEyeColor, setEditGuestEyeColor] = useState('');
  const [editGuestHeight, setEditGuestHeight] = useState('');
  const [editGuestEthnicity, setEditGuestEthnicity] = useState('');
  const [editGuestTraits, setEditGuestTraits] = useState<string[]>([]);
  const [editGuestBio, setEditGuestBio] = useState('');
  const [editTraitInput, setEditTraitInput] = useState('');

  // --- Admin Modals & CRM States ---
  // 1. Gift Mystery Modal
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [selectedGiftMysteryId, setSelectedGiftMysteryId] = useState(
    catalogMysteries[0]?.id || ''
  );
  const [giftNote, setGiftNote] = useState('');

  // 2. Refund Order Modal
  const [refundOrderTarget, setRefundOrderTarget] = useState<any | null>(null);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundCustomUsd, setRefundCustomUsd] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [revokeMysteryOnRefund, setRevokeMysteryOnRefund] = useState(false);

  // 3. Create Promo Modal
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoType, setPromoType] = useState<'percent' | 'fixed' | 'free_mystery'>('percent');
  const [promoValue, setPromoValue] = useState('25');
  const [promoNote, setPromoNote] = useState('');
  const [promoExpiry, setPromoExpiry] = useState('');

  // 4. Monthly Membership Rate Input
  const [monthlyRateInput, setMonthlyRateInput] = useState(
    String(initialCrm?.membership?.monthlyRateUsd ?? 19)
  );

  // 5. Private Note Input
  const [newNoteText, setNewNoteText] = useState('');

  // 6. Custom Credit Input
  const [customCreditDelta, setCustomCreditDelta] = useState('');

  // Initializers
  const openEditDetails = () => {
    setDetailBio(profile.bio || '');
    setDetailFunFacts(profile.fun_facts || '');
    setDetailPrefs(profile.character_preferences || []);
    setDetailDiet(profile.dietary_needs || []);
    setPrefInput('');
    setDietInput('');
    setIsEditDetailsOpen(true);
  };

  const openAddGuest = () => {
    setAddGuestName('');
    setAddGuestEmail('');
    setAddGuestGender('adaptable');
    setAddGuestEyeColor('');
    setAddGuestHeight('');
    setAddGuestEthnicity('');
    setAddGuestTraits([]);
    setAddGuestBio('');
    setAddTraitInput('');
    setIsAddGuestOpen(true);
  };

  const startEditingGuest = (g: any) => {
    setEditGuestName(g.name || '');
    setEditGuestEmail(g.email || '');
    setEditGuestGender(g.gender || 'adaptable');
    setEditGuestEyeColor(g.eye_color || '');
    setEditGuestHeight(g.height || '');
    setEditGuestEthnicity(g.ethnicity || '');
    setEditGuestTraits(g.traits || []);
    setEditGuestBio(g.bio || '');
    setEditTraitInput('');
    setIsEditingGuest(true);
  };

  const openPromoModal = () => {
    const cleanFirst = (profile.full_name || 'VIP')
      .split(' ')[0]
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const rand = Math.floor(10 + Math.random() * 90);
    setPromoCode(`${cleanFirst}-${rand}`);
    setPromoType('percent');
    setPromoValue('25');
    setPromoNote('');
    setPromoExpiry('');
    setIsPromoModalOpen(true);
  };

  const openRefundModal = (order: any) => {
    setRefundOrderTarget(order);
    setRefundType('full');
    const grossUsd = ((order.amount || 0) / 100).toFixed(2);
    setRefundCustomUsd(grossUsd);
    setRefundReason('');
    setRevokeMysteryOnRefund(false);
  };

  // Submit Handlers
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await adminUpdateProfile(profile.id, {
      bio: detailBio,
      fun_facts: detailFunFacts,
      character_preferences: detailPrefs,
      dietary_needs: detailDiet,
    });
    setLoading(false);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      setIsEditDetailsOpen(false);
      showToast('Player details saved');
      router.refresh();
    }
  };

  const handleAddGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addGuestName.trim()) {
      showToast('Guest name is required', 'error');
      return;
    }
    setLoading(true);
    const res = await adminAddGuest(profile.id, {
      name: addGuestName,
      email: addGuestEmail || undefined,
      gender: addGuestGender || undefined,
      eye_color: addGuestEyeColor || undefined,
      height: addGuestHeight || undefined,
      ethnicity: addGuestEthnicity || undefined,
      traits: addGuestTraits,
      bio: addGuestBio || undefined,
    });
    setLoading(false);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      setIsAddGuestOpen(false);
      showToast('Guest added to roster');
      router.refresh();
    }
  };

  const handleEditGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGuestName.trim()) {
      showToast('Guest name is required', 'error');
      return;
    }
    setLoading(true);
    const res = await adminUpdateGuest(selectedGuest.id, {
      name: editGuestName,
      email: editGuestEmail || undefined,
      gender: editGuestGender || undefined,
      eye_color: editGuestEyeColor || undefined,
      height: editGuestHeight || undefined,
      ethnicity: editGuestEthnicity || undefined,
      traits: editGuestTraits,
      bio: editGuestBio || undefined,
    });
    setLoading(false);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      setIsEditingGuest(false);
      setSelectedGuest(null);
      showToast('Guest updated');
      router.refresh();
    }
  };

  const handleDeleteGuest = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedGuest.name}? This action cannot be undone.`
      )
    ) {
      return;
    }
    setLoading(true);
    const res = await adminDeleteGuest(selectedGuest.id);
    setLoading(false);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      setSelectedGuest(null);
      showToast('Guest deleted');
      router.refresh();
    }
  };

  const handleRegenerateAll = async () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    setRegeneratedCount(0);

    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      setCurrentlyGeneratingId(guest.id);

      try {
        const res = await fetch(`/api/admin/generate-avatar-single`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestId: guest.id, userId: profile.id }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to generate avatar for guest ${guest.id}`);
        }
      } catch (e: any) {
        console.error(`Error generating avatar for guest ${guest.id}:`, e);
        showToast(
          `Error generating avatar for ${guest.name || guest.id}: ${e.message}`,
          'error'
        );
        setCurrentlyGeneratingId(null);
        setIsRegenerating(false);
        return;
      }

      setRegeneratedCount(prev => prev + 1);
      await new Promise(r => setTimeout(r, 4000));
    }

    setCurrentlyGeneratingId(null);
    setIsRegenerating(false);
    window.location.reload();
  };

  // --- CRM & Admin Handlers ---

  const handleMembershipAction = async (action: 'activate' | 'deactivate' | 'extend_month') => {
    setLoading(true);
    const rate = parseFloat(monthlyRateInput) || 19;
    const res = await adminManageMonthlyMembership(profile.id, action, rate);
    setLoading(false);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(
        action === 'activate'
          ? 'Monthly Membership set to IN (Active)'
          : action === 'deactivate'
          ? 'Monthly Membership set to OUT (Inactive)'
          : 'Extended Monthly Membership by +1 Month'
      );
      router.refresh();
    }
  };

  const handleGiftMysterySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGiftMysteryId) {
      showToast('Select a mystery to gift', 'error');
      return;
    }
    setLoading(true);
    const res = await adminGiftMystery(profile.id, {
      sourceMysteryId: selectedGiftMysteryId,
      note: giftNote.trim() || undefined,
    });
    setLoading(false);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      setIsGiftModalOpen(false);
      setGiftNote('');
      showToast(`Gifted "${res.mystery?.title}" to ${profile.full_name || 'customer'}!`);
      router.refresh();
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundOrderTarget) return;

    const origCents = refundOrderTarget.amount || 0;
    const refundCents =
      refundType === 'full'
        ? origCents
        : Math.min(origCents, Math.max(1, Math.round((parseFloat(refundCustomUsd) || 0) * 100)));

    setLoading(true);
    const res = await adminRefundOrder(profile.id, refundOrderTarget.id, {
      refundType,
      refundAmountCents: refundCents,
      originalAmountCents: origCents,
      reason: refundReason.trim() || undefined,
      revokeMysteryAccess: revokeMysteryOnRefund,
      mysteryId: refundOrderTarget.mystery_id,
      mysteryTitle: refundOrderTarget.mystery?.title,
    });
    setLoading(false);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      setRefundOrderTarget(null);
      showToast(`Refund of $${(refundCents / 100).toFixed(2)} processed.`);
      router.refresh();
    }
  };

  const handleCreatePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await adminCreateCustomerPromo(profile.id, {
      code: promoCode,
      discountType: promoType,
      discountValue: promoType === 'free_mystery' ? 100 : parseFloat(promoValue) || 0,
      note: promoNote.trim() || undefined,
      expiresAt: promoExpiry || null,
    });
    setLoading(false);
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      setIsPromoModalOpen(false);
      showToast(`Promo code ${promoCode.toUpperCase()} created!`);
      router.refresh();
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    setLoading(true);
    const res = await adminDeleteCustomerPromo(profile.id, promoId);
    setLoading(false);
    if (res.error) showToast(res.error, 'error');
    else {
      showToast('Promo code revoked');
      router.refresh();
    }
  };

  const handleAdjustCredit = async (deltaUsd: number, reason?: string) => {
    setLoading(true);
    const res = await adminAdjustCreditBalance(profile.id, deltaUsd, reason);
    setLoading(false);
    if (res.error) showToast(res.error, 'error');
    else {
      showToast(
        deltaUsd >= 0
          ? `Added $${deltaUsd.toFixed(2)} store credit`
          : `Deducted $${Math.abs(deltaUsd).toFixed(2)} store credit`
      );
      router.refresh();
    }
  };

  const handleAiQuotaAction = async (update: Parameters<typeof adminUpdateAiQuota>[1]) => {
    setLoading(true);
    const res = await adminUpdateAiQuota(profile.id, update);
    setLoading(false);
    if (res.error) showToast(res.error, 'error');
    else {
      showToast('Updated customer AI quota settings');
      router.refresh();
    }
  };

  const handleResetMystery = async (mysteryId: string, title: string) => {
    if (!confirm(`Reset "${title}" back to Round 1? Guests and characters will be preserved.`))
      return;
    setLoading(true);
    const res = await adminResetMysteryProgress(profile.id, mysteryId, title);
    setLoading(false);
    if (res.error) showToast(res.error, 'error');
    else {
      showToast(`Reset "${title}" to Round 1`);
      router.refresh();
    }
  };

  const handleRevokeMystery = async (mysteryId: string, title: string) => {
    if (
      !confirm(
        `Are you sure you want to revoke & delete "${title}" from this customer's account?`
      )
    )
      return;
    setLoading(true);
    const res = await adminRevokeMystery(profile.id, mysteryId, title);
    setLoading(false);
    if (res.error) showToast(res.error, 'error');
    else {
      showToast(`Removed "${title}" from customer account`);
      router.refresh();
    }
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setLoading(true);
    const res = await adminAddNote(profile.id, newNoteText);
    setLoading(false);
    if (res.error) showToast(res.error, 'error');
    else {
      setNewNoteText('');
      showToast('Admin note added');
      router.refresh();
    }
  };

  const handleSendPasswordReset = async () => {
    if (!profile.email) {
      showToast('No email on file for this customer', 'error');
      return;
    }
    if (!confirm(`Send a password reset / login recovery email to ${profile.email}?`)) return;
    setLoading(true);
    const res = await adminSendPasswordReset(profile.id, profile.email);
    setLoading(false);
    if (res.error) showToast(res.error, 'error');
    else {
      showToast(`Password reset email sent to ${profile.email}`);
      router.refresh();
    }
  };

  const handleToggleSuspend = async () => {
    const nextSuspended = !initialCrm.accountSuspended;
    let reason = '';
    if (nextSuspended) {
      const promptReason = prompt(
        'Enter reason for suspending this account (optional):',
        'Chargeback / Terms violation'
      );
      if (promptReason === null) return;
      reason = promptReason;
    }
    setLoading(true);
    const res = await adminToggleSuspendAccount(profile.id, nextSuspended, reason);
    setLoading(false);
    if (res.error) showToast(res.error, 'error');
    else {
      showToast(nextSuspended ? 'Account suspended' : 'Account reactivated');
      router.refresh();
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-brand-dark outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/10 transition-all';
  const labelClass =
    'block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1';

  const isMemberIn = initialCrm?.membership?.isActive ?? false;

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl border text-xs font-black uppercase tracking-widest flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 ${
            toastMsg.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-brand-dark text-white border-brand-pink/40'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              toastMsg.type === 'error' ? 'bg-white' : 'bg-brand-pink'
            }`}
          />
          {toastMsg.text}
        </div>
      )}

      {/* Quick Admin Command Bar */}
      <div className="bg-brand-dark text-white rounded-[28px] p-5 px-7 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-pink/20 text-brand-pink flex items-center justify-center font-black text-base">
            ⚡
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
              Admin Controls
            </p>
            <p className="text-xs font-bold text-gray-300">
              Gift mysteries, toggle monthly membership, issue promos & refunds
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsGiftModalOpen(true)}
            className="px-4 py-2.5 bg-brand-pink hover:bg-brand-pink/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm flex items-center gap-2"
          >
            <span>🎁</span> Gift Free Mystery
          </button>

          <button
            onClick={() => handleMembershipAction(isMemberIn ? 'deactivate' : 'activate')}
            disabled={loading}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border flex items-center gap-2 ${
              isMemberIn
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30'
                : 'bg-white/10 text-white border-white/10 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30'
            }`}
          >
            <span>👑</span>
            {isMemberIn ? 'Monthly Member: IN (Click to Set OUT)' : 'Set Monthly Member: IN'}
          </button>

          <button
            onClick={openPromoModal}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
          >
            <span>🎟️</span> Issue Promo / Discount
          </button>

          <button
            onClick={handleSendPasswordReset}
            disabled={loading}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
          >
            <span>🔑</span> Reset Password
          </button>

          <button
            onClick={handleToggleSuspend}
            disabled={loading}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
              initialCrm.accountSuspended
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white'
            }`}
          >
            <span>{initialCrm.accountSuspended ? '✅' : '🚫'}</span>
            {initialCrm.accountSuspended ? 'Unsuspend' : 'Suspend'}
          </button>
        </div>
      </div>

      {/* Main Tabbed Dashboard Card */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        {/* Tabs Navigation */}
        <div className="flex flex-wrap border-b border-gray-100">
          {[
            { id: 'perks', label: 'Membership, Promos & CRM' },
            { id: 'mysteries', label: `Mysteries (${mysteries.length})` },
            { id: 'orders', label: `Orders & Refunds (${orders.length})` },
            { id: 'guests', label: `Guest Roster (${guests.length})` },
            { id: 'personal', label: 'Player Details' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-brand-pink text-brand-dark'
                  : 'border-transparent text-gray-400 hover:text-brand-pink hover:bg-gray-50/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {/* =================================================================== */}
          {/* TAB 1: MEMBERSHIP, PROMOS, AI QUOTA & CRM NOTES                     */}
          {/* =================================================================== */}
          {activeTab === 'perks' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Binary Monthly Membership Card */}
                <div className="rounded-3xl border border-gray-100 p-7 bg-gray-50/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Monthly Membership
                        </p>
                        <h3 className="text-2xl font-black text-brand-dark tracking-tight uppercase mt-0.5">
                          Status:{' '}
                          <span className={isMemberIn ? 'text-emerald-600' : 'text-gray-400'}>
                            {isMemberIn ? 'IN (Active Monthly)' : 'OUT (Inactive)'}
                          </span>
                        </h3>
                      </div>
                      <span
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          isMemberIn
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {isMemberIn ? 'IN' : 'OUT'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 font-medium mb-6">
                      Membership is binary on a monthly cycle. Toggle the customer IN to grant active
                      monthly member status, or OUT to end their monthly membership.
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-100">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                          Monthly Rate (USD)
                        </p>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-black text-gray-400">$</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={monthlyRateInput}
                            onChange={e => setMonthlyRateInput(e.target.value)}
                            className="w-20 text-lg font-black text-brand-dark bg-transparent outline-none border-b border-gray-200 focus:border-brand-pink"
                          />
                          <span className="text-xs font-bold text-gray-400">/mo</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                          Next Monthly Renewal
                        </p>
                        <p className="text-sm font-black text-brand-dark">
                          {isMemberIn && initialCrm.membership.renewsAt
                            ? formatDate(initialCrm.membership.renewsAt)
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {!isMemberIn ? (
                      <button
                        onClick={() => handleMembershipAction('activate')}
                        disabled={loading}
                        className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                      >
                        Set Membership IN (Activate Month)
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleMembershipAction('extend_month')}
                          disabled={loading}
                          className="flex-1 py-3.5 bg-brand-dark hover:bg-brand-pink text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                        >
                          +1 Month Extension
                        </button>
                        <button
                          onClick={() => handleMembershipAction('deactivate')}
                          disabled={loading}
                          className="flex-1 py-3.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                        >
                          Set Membership OUT
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. AI Generation Quota & Cost Protection Card */}
                <div className="rounded-3xl border border-gray-100 p-7 bg-gray-50/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Google Gemini / Imagen & ElevenLabs
                        </p>
                        <h3 className="text-2xl font-black text-brand-dark tracking-tight uppercase mt-0.5">
                          AI Quota & <span className="text-brand-pink italic">Spend Control</span>
                        </h3>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          initialCrm.aiQuota.aiFrozen
                            ? 'bg-rose-100 text-rose-700'
                            : initialCrm.aiQuota.unlimitedAi
                            ? 'bg-brand-pink/10 text-brand-pink'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {initialCrm.aiQuota.aiFrozen
                          ? 'AI Frozen'
                          : initialCrm.aiQuota.unlimitedAi
                          ? 'Unlimited'
                          : `${initialCrm.aiQuota.baseImageLimit + initialCrm.aiQuota.bonusImageCredits} Image Cap`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-6 bg-white p-4 rounded-2xl border border-gray-100">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                          Actual AI Spend
                        </p>
                        <p className="text-lg font-black text-brand-pink">
                          ${aiUsage.estimatedCost.toFixed(3)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                          Generations
                        </p>
                        <p className="text-lg font-black text-brand-dark">
                          {aiUsage.generationsCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                          Bonus Credits
                        </p>
                        <p className="text-lg font-black text-emerald-600">
                          +{initialCrm.aiQuota.bonusImageCredits}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleAiQuotaAction({ addBonusCredits: 10 })}
                        disabled={loading}
                        className="flex-1 py-2.5 bg-white hover:bg-brand-dark hover:text-white text-brand-dark border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        +10 Image Credits
                      </button>
                      <button
                        onClick={() => handleAiQuotaAction({ addBonusCredits: 25 })}
                        disabled={loading}
                        className="flex-1 py-2.5 bg-white hover:bg-brand-dark hover:text-white text-brand-dark border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        +25 Image Credits
                      </button>
                      {initialCrm.aiQuota.bonusImageCredits > 0 && (
                        <button
                          onClick={() => handleAiQuotaAction({ resetBonusCredits: true })}
                          disabled={loading}
                          className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Reset Bonus
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleAiQuotaAction({ unlimitedAi: !initialCrm.aiQuota.unlimitedAi })
                        }
                        disabled={loading}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          initialCrm.aiQuota.unlimitedAi
                            ? 'bg-brand-pink text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {initialCrm.aiQuota.unlimitedAi
                          ? '✓ VIP Unlimited AI On'
                          : 'Enable Unlimited AI'}
                      </button>
                      <button
                        onClick={() =>
                          handleAiQuotaAction({ aiFrozen: !initialCrm.aiQuota.aiFrozen })
                        }
                        disabled={loading}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          initialCrm.aiQuota.aiFrozen
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white'
                        }`}
                      >
                        {initialCrm.aiQuota.aiFrozen ? 'Unfreeze AI Access' : '🛑 Freeze AI Access'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Promos, Discounts & Store Credit Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Store Credit Balance */}
                <div className="rounded-3xl border border-gray-100 p-7 bg-gray-50/60 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Account Balance
                    </p>
                    <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight mt-0.5 mb-4">
                      Store <span className="text-brand-pink italic">Credit</span>
                    </h3>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 mb-4 text-center">
                      <p className="text-4xl font-black text-brand-dark">
                        ${(initialCrm.creditBalanceUsd || 0).toFixed(2)}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                        Available towards next mystery
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAdjustCredit(10, 'Admin courtesy credit')}
                        disabled={loading}
                        className="flex-1 py-2.5 bg-white hover:bg-brand-dark hover:text-white text-brand-dark border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        +$10
                      </button>
                      <button
                        onClick={() => handleAdjustCredit(25, 'Admin courtesy credit')}
                        disabled={loading}
                        className="flex-1 py-2.5 bg-white hover:bg-brand-dark hover:text-white text-brand-dark border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        +$25
                      </button>
                      {initialCrm.creditBalanceUsd > 0 && (
                        <button
                          onClick={() =>
                            handleAdjustCredit(
                              -initialCrm.creditBalanceUsd,
                              'Cleared store credit balance'
                            )
                          }
                          disabled={loading}
                          className="px-3 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="1"
                        placeholder="Custom $ amount (e.g. 15)"
                        value={customCreditDelta}
                        onChange={e => setCustomCreditDelta(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-brand-dark outline-none focus:border-brand-pink"
                      />
                      <button
                        onClick={() => {
                          const val = parseFloat(customCreditDelta);
                          if (!isNaN(val) && val !== 0) {
                            handleAdjustCredit(val, 'Custom credit adjustment');
                            setCustomCreditDelta('');
                          }
                        }}
                        disabled={loading}
                        className="px-4 py-2 bg-brand-dark hover:bg-brand-pink text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Personal Promo Codes */}
                <div className="lg:col-span-2 rounded-3xl border border-gray-100 p-7 bg-gray-50/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Customer-Specific Discounts
                        </p>
                        <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight mt-0.5">
                          Personal <span className="text-brand-pink italic">Promo Codes</span>
                        </h3>
                      </div>
                      <button
                        onClick={openPromoModal}
                        className="px-4 py-2.5 bg-brand-dark hover:bg-brand-pink text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                      >
                        + Create Promo Code
                      </button>
                    </div>

                    {initialCrm.promos && initialCrm.promos.length > 0 ? (
                      <div className="space-y-3">
                        {initialCrm.promos.map(promo => (
                          <div
                            key={promo.id}
                            className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-3.5 py-1.5 rounded-xl bg-brand-dark text-white font-mono text-xs font-black tracking-wider">
                                {promo.code}
                              </span>
                              <div>
                                <p className="text-xs font-black text-brand-dark uppercase">
                                  {promo.discountType === 'free_mystery'
                                    ? '100% OFF (Free Mystery)'
                                    : promo.discountType === 'percent'
                                    ? `${promo.discountValue}% OFF`
                                    : `$${promo.discountValue} OFF`}
                                </p>
                                <p className="text-[11px] text-gray-400 font-medium">
                                  {promo.note || 'Personal discount code'}
                                  {promo.expiresAt ? ` • Expires ${formatDate(promo.expiresAt)}` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(promo.code);
                                  showToast(`Copied ${promo.code} to clipboard`);
                                }}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                Copy
                              </button>
                              <button
                                onClick={() => handleDeletePromo(promo.id)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                Revoke
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          No personal promo codes issued yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. CRM Tags, Review Flag & Private Admin Notes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tags & Review Status */}
                <div className="rounded-3xl border border-gray-100 p-7 bg-gray-50/60 space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                      CRM Segmentation
                    </p>
                    <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight mb-4">
                      Customer <span className="text-brand-pink italic">Tags</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_TAGS.map(tag => {
                        const active = initialCrm.tags?.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={async () => {
                              await adminToggleTag(profile.id, tag);
                              router.refresh();
                            }}
                            className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              active
                                ? 'bg-brand-pink text-white shadow-sm'
                                : 'bg-white text-gray-500 border border-gray-200 hover:border-brand-pink/40'
                            }`}
                          >
                            {active ? `✓ ${tag}` : `+ ${tag}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                      Customer Feedback
                    </p>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-brand-dark uppercase">
                          Provided Review
                        </p>
                        <p className="text-[11px] text-gray-400 font-medium">
                          Has this host left a public review?
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await adminToggleProvidedReview(profile.id, !initialCrm.providedReview);
                          router.refresh();
                        }}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          initialCrm.providedReview
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {initialCrm.providedReview ? 'Yes ✓' : 'No'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Private Admin Notes & Audit Timeline */}
                <div className="lg:col-span-2 rounded-3xl border border-gray-100 p-7 bg-gray-50/60 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                      Internal Only (Never Shown to Customer)
                    </p>
                    <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight mb-4">
                      Private Admin Notes & <span className="text-brand-pink italic">Audit Log</span>
                    </h3>

                    <form onSubmit={handleAddNoteSubmit} className="flex gap-2 mb-6">
                      <input
                        type="text"
                        value={newNoteText}
                        onChange={e => setNewNoteText(e.target.value)}
                        placeholder="Add a private note (e.g. 'TikTok creator, gifted Love On The Rocks')..."
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-brand-dark outline-none focus:border-brand-pink"
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-brand-dark hover:bg-brand-pink text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Add Note
                      </button>
                    </form>

                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                      {initialCrm.notes && initialCrm.notes.length > 0 ? (
                        initialCrm.notes.map(note => (
                          <div
                            key={note.id}
                            className="bg-white p-3.5 px-4 rounded-2xl border border-gray-100 flex items-start justify-between gap-4"
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-sm mt-0.5">
                                {note.category === 'gift'
                                  ? '🎁'
                                  : note.category === 'refund'
                                  ? '💸'
                                  : note.category === 'membership'
                                  ? '👑'
                                  : note.category === 'promo'
                                  ? '🎟️'
                                  : note.category === 'security'
                                  ? '🛡️'
                                  : note.category === 'support'
                                  ? '🛠️'
                                  : '📝'}
                              </span>
                              <div>
                                <p className="text-xs font-bold text-brand-dark leading-relaxed">
                                  {note.text}
                                </p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                  {new Date(note.createdAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                await adminDeleteNote(profile.id, note.id);
                                router.refresh();
                              }}
                              className="text-gray-300 hover:text-rose-500 text-xs font-black px-1"
                              title="Delete note"
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 font-bold italic text-center py-8">
                          No admin notes or activity logged yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 2: MYSTERIES CREATED / GIFTED + PARTY TROUBLESHOOTING           */}
          {/* =================================================================== */}
          {activeTab === 'mysteries' && (
            <div>
              <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <p className="text-gray-500 font-medium">
                  Manage this customer&apos;s mysteries, open them in the Builder, or reset party
                  progress.
                </p>
                <button
                  onClick={() => setIsGiftModalOpen(true)}
                  className="px-5 py-2.5 bg-brand-pink hover:bg-brand-dark text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm flex items-center gap-2"
                >
                  <span>🎁</span> Gift Free Mystery
                </button>
              </div>

              {mysteries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mysteries.map((m: any, i: number) => (
                    <div
                      key={m.id || i}
                      className="p-6 rounded-[2rem] border border-gray-100 hover:shadow-xl transition-all bg-gray-50 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              m.status === 'published'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {m.status}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest text-brand-dark">
                              Round {m.current_round || 1}
                            </span>
                            <span className="text-xs font-bold text-gray-400">
                              {m.max_players} Players
                            </span>
                          </div>
                        </div>
                        <h3 className="text-xl font-black text-brand-dark mb-1 line-clamp-2 leading-tight">
                          {m.title}
                        </h3>
                        {m.theme && (
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-2">
                            {m.theme}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 font-medium mb-6">
                          Added {formatDate(m.created_at)}
                        </p>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-gray-200/60">
                        <Link
                          href={`/en/builder/mysteries/${m.id}`}
                          className="w-full py-2.5 bg-brand-dark hover:bg-brand-pink text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          Open in Builder &rarr;
                        </Link>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleResetMystery(m.id, m.title)}
                            disabled={loading}
                            className="flex-1 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            title="Reset party state back to Round 1"
                          >
                            🔄 Reset Round 1
                          </button>
                          <button
                            onClick={() => handleRevokeMystery(m.id, m.title)}
                            disabled={loading}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            title="Revoke and delete this mystery"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-black text-brand-dark mb-2">No mysteries yet</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    This customer hasn&apos;t purchased or created any mysteries yet.
                  </p>
                  <button
                    onClick={() => setIsGiftModalOpen(true)}
                    className="px-6 py-3 bg-brand-pink hover:bg-brand-dark text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    🎁 Gift Their First Mystery
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 3: TRANSACTION HISTORY & REFUNDS                                */}
          {/* =================================================================== */}
          {activeTab === 'orders' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-500 font-medium">
                  Viewing {orders.length} transactions (click Refund to issue a full or partial
                  refund)
                </p>
              </div>

              {orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Date
                        </th>
                        <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Mystery / Item
                        </th>
                        <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Amount
                        </th>
                        <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Status
                        </th>
                        <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o: any, i: number) => {
                        const grossUsd = (o.amount || 0) / 100;
                        const refundedUsd = (o.refundedAmountCents || 0) / 100;
                        const isRefunded = o.status === 'refunded';
                        const isPartial = o.status === 'partial_refund';
                        const isGifted = o.status === 'gifted';

                        return (
                          <tr
                            key={o.id || i}
                            className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="py-4 px-4 text-sm font-medium text-gray-600">
                              {formatDate(o.created_at)}
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-sm font-bold text-brand-dark">
                                {o.mystery?.title || 'Mystery Purchase'}
                              </p>
                              {o.refundReason && (
                                <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                                  Note: {o.refundReason}
                                </p>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`text-sm font-black ${
                                  isRefunded ? 'line-through text-gray-400' : 'text-gray-900'
                                }`}
                              >
                                ${grossUsd.toFixed(2)}
                              </span>
                              {refundedUsd > 0 && (
                                <span className="block text-[10px] font-black text-rose-600 uppercase">
                                  Refunded -${refundedUsd.toFixed(2)}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                  isGifted
                                    ? 'bg-brand-pink/10 text-brand-pink'
                                    : isRefunded
                                    ? 'bg-rose-100 text-rose-700'
                                    : isPartial
                                    ? 'bg-amber-100 text-amber-700'
                                    : o.status === 'succeeded'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {isPartial ? 'Partial Refund' : o.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              {!isRefunded && !isGifted && grossUsd > 0 ? (
                                <button
                                  onClick={() => openRefundModal(o)}
                                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                  💸 Refund
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 font-bold text-sm text-center py-12">
                  No transaction history.
                </p>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 4: GUESTS ROSTER                                                */}
          {/* =================================================================== */}
          {activeTab === 'guests' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-500 font-medium">Viewing {guests.length} guests</p>
                <div className="flex gap-3">
                  <button
                    onClick={openAddGuest}
                    className="px-4 py-2 bg-brand-blue hover:bg-brand-dark text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                  >
                    Add Guest
                  </button>
                  <button
                    onClick={handleRegenerateAll}
                    disabled={isRegenerating}
                    className={`px-4 py-2 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${
                      isRegenerating
                        ? 'bg-brand-pink animate-pulse cursor-not-allowed'
                        : 'bg-brand-dark hover:bg-brand-pink active:scale-95'
                    }`}
                  >
                    {isRegenerating
                      ? `Updated ${regeneratedCount}/${guests.length} photos`
                      : 'Regenerate All AI Avatars'}
                  </button>
                </div>
              </div>

              {guests.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {guests.map((g: any, i: number) => (
                    <div
                      key={i}
                      onClick={() => setSelectedGuest(g)}
                      className="rounded-3xl border border-gray-100 flex flex-col hover:shadow-2xl hover:-translate-y-1 hover:border-brand-pink/40 transition-all duration-300 cursor-pointer group relative bg-white overflow-hidden"
                    >
                      {currentlyGeneratingId === g.id && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-30 flex items-center justify-center rounded-3xl">
                          <div className="w-10 h-10 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}

                      {/* Top: AI Photo */}
                      <div className="w-full h-64 sm:h-72 relative bg-gray-100 flex items-center justify-center overflow-hidden">
                        {(() => {
                          let aiUrl = null;
                          if (g.avatar_url) {
                            try {
                              const u = new URL(g.avatar_url);
                              const raw = u.searchParams.get('aiPhotoUrl');
                              if (raw) aiUrl = decodeURIComponent(raw);
                            } catch {}
                          }
                          if (aiUrl) {
                            /* eslint-disable-next-line @next/next/no-img-element */
                            return (
                              <img
                                src={aiUrl}
                                alt="AI Render"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            );
                          }
                          return (
                            <div className="flex flex-col items-center opacity-50">
                              <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1"
                                className="mb-2"
                              >
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                No AI Render
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Bottom: Info & Cartoon Avatar */}
                      <div className="bg-[#f0f0f0] p-6 flex items-start justify-between min-h-[160px] relative">
                        <div className="flex flex-col h-full justify-between z-10 w-2/3">
                          <div>
                            <h3 className="font-black text-brand-pink text-4xl uppercase leading-none tracking-tighter mb-3">
                              {g.name}
                            </h3>
                            <div className="text-black font-extrabold text-base leading-tight lowercase line-clamp-3 break-words pr-2">
                              {(() => {
                                const features = [];
                                if (g.gender) features.push(g.gender);
                                if (g.ethnicity) features.push(g.ethnicity);
                                if (g.eye_color) features.push(`${g.eye_color} eyes`);
                                if (g.height) features.push(g.height);
                                if (g.traits && g.traits.length > 0) features.push(...g.traits);
                                return features.length > 0
                                  ? features.join(', ')
                                  : 'no features specified';
                              })()}
                            </div>
                          </div>
                          <div className="mt-6">
                            <span className="text-gray-400 font-black text-xl opacity-70 tracking-tight">
                              {g.isLinked ? 'Linked' : 'Manual'}
                            </span>
                          </div>
                        </div>

                        <div className="absolute right-6 -top-12 w-28 h-28 rounded-full bg-[#7cd8ff] flex items-center justify-center overflow-hidden shadow-2xl border-[6px] border-[#f0f0f0] z-20 group-hover:-translate-y-2 group-hover:scale-105 transition-all duration-300">
                          {g.avatar_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={g.avatar_url
                                .replace(/&?aiPhotoUrl=[^&]+/, '')
                                .replace(/&?aiPhotoHash=[^&]+/, '')}
                              alt={g.name}
                              className="w-full h-full object-cover scale-150 pt-6"
                            />
                          ) : (
                            <span className="text-4xl font-black text-white">{g.name[0]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 font-bold text-sm text-center py-12">
                  Guest roster is empty.
                </p>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 5: PERSONAL DETAILS                                             */}
          {/* =================================================================== */}
          {activeTab === 'personal' && (
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
                <p className="text-gray-500 font-medium">Customer preferences and bio</p>
                <button
                  onClick={openEditDetails}
                  className="px-4 py-2 bg-brand-dark hover:bg-brand-pink text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                >
                  Edit Details
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                      Player Bio
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {profile.bio || 'No bio provided.'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                      Fun Facts
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {profile.fun_facts || 'No fun facts provided.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                      Character Preferences
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(profile.character_preferences || []).length > 0 ? (
                        profile.character_preferences.map((pref: string, i: number) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-brand-dark text-white rounded-full text-[10px] font-black uppercase tracking-widest"
                          >
                            {pref}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm font-bold">None specified</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                      Dietary Needs
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(profile.dietary_needs || []).length > 0 ? (
                        profile.dietary_needs.map((diet: string, i: number) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest"
                          >
                            {diet}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm font-bold">None specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: GIFT FREE MURDER MYSTERY                                     */}
      {/* ===================================================================== */}
      {isGiftModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsGiftModalOpen(false)}
        >
          <div
            className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsGiftModalOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-1">
                Complimentary Grant
              </p>
              <h3 className="text-2xl font-black text-brand-dark tracking-tight uppercase">
                Gift Free <span className="text-brand-pink italic">Murder Mystery</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-1">
                Clones the full mystery (characters, plot beats & clues) directly into{' '}
                {profile.full_name || 'this customer'}&apos;s Builder account for $0.00.
              </p>
            </div>

            <form onSubmit={handleGiftMysterySubmit} className="space-y-5">
              <div>
                <label className={labelClass}>Select Mystery from Catalog</label>
                <CustomSelect
                  className={inputClass}
                  value={selectedGiftMysteryId}
                  onChange={e => setSelectedGiftMysteryId(e.target.value)}
                >
                  {catalogMysteries.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.min_players}-{m.max_players} Players • {m.status})
                    </option>
                  ))}
                </CustomSelect>
              </div>

              <div>
                <label className={labelClass}>Gift Reason / Internal Note (Optional)</label>
                <input
                  type="text"
                  className={inputClass}
                  value={giftNote}
                  onChange={e => setGiftNote(e.target.value)}
                  placeholder="e.g. Influencer collab, VIP gift, support replacement"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsGiftModalOpen(false)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-brand-pink hover:bg-brand-dark text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {loading ? 'Gifting Mystery...' : '🎁 Gift Mystery Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: REFUND ORDER MODAL                                           */}
      {/* ===================================================================== */}
      {refundOrderTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setRefundOrderTarget(null)}
        >
          <div
            className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setRefundOrderTarget(null)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">
                Order Refund
              </p>
              <h3 className="text-2xl font-black text-brand-dark tracking-tight uppercase">
                Refund <span className="text-rose-600 italic">Transaction</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-1">
                {refundOrderTarget.mystery?.title || 'Order'} • Original Charge: $
                {((refundOrderTarget.amount || 0) / 100).toFixed(2)}
              </p>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRefundType('full')}
                  className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${
                    refundType === 'full'
                      ? 'bg-brand-dark text-white border-brand-dark'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}
                >
                  Full Refund (${((refundOrderTarget.amount || 0) / 100).toFixed(2)})
                </button>
                <button
                  type="button"
                  onClick={() => setRefundType('partial')}
                  className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${
                    refundType === 'partial'
                      ? 'bg-brand-dark text-white border-brand-dark'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}
                >
                  Partial Refund
                </button>
              </div>

              {refundType === 'partial' && (
                <div>
                  <label className={labelClass}>Refund Amount (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.50"
                    max={((refundOrderTarget.amount || 0) / 100).toFixed(2)}
                    className={inputClass}
                    value={refundCustomUsd}
                    onChange={e => setRefundCustomUsd(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>Reason for Refund</label>
                <input
                  type="text"
                  className={inputClass}
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  placeholder="e.g. Duplicate purchase, customer request"
                />
              </div>

              {refundOrderTarget.mystery_id && (
                <label className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50/60 border border-rose-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revokeMysteryOnRefund}
                    onChange={e => setRevokeMysteryOnRefund(e.target.checked)}
                    className="w-4 h-4 accent-rose-600 rounded"
                  />
                  <span className="text-xs font-bold text-rose-700">
                    Also revoke customer&apos;s access to this mystery
                  </span>
                </label>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setRefundOrderTarget(null)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: CREATE CUSTOMER PROMO / DISCOUNT                             */}
      {/* ===================================================================== */}
      {isPromoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsPromoModalOpen(false)}
        >
          <div
            className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsPromoModalOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-1">
                Personal Discount
              </p>
              <h3 className="text-2xl font-black text-brand-dark tracking-tight uppercase">
                Create <span className="text-brand-pink italic">Promo Code</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-1">
                Generate a personal discount code for {profile.full_name || 'this customer'}.
              </p>
            </div>

            <form onSubmit={handleCreatePromoSubmit} className="space-y-5">
              <div>
                <label className={labelClass}>Promo Code</label>
                <input
                  type="text"
                  className={`${inputClass} uppercase font-mono`}
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SARAH-50"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'percent', label: '% Percentage' },
                  { id: 'fixed', label: '$ Fixed USD' },
                  { id: 'free_mystery', label: '100% Free Game' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPromoType(t.id as any)}
                    className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      promoType === t.id
                        ? 'bg-brand-dark text-white border-brand-dark'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {promoType !== 'free_mystery' && (
                <div>
                  <label className={labelClass}>
                    {promoType === 'percent' ? 'Discount Percentage (%)' : 'Discount Amount ($ USD)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={promoType === 'percent' ? '100' : '500'}
                    className={inputClass}
                    value={promoValue}
                    onChange={e => setPromoValue(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Note / Reason</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={promoNote}
                    onChange={e => setPromoNote(e.target.value)}
                    placeholder="e.g. Next party discount"
                  />
                </div>
                <div>
                  <label className={labelClass}>Expires On (Optional)</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={promoExpiry}
                    onChange={e => setPromoExpiry(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-brand-dark hover:bg-brand-pink text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Promo Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: EDIT PLAYER DETAILS                                          */}
      {/* ===================================================================== */}
      {isEditDetailsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsEditDetailsOpen(false)}
        >
          <div
            className="bg-white rounded-[32px] max-w-2xl w-full p-8 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsEditDetailsOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-black text-brand-dark tracking-tight uppercase">
                Edit Player <span className="text-brand-pink italic">Preferences</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-1">
                Configure user&apos;s preferences, bio, dietary needs, etc.
              </p>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Player Bio</label>
                    <textarea
                      className={`${inputClass} min-h-[100px] resize-none`}
                      value={detailBio}
                      onChange={e => setDetailBio(e.target.value)}
                      placeholder="User's personal biography..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fun Facts</label>
                    <textarea
                      className={`${inputClass} min-h-[100px] resize-none`}
                      value={detailFunFacts}
                      onChange={e => setDetailFunFacts(e.target.value)}
                      placeholder="Some interesting facts about the player..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Character Preferences</label>
                    <div className="flex flex-wrap gap-1.5 mb-2 max-h-[80px] overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                      {detailPrefs.length > 0 ? (
                        detailPrefs.map(pref => (
                          <span
                            key={pref}
                            className="px-2.5 py-1 bg-brand-dark text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm"
                          >
                            {pref}
                            <button
                              type="button"
                              onClick={() => setDetailPrefs(detailPrefs.filter(p => p !== pref))}
                              className="text-brand-pink font-bold hover:scale-110 ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold p-1 italic">
                          No preferences yet
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className={inputClass}
                        value={prefInput}
                        onChange={e => setPrefInput(e.target.value)}
                        placeholder="Add tag (e.g. Comedy, Detective)"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (prefInput.trim() && !detailPrefs.includes(prefInput.trim())) {
                              setDetailPrefs([...detailPrefs, prefInput.trim()]);
                              setPrefInput('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (prefInput.trim() && !detailPrefs.includes(prefInput.trim())) {
                            setDetailPrefs([...detailPrefs, prefInput.trim()]);
                            setPrefInput('');
                          }
                        }}
                        className="px-4 bg-brand-dark hover:bg-brand-pink text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Dietary Needs</label>
                    <div className="flex flex-wrap gap-1.5 mb-2 max-h-[80px] overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                      {detailDiet.length > 0 ? (
                        detailDiet.map(diet => (
                          <span
                            key={diet}
                            className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm"
                          >
                            {diet}
                            <button
                              type="button"
                              onClick={() => setDetailDiet(detailDiet.filter(d => d !== diet))}
                              className="text-rose-900 font-bold hover:scale-110 ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold p-1 italic">
                          No dietary needs yet
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className={inputClass}
                        value={dietInput}
                        onChange={e => setDietInput(e.target.value)}
                        placeholder="Add diet (e.g. Vegetarian, Gluten-Free)"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (dietInput.trim() && !detailDiet.includes(dietInput.trim())) {
                              setDetailDiet([...detailDiet, dietInput.trim()]);
                              setDietInput('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (dietInput.trim() && !detailDiet.includes(dietInput.trim())) {
                            setDetailDiet([...detailDiet, dietInput.trim()]);
                            setDietInput('');
                          }
                        }}
                        className="px-4 bg-brand-dark hover:bg-brand-pink text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditDetailsOpen(false)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-brand-dark hover:bg-brand-pink text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 5: ADD GUEST                                                    */}
      {/* ===================================================================== */}
      {isAddGuestOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsAddGuestOpen(false)}
        >
          <div
            className="bg-white rounded-[32px] max-w-2xl w-full p-8 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAddGuestOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-black text-brand-dark tracking-tight uppercase">
                Add New <span className="text-brand-pink italic">Guest</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-1">
                Create a guest profile manually for this customer&apos;s roster.
              </p>
            </div>

            <form onSubmit={handleAddGuestSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Name *</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={addGuestName}
                      onChange={e => setAddGuestName(e.target.value)}
                      placeholder="Guest's full name"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input
                      type="email"
                      className={inputClass}
                      value={addGuestEmail}
                      onChange={e => setAddGuestEmail(e.target.value)}
                      placeholder="guest@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <div>
                      <label className={labelClass}>Gender</label>
                      <CustomSelect
                        className={inputClass}
                        value={addGuestGender}
                        onChange={e => setAddGuestGender(e.target.value)}
                      >
                        <option value="adaptable">Adaptable</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-Binary</option>
                      </CustomSelect>
                    </div>
                    <div>
                      <label className={labelClass}>Eyes</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={addGuestEyeColor}
                        onChange={e => setAddGuestEyeColor(e.target.value)}
                        placeholder="Blue"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Height</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={addGuestHeight}
                        onChange={e => setAddGuestHeight(e.target.value)}
                        placeholder="6'1"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Ethnicity</label>
                      <CustomSelect
                        className={inputClass}
                        value={addGuestEthnicity}
                        onChange={e => setAddGuestEthnicity(e.target.value)}
                      >
                        <option value="">Unspecified</option>
                        <option value="Caucasian / White">Caucasian / White</option>
                        <option value="Black / African Descent">Black / African Descent</option>
                        <option value="East Asian">East Asian</option>
                        <option value="South Asian">South Asian</option>
                        <option value="Southeast Asian">Southeast Asian</option>
                        <option value="Hispanic / Latino">Hispanic / Latino</option>
                        <option value="Middle Eastern">Middle Eastern</option>
                        <option value="Native American / Indigenous">
                          Native American / Indigenous
                        </option>
                        <option value="Pacific Islander">Pacific Islander</option>
                        <option value="Mixed / Multiracial">Mixed / Multiracial</option>
                        <option value="Other">Other</option>
                      </CustomSelect>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Guest Bio</label>
                    <textarea
                      className={`${inputClass} min-h-[90px] resize-none`}
                      value={addGuestBio}
                      onChange={e => setAddGuestBio(e.target.value)}
                      placeholder="Brief guest description..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Guest Traits ({addGuestTraits.length}/3)</label>
                    <div className="flex flex-wrap gap-1.5 mb-2 max-h-[70px] overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                      {addGuestTraits.length > 0 ? (
                        addGuestTraits.map(t => (
                          <span
                            key={t}
                            className="px-2.5 py-1 bg-brand-pink/10 text-brand-pink rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm"
                          >
                            {t}
                            <button
                              type="button"
                              onClick={() =>
                                setAddGuestTraits(addGuestTraits.filter(item => item !== t))
                              }
                              className="text-brand-pink font-bold hover:scale-110 ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold p-1 italic">
                          No traits yet
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className={inputClass}
                        value={addTraitInput}
                        onChange={e => setAddTraitInput(e.target.value)}
                        disabled={addGuestTraits.length >= 3}
                        placeholder={
                          addGuestTraits.length >= 3
                            ? 'Maximum of 3 traits reached'
                            : 'Add trait (e.g. Outgoing, Shy)'
                        }
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (
                              addGuestTraits.length < 3 &&
                              addTraitInput.trim() &&
                              !addGuestTraits.includes(addTraitInput.trim())
                            ) {
                              setAddGuestTraits(
                                [...addGuestTraits, addTraitInput.trim()].slice(0, 3)
                              );
                              setAddTraitInput('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={addGuestTraits.length >= 3}
                        onClick={() => {
                          if (
                            addGuestTraits.length < 3 &&
                            addTraitInput.trim() &&
                            !addGuestTraits.includes(addTraitInput.trim())
                          ) {
                            setAddGuestTraits(
                              [...addGuestTraits, addTraitInput.trim()].slice(0, 3)
                            );
                            setAddTraitInput('');
                          }
                        }}
                        className="px-4 bg-brand-dark hover:bg-brand-pink disabled:opacity-40 disabled:pointer-events-none text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddGuestOpen(false)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-brand-dark hover:bg-brand-pink text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 6: GUEST DETAILS / EDIT                                         */}
      {/* ===================================================================== */}
      {selectedGuest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setSelectedGuest(null);
            setIsEditingGuest(false);
          }}
        >
          <div
            className="bg-white rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setSelectedGuest(null);
                setIsEditingGuest(false);
              }}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-1/2 bg-gray-100 relative min-h-[300px]">
                {selectedGuest.avatar_url ? (
                  <AIPhotoRenderer avatarUrl={selectedGuest.avatar_url} name={selectedGuest.name} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <p className="font-bold text-sm">No Photo Generated</p>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
                  <div className="text-center">
                    <span className="px-3 py-1 bg-black/50 backdrop-blur-md text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                      AI Reference Photo
                    </span>
                  </div>
                  <button
                    id={`gen-single-${selectedGuest.id}`}
                    onClick={async () => {
                      const btn = document.getElementById(`gen-single-${selectedGuest.id}`);
                      if (btn) btn.innerText = 'Generating... (Wait)';
                      try {
                        const res = await fetch(`/api/admin/generate-avatar-single`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ guestId: selectedGuest.id, userId: profile.id }),
                        });
                        if (res.ok) {
                          if (btn) btn.innerText = 'Done! Refreshing...';
                          window.location.reload();
                        } else {
                          const errorData = await res.json().catch(() => ({}));
                          alert(`Failed: ${errorData.error || 'Unknown error'}`);
                          if (btn) btn.innerText = 'Regenerate Photo';
                        }
                      } catch (e: any) {
                        alert(`Error: ${e.message}`);
                        if (btn) btn.innerText = 'Regenerate Photo';
                      }
                    }}
                    className="w-full py-2 bg-brand-pink text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-dark transition-colors shadow-lg"
                  >
                    Regenerate Photo
                  </button>
                </div>
              </div>

              <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
                {isEditingGuest ? (
                  <form onSubmit={handleEditGuestSubmit} className="space-y-4">
                    <div className="mb-2">
                      <h4 className="text-lg font-black uppercase tracking-tight text-brand-dark">
                        Edit Guest
                      </h4>
                      <p className="text-[10px] font-bold text-gray-400">
                        Modify manually entered guest credentials
                      </p>
                    </div>
                    <div>
                      <label className={labelClass}>Name *</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={editGuestName}
                        onChange={e => setEditGuestName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input
                        type="email"
                        className={inputClass}
                        value={editGuestEmail}
                        onChange={e => setEditGuestEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Bio</label>
                      <textarea
                        className={`${inputClass} min-h-[70px] resize-none`}
                        value={editGuestBio}
                        onChange={e => setEditGuestBio(e.target.value)}
                      />
                    </div>
                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingGuest(false)}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2 bg-brand-dark hover:bg-brand-pink text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="mb-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-2">
                        {selectedGuest.isLinked ? 'Linked Account' : 'Manual Entry'}
                      </p>
                      <h2 className="text-3xl font-black text-brand-dark tracking-tight leading-none mb-2">
                        {selectedGuest.name}
                      </h2>
                      {selectedGuest.email && (
                        <p className="text-sm font-bold text-gray-400">{selectedGuest.email}</p>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                          Character Traits
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedGuest.traits && selectedGuest.traits.length > 0 ? (
                            selectedGuest.traits.map((t: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 bg-brand-pink/10 text-brand-pink rounded-lg text-xs font-black uppercase tracking-widest"
                              >
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 italic">No traits selected.</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                          Guest Bio
                        </h4>
                        {selectedGuest.bio ? (
                          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                            {selectedGuest.bio}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No bio provided.</p>
                        )}
                      </div>

                      {!selectedGuest.isLinked && (
                        <div className="pt-6 flex gap-3 border-t border-gray-100">
                          <button
                            onClick={() => startEditingGuest(selectedGuest)}
                            className="flex-1 py-2.5 bg-gray-100 hover:bg-brand-pink hover:text-white text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                          >
                            Edit Guest
                          </button>
                          <button
                            onClick={handleDeleteGuest}
                            className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                          >
                            Delete Guest
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
