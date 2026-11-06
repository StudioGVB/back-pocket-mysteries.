'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  SUPPORT_EMAIL,
  TicketSeverity,
  TicketStatus,
  TicketCategory,
  SupportTicketRecord,
  formatTicketRef,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  CATEGORY_CONFIG,
} from '@/utils/tickets';
import {
  createSupportTicketAction,
  addTicketReplyAction,
  updateTicketStatusAction,
} from '@/app/actions/tickets';
import { createClient } from '@/utils/supabase/client';

interface CustomerSupportClientProps {
  initialTickets: SupportTicketRecord[];
  user: { id: string; name: string; email: string } | null;
  mysteries: Array<{ id: string; title: string }>;
  defaultMysteryId?: string | null;
  context?: 'builder' | 'account';
}

interface PendingAttachment {
  file: File;
  previewUrl: string;
  isImage: boolean;
}

interface DropdownOption {
  value: string;
  label: string;
}

function BrandedSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
}: {
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full px-4 py-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${
          open
            ? 'bg-white border-brand-pink ring-4 ring-brand-pink/10 text-slate-900'
            : 'bg-slate-50/60 border-slate-200 hover:bg-white hover:border-slate-300 text-slate-900'
        }`}
      >
        <span className="text-sm font-bold truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-brand-pink' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 max-h-64 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm font-bold flex items-center justify-between gap-2 transition-colors ${
                  isSelected
                    ? 'bg-brand-pink text-white'
                    : 'text-slate-700 hover:bg-pink-50/70 hover:text-brand-pink'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  if (url.startsWith('data:')) return false;
  const clean = url.split('?')[0].toLowerCase();
  return /\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(clean);
}

function getAttachmentDisplayInfo(url: string, idx: number): { name: string; ext: string } {
  if (url.startsWith('data:')) {
    const nameMatch = url.match(/;name=([^;]+);base64,/);
    if (nameMatch && nameMatch[1]) {
      const decoded = decodeURIComponent(nameMatch[1]);
      const ext = (decoded.split('.').pop() || 'FILE').toUpperCase().slice(0, 6);
      return { name: decoded, ext };
    }
    const mimeMatch = url.match(/^data:([^;,]+)/);
    const sub = mimeMatch?.[1]?.split('/')[1]?.split('+')[0]?.toUpperCase() || 'FILE';
    return { name: `Attachment #${idx + 1}`, ext: sub.slice(0, 6) };
  }
  try {
    const lastSeg = decodeURIComponent(url.split('?')[0].split('/').pop() || '');
    const cleaned = lastSeg.replace(/^\d+-[a-z0-9]+-/, '');
    const ext = (cleaned.split('.').pop() || 'FILE').toUpperCase().slice(0, 6);
    return { name: cleaned || `Attachment #${idx + 1}`, ext };
  } catch {
    return { name: `Attachment #${idx + 1}`, ext: 'FILE' };
  }
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CustomerSupportClient({
  initialTickets,
  user,
  mysteries,
  defaultMysteryId = null,
  context = 'builder',
}: CustomerSupportClientProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicketRecord[]>(initialTickets);
  // Always open to a fresh Raise a Support Ticket screen by default
  const [activeView, setActiveView] = useState<'new' | 'list'>('new');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialTickets[0]?.id || null
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');

  // Copy email state
  const [copiedEmail, setCopiedEmail] = useState(false);

  // New Ticket Form state
  const [subject, setSubject] = useState('');
  const [severity, setSeverity] = useState<TicketSeverity>('medium');
  const [category, setCategory] = useState<TicketCategory>('bug');
  const [mysteryId, setMysteryId] = useState<string>(defaultMysteryId || '');
  const [comment, setComment] = useState('');
  const [userName, setUserName] = useState(user?.name || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.name) setUserName(user.name);
    if (user?.email) setUserEmail(user.email);

    if (!user?.email) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        const authUser = data?.user;
        if (authUser) {
          if (authUser.email) setUserEmail(authUser.email);
          const fullName =
            authUser.user_metadata?.full_name ||
            authUser.email?.split('@')[0] ||
            '';
          if (fullName) setUserName((prev) => prev || fullName);
        }
      });
    }
  }, [user]);

  // Reply Composer state (for text chain)
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<PendingAttachment[]>([]);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox image preview
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'active') {
      return t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_on_customer';
    }
    if (statusFilter === 'resolved') {
      return t.status === 'resolved' || t.status === 'closed';
    }
    return true;
  });

  const categoryOptions: DropdownOption[] = (Object.keys(CATEGORY_CONFIG) as TicketCategory[]).map(
    (catKey) => ({
      value: catKey,
      label: CATEGORY_CONFIG[catKey].label,
    })
  );

  const mysteryOptions: DropdownOption[] = [
    { value: '', label: 'Not specific to a single mystery' },
    ...mysteries.map((m) => ({
      value: m.id,
      label: m.title,
    })),
  ];

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2200);
    } catch {
      // Fallback
    }
  };

  const addFilesToQueue = (files: FileList | File[], target: 'new' | 'reply') => {
    const validFiles = Array.from(files).filter((f) => f && f.size > 0);
    const items: PendingAttachment[] = validFiles.slice(0, 5).map((file) => {
      const isImg =
        file.type.startsWith('image/') ||
        /\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(file.name || '');
      return {
        file,
        previewUrl: isImg ? URL.createObjectURL(file) : '',
        isImage: isImg,
      };
    });

    if (target === 'new') {
      setPendingAttachments((prev) => [...prev, ...items].slice(0, 5));
    } else {
      setReplyAttachments((prev) => [...prev, ...items].slice(0, 5));
    }
  };

  const removePendingAttachment = (index: number, target: 'new' | 'reply') => {
    if (target === 'new') {
      setPendingAttachments((prev) => {
        const copy = [...prev];
        const removed = copy.splice(index, 1);
        if (removed[0]?.previewUrl) URL.revokeObjectURL(removed[0].previewUrl);
        return copy;
      });
    } else {
      setReplyAttachments((prev) => {
        const copy = [...prev];
        const removed = copy.splice(index, 1);
        if (removed[0]?.previewUrl) URL.revokeObjectURL(removed[0].previewUrl);
        return copy;
      });
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!subject.trim()) {
      setFormError('Please enter a short subject for your ticket.');
      return;
    }
    if (!comment.trim()) {
      setFormError('Please describe what is happening in the comment box.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.set('subject', subject.trim());
      fd.set('severity', severity);
      fd.set('category', category);
      fd.set('comment', comment.trim());
      fd.set('user_name', userName.trim());
      fd.set('user_email', userEmail.trim());
      if (mysteryId) {
        fd.set('mystery_id', mysteryId);
        const foundMystery = mysteries.find((m) => m.id === mysteryId);
        if (foundMystery) fd.set('mystery_title', foundMystery.title);
      }
      for (const item of pendingAttachments) {
        fd.append('attachments', item.file);
      }

      const res = await createSupportTicketAction(fd);
      if (!res.success || !res.ticket) {
        setFormError(res.error || 'Could not submit ticket. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const created = res.ticket;
      setTickets((prev) => [created, ...prev]);
      setSelectedTicketId(created.id);
      setSubject('');
      setComment('');
      setPendingAttachments([]);
      setFormSuccess(
        `Ticket ${formatTicketRef(created.ticket_number, created.id)} has been created! We've sent a confirmation email and will respond within 48 hours.`
      );
      setActiveView('list');
      router.refresh();
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setReplyError(null);

    if (!replyText.trim() && replyAttachments.length === 0) {
      setReplyError('Please write a message or attach a file to reply.');
      return;
    }

    setIsSendingReply(true);
    try {
      const fd = new FormData();
      fd.set('ticket_id', selectedTicket.id);
      fd.set('sender_role', 'customer');
      fd.set('message', replyText.trim());
      for (const item of replyAttachments) {
        fd.append('attachments', item.file);
      }

      const res = await addTicketReplyAction(fd);
      if (!res.success || !res.ticket) {
        setReplyError(res.error || 'Failed to send reply.');
        setIsSendingReply(false);
        return;
      }

      const updated = res.ticket;
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setReplyText('');
      setReplyAttachments([]);
      router.refresh();
    } catch (err: any) {
      setReplyError(err?.message || 'Failed to send reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleToggleCustomerResolve = async (ticket: SupportTicketRecord) => {
    const nextStatus: TicketStatus =
      ticket.status === 'resolved' || ticket.status === 'closed' ? 'open' : 'resolved';
    const note =
      nextStatus === 'resolved'
        ? 'Customer marked this ticket as resolved.'
        : 'Customer reopened this ticket.';

    setIsSendingReply(true);
    try {
      const res = await updateTicketStatusAction({
        ticketId: ticket.id,
        status: nextStatus,
        note,
      });
      if (res.success && res.ticket) {
        setTickets((prev) => prev.map((t) => (t.id === res.ticket!.id ? res.ticket! : t)));
        router.refresh();
      }
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 sm:p-8 shadow-sm">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[11px] font-black uppercase tracking-widest">
            <span>{context === 'builder' ? 'Builder Support Desk' : 'Customer Support & Help'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Support &amp; Ticketing
          </h1>
          <p className="text-slate-500 text-sm sm:text-base font-medium leading-relaxed">
            Need a hand with your mystery, cast setup, clues, or live game lobby? Raise a support
            ticket below to start a tracked conversation thread with our team.
          </p>
        </div>
      </div>

      {/* Success Toast Banner */}
      {formSuccess && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 sm:p-5 flex items-center justify-between gap-4 text-emerald-900">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-sm shrink-0">
              ✓
            </span>
            <p className="text-sm font-bold">{formSuccess}</p>
          </div>
          <button
            type="button"
            onClick={() => setFormSuccess(null)}
            className="text-xs font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs: Raise New Ticket vs My Tickets */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex bg-slate-200/70 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveView('new')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeView === 'new'
                ? 'bg-brand-pink text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>+ Raise a New Ticket</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('list')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeView === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>My Tickets &amp; Updates</span>
            {tickets.length > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeView === 'list'
                    ? 'bg-brand-pink text-white'
                    : 'bg-slate-300/80 text-slate-700'
                }`}
              >
                {tickets.length}
              </span>
            )}
          </button>
        </div>

        {activeView === 'list' && tickets.length > 0 && (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl">
            {(['all', 'active', 'resolved'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                  statusFilter === f
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f === 'all' ? 'All' : f === 'active' ? 'Open / Active' : 'Resolved'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW 1: RAISE A NEW TICKET FORM */}
      {activeView === 'new' && (
        <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 sm:p-10 shadow-sm">
          <div className="max-w-3xl">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900">Raise a Support Ticket</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Give us a subject, select the severity, describe what you are experiencing, and
                attach any relevant files or screenshots. We will respond within 48 hours right here
                in your ticket thread and by email.
              </p>
            </div>

            {formError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-6">
              {/* Account Details (locked to portal account) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    readOnly
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100/80 text-sm font-semibold text-slate-500 cursor-not-allowed select-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    readOnly
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100/80 text-sm font-semibold text-slate-500 cursor-not-allowed select-none"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Subject <span className="text-brand-pink">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of the issue or question (e.g. Audio clue not playing in Round 2)"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-bold text-slate-900 transition-colors"
                />
              </div>

              {/* Custom Styled Dropdowns: Category & Published Mysteries */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Category
                  </label>
                  <BrandedSelect
                    value={category}
                    onChange={(val) => setCategory(val as TicketCategory)}
                    options={categoryOptions}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Related Mystery (Optional)
                  </label>
                  <BrandedSelect
                    value={mysteryId}
                    onChange={(val) => setMysteryId(val)}
                    options={mysteryOptions}
                  />
                </div>
              </div>

              {/* Severity Picker */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Severity Level <span className="text-brand-pink">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(['low', 'medium', 'high', 'urgent'] as TicketSeverity[]).map((sevKey) => {
                    const cfg = SEVERITY_CONFIG[sevKey];
                    const isSelected = severity === sevKey;
                    return (
                      <button
                        key={sevKey}
                        type="button"
                        onClick={() => setSeverity(sevKey)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'border-brand-pink bg-brand-pink/5 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                            {cfg.label}
                          </span>
                          {isSelected && (
                            <span className="text-brand-pink text-xs font-black">●</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-snug">
                          {cfg.shortDesc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment / Description */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Comment / Description <span className="text-brand-pink">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what happened, what page or step you were on, and any details that will help us fix or answer this quickly..."
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-medium text-slate-900 leading-relaxed transition-colors"
                />
              </div>

              {/* All File Types Uploader (Up to 5 files) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Attachments / Files (Optional)
                  </label>
                  <span className="text-xs text-slate-400 font-medium">
                    Up to 5 files ({pendingAttachments.length}/5) &bull; All file types supported
                  </span>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.length) {
                      addFilesToQueue(e.dataTransfer.files, 'new');
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-brand-pink bg-brand-pink/5'
                      : 'border-slate-200 hover:border-brand-pink/60 bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        addFilesToQueue(e.target.files, 'new');
                        e.target.value = '';
                      }
                    }}
                  />
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-2 text-brand-pink shadow-sm">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    Click to upload files or drag &amp; drop attachments here
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upload screenshots, PDFs, documents, audio clips, or any relevant files
                  </p>
                </div>

                {pendingAttachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                    {pendingAttachments.map((item, idx) =>
                      item.isImage ? (
                        <div
                          key={idx}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePendingAttachment(idx, 'new');
                            }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/80 text-white text-xs font-black flex items-center justify-center hover:bg-rose-600 transition-colors"
                            title="Remove file"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-0 inset-x-0 bg-slate-900/75 px-2.5 py-1 text-[10px] text-white truncate flex items-center justify-between gap-2">
                            <span className="truncate">{item.file.name}</span>
                            <span className="text-slate-300 shrink-0">
                              {formatFileSize(item.file.size)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={idx}
                          className="relative flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="px-2.5 py-1.5 rounded-lg bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-wider shrink-0">
                              {(item.file.name.split('.').pop() || 'FILE').slice(0, 5)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {item.file.name}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-400">
                                {formatFileSize(item.file.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePendingAttachment(idx, 'new');
                            }}
                            className="w-6 h-6 rounded-full bg-slate-200 hover:bg-rose-600 hover:text-white text-slate-600 text-xs font-black flex items-center justify-center shrink-0 transition-colors"
                            title="Remove file"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Submit Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-slate-400 font-medium">
                  We respond to all support tickets within 48 hours.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3.5 rounded-xl bg-brand-pink text-white text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-brand-pink/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting Ticket...' : 'Submit Support Ticket →'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 2: MY TICKETS & LIVE TEXT CHAIN */}
      {activeView === 'list' && (
        <div>
          {tickets.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-14 text-center space-y-4">
              <h3 className="text-xl font-black text-slate-900">No support tickets yet</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto font-medium">
                When you raise a ticket, you&apos;ll see the live conversation chain and status
                updates from our team right here.
              </p>
              <button
                type="button"
                onClick={() => setActiveView('new')}
                className="px-7 py-3.5 rounded-xl bg-brand-pink text-white text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg"
              >
                + Raise Your First Ticket
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Ticket List */}
              <div className="lg:col-span-5 space-y-3">
                {filteredTickets.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm font-bold">
                    No {statusFilter} tickets found.
                  </div>
                ) : (
                  filteredTickets.map((t) => {
                    const isSelected = t.id === selectedTicket?.id;
                    const sevCfg = SEVERITY_CONFIG[t.severity] || SEVERITY_CONFIG.medium;
                    const statCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
                    const catCfg = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.general;
                    const lastMsg = t.messages[t.messages.length - 1];
                    const hasAdminReply =
                      t.last_reply_by === 'admin' &&
                      t.status !== 'resolved' &&
                      t.status !== 'closed';

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTicketId(t.id)}
                        className={`w-full text-left p-5 rounded-2xl border transition-all block ${
                          isSelected
                            ? 'bg-white border-brand-pink ring-2 ring-brand-pink/15 shadow-md'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-slate-500">
                              {formatTicketRef(t.ticket_number, t.id)}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${sevCfg.badgeBg} ${sevCfg.badgeText} ${sevCfg.badgeBorder}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${sevCfg.dotColor}`} />
                              {sevCfg.label}
                            </span>
                            {hasAdminReply && (
                              <span className="px-2 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest">
                                New Reply
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statCfg.badgeBg} ${statCfg.badgeText} ${statCfg.badgeBorder}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statCfg.dotColor}`} />
                            {statCfg.label}
                          </span>
                        </div>

                        <h3 className="text-base font-black text-slate-900 line-clamp-1 mb-1">
                          {t.subject}
                        </h3>

                        {lastMsg && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                            <span className="font-bold text-slate-700">
                              {lastMsg.sender_role === 'admin' ? 'Support: ' : 'You: '}
                            </span>
                            {lastMsg.message}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-2 border-t border-slate-100">
                          <span>{catCfg.label}</span>
                          <span>
                            {t.messages.length}{' '}
                            {t.messages.length === 1 ? 'message' : 'messages'} •{' '}
                            {new Date(t.updated_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right Column: Ticket Detail & Text Chain */}
              <div className="lg:col-span-7">
                {selectedTicket ? (
                  <div className="bg-white border border-slate-200/80 rounded-[2rem] shadow-sm overflow-hidden flex flex-col">
                    {/* Ticket Header */}
                    <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-1 rounded-lg bg-slate-900 text-white font-mono text-xs font-black">
                            {formatTicketRef(selectedTicket.ticket_number, selectedTicket.id)}
                          </span>
                          {(() => {
                            const statCfg =
                              STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.open;
                            return (
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${statCfg.badgeBg} ${statCfg.badgeText} ${statCfg.badgeBorder}`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${statCfg.dotColor}`}
                                />
                                {statCfg.customerLabel}
                              </span>
                            );
                          })()}
                          {(() => {
                            const sevCfg =
                              SEVERITY_CONFIG[selectedTicket.severity] ||
                              SEVERITY_CONFIG.medium;
                            return (
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${sevCfg.badgeBg} ${sevCfg.badgeText} ${sevCfg.badgeBorder}`}
                              >
                                {sevCfg.label} Severity
                              </span>
                            );
                          })()}
                        </div>

                        <button
                          type="button"
                          disabled={isSendingReply}
                          onClick={() => handleToggleCustomerResolve(selectedTicket)}
                          className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                            selectedTicket.status === 'resolved' ||
                            selectedTicket.status === 'closed'
                              ? 'border-slate-300 bg-white text-slate-700 hover:border-brand-pink hover:text-brand-pink'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {selectedTicket.status === 'resolved' ||
                          selectedTicket.status === 'closed'
                            ? '↺ Reopen Ticket'
                            : '✓ Mark Resolved'}
                        </button>
                      </div>

                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                          {selectedTicket.subject}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400 mt-1.5">
                          <span>{CATEGORY_CONFIG[selectedTicket.category]?.label}</span>
                          {selectedTicket.mystery_title && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600">
                                {selectedTicket.mystery_title}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span>
                            Raised{' '}
                            {new Date(selectedTicket.created_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Chronological Text Chain */}
                    <div className="p-6 sm:p-8 space-y-5 max-h-[540px] overflow-y-auto bg-slate-50/30">
                      {selectedTicket.messages.map((msg, idx) => {
                        const isAdminMsg = msg.sender_role === 'admin';
                        return (
                          <div key={msg.id || idx} className="space-y-2">
                            {msg.status_change_to && (
                              <div className="flex items-center justify-center my-2">
                                <span className="px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600">
                                  Status updated to{' '}
                                  <span className="text-brand-pink">
                                    {STATUS_CONFIG[msg.status_change_to]?.label ||
                                      msg.status_change_to}
                                  </span>
                                </span>
                              </div>
                            )}

                            <div
                              className={`flex flex-col ${
                                isAdminMsg ? 'items-start' : 'items-end'
                              }`}
                            >
                              <div
                                className={`max-w-[90%] sm:max-w-[82%] rounded-2xl p-4 sm:p-5 border ${
                                  isAdminMsg
                                    ? 'bg-slate-900 text-white border-slate-800 rounded-tl-sm shadow-md'
                                    : 'bg-white text-slate-800 border-slate-200 rounded-tr-sm shadow-sm'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-4 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                        isAdminMsg
                                          ? 'bg-brand-pink text-white'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {isAdminMsg ? 'BP' : 'YOU'}
                                    </span>
                                    <span
                                      className={`text-xs font-black ${
                                        isAdminMsg ? 'text-brand-pink' : 'text-slate-900'
                                      }`}
                                    >
                                      {isAdminMsg
                                        ? `${msg.sender_name || 'Back Pocket Support'} (Admin)`
                                        : msg.sender_name || 'You'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {new Date(msg.created_at).toLocaleString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>

                                <p
                                  className={`text-sm leading-relaxed whitespace-pre-wrap ${
                                    isAdminMsg ? 'text-slate-100' : 'text-slate-700'
                                  }`}
                                >
                                  {msg.message}
                                </p>

                                {/* Attached Files / Images in Message */}
                                {msg.attachment_urls && msg.attachment_urls.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-200/30">
                                    {msg.attachment_urls.map((url, aIdx) => {
                                      if (isImageUrl(url)) {
                                        return (
                                          <button
                                            key={aIdx}
                                            type="button"
                                            onClick={() => setLightboxUrl(url)}
                                            className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200/40 bg-black/20 block"
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={url}
                                              alt={`Attachment ${aIdx + 1}`}
                                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                              <span className="opacity-0 group-hover:opacity-100 px-2.5 py-1 rounded-full bg-white text-slate-900 text-[10px] font-black uppercase tracking-wider">
                                                Zoom
                                              </span>
                                            </span>
                                          </button>
                                        );
                                      }
                                      const info = getAttachmentDisplayInfo(url, aIdx);
                                      return (
                                        <a
                                          key={aIdx}
                                          href={url}
                                          download={info.name}
                                          target="_blank"
                                          rel="noreferrer"
                                          className={`flex items-center justify-between gap-2.5 p-3 rounded-xl border transition-colors ${
                                            isAdminMsg
                                              ? 'bg-white/10 border-white/15 text-white hover:border-brand-pink'
                                              : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-brand-pink'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="px-2 py-1 rounded bg-brand-pink text-white text-[9px] font-black uppercase shrink-0">
                                              {info.ext}
                                            </span>
                                            <span className="text-xs font-bold truncate">
                                              {info.name}
                                            </span>
                                          </div>
                                          <span className="text-[10px] font-black uppercase tracking-wider text-brand-pink shrink-0">
                                            Open →
                                          </span>
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply Composer (Add to Text Chain) */}
                    <form
                      onSubmit={handleSendReply}
                      className="p-5 sm:p-6 bg-white border-t border-slate-200 space-y-3"
                    >
                      {replyError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                          {replyError}
                        </div>
                      )}

                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Reply to Conversation Thread
                      </label>

                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply or provide an update..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-medium text-slate-900 transition-colors"
                      />

                      {replyAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {replyAttachments.map((item, idx) =>
                            item.isImage ? (
                              <div
                                key={idx}
                                className="relative w-20 h-14 rounded-lg overflow-hidden border border-slate-200"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.previewUrl}
                                  alt="Reply attachment"
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePendingAttachment(idx, 'reply')}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <div
                                key={idx}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                              >
                                <span className="text-[10px] font-black uppercase text-brand-pink">
                                  {(item.file.name.split('.').pop() || 'FILE').slice(0, 5)}
                                </span>
                                <span className="max-w-[140px] truncate">{item.file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removePendingAttachment(idx, 'reply')}
                                  className="text-slate-400 hover:text-rose-600 font-black"
                                >
                                  ×
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div>
                          <input
                            ref={replyFileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.length) {
                                addFilesToQueue(e.target.files, 'reply');
                                e.target.value = '';
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => replyFileInputRef.current?.click()}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-brand-pink hover:text-brand-pink text-xs font-bold transition-all inline-flex items-center gap-1.5"
                          >
                            <span>Attach Files</span>
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={isSendingReply}
                          className="px-6 py-2.5 rounded-xl bg-brand-pink text-white text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md disabled:opacity-50"
                        >
                          {isSendingReply ? 'Sending...' : 'Send Reply →'}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-400 font-bold">
                    Select a ticket on the left to view the message chain.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtle Secondary Direct Email Note Below Ticket Page */}
      <div className="pt-2 pb-4 text-center">
        <p className="text-xs text-slate-400 font-medium">
          Having trouble submitting a ticket? You can also reach us directly at{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-slate-500 hover:text-brand-pink font-semibold underline underline-offset-2 transition-colors"
          >
            {SUPPORT_EMAIL}
          </a>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="ml-2 text-[11px] text-slate-400 hover:text-slate-600 font-semibold transition-colors"
          >
            ({copiedEmail ? '✓ Copied' : 'Copy'})
          </button>
        </p>
      </div>

      {/* Fullscreen Image Lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 px-3 py-1 rounded-full bg-white text-slate-900 text-xs font-black uppercase tracking-widest"
            >
              Close ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Ticket Attachment Full Preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
