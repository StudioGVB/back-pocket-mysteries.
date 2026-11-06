'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  SUPPORT_EMAIL,
  TicketSeverity,
  TicketStatus,
  SupportTicketRecord,
  formatTicketRef,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  CATEGORY_CONFIG,
} from '@/utils/tickets';
import {
  addTicketReplyAction,
  updateTicketStatusAction,
  deleteTicketAction,
} from '@/app/actions/tickets';

interface AdminTicketsClientProps {
  initialTickets: SupportTicketRecord[];
}

interface PendingImage {
  file: File;
  previewUrl: string;
  isImage: boolean;
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

export function AdminTicketsClient({ initialTickets }: AdminTicketsClientProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const [tickets, setTickets] = useState<SupportTicketRecord[]>(initialTickets);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialTickets[0]?.id || null
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'needs_reply' | TicketStatus
  >('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | TicketSeverity>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Reply Composer state
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<TicketStatus | ''>('');
  const [replyImages, setReplyImages] = useState<PendingImage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // KPI Metrics
  const needsReplyCount = tickets.filter(
    (t) =>
      t.last_reply_by === 'customer' &&
      t.status !== 'resolved' &&
      t.status !== 'closed'
  ).length;

  const urgentHighCount = tickets.filter(
    (t) =>
      (t.severity === 'urgent' || t.severity === 'high') &&
      t.status !== 'resolved' &&
      t.status !== 'closed'
  ).length;

  const activeCount = tickets.filter(
    (t) =>
      t.status === 'open' ||
      t.status === 'in_progress' ||
      t.status === 'waiting_on_customer'
  ).length;

  const resolvedCount = tickets.filter(
    (t) => t.status === 'resolved' || t.status === 'closed'
  ).length;

  // Filtered list
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'needs_reply') {
      if (
        t.last_reply_by !== 'customer' ||
        t.status === 'resolved' ||
        t.status === 'closed'
      ) {
        return false;
      }
    } else if (statusFilter !== 'all' && t.status !== statusFilter) {
      return false;
    }

    if (severityFilter !== 'all' && t.severity !== severityFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const ref = formatTicketRef(t.ticket_number, t.id).toLowerCase();
      const matchSubject = t.subject.toLowerCase().includes(q);
      const matchName = (t.user_name || '').toLowerCase().includes(q);
      const matchEmail = (t.user_email || '').toLowerCase().includes(q);
      const matchRef = ref.includes(q);
      const matchMsg = t.messages.some((m) => m.message.toLowerCase().includes(q));
      if (!matchSubject && !matchName && !matchEmail && !matchRef && !matchMsg) {
        return false;
      }
    }

    return true;
  });

  const selectedTicket =
    tickets.find((t) => t.id === selectedTicketId) || filteredTickets[0] || null;

  const addReplyFiles = (files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => f && f.size > 0);
    const items: PendingImage[] = valid.slice(0, 5).map((file) => {
      const isImg =
        file.type.startsWith('image/') ||
        /\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(file.name || '');
      return {
        file,
        previewUrl: isImg ? URL.createObjectURL(file) : '',
        isImage: isImg,
      };
    });
    setReplyImages((prev) => [...prev, ...items].slice(0, 5));
  };

  const removeReplyImage = (idx: number) => {
    setReplyImages((prev) => {
      const copy = [...prev];
      const removed = copy.splice(idx, 1);
      if (removed[0]?.previewUrl) URL.revokeObjectURL(removed[0].previewUrl);
      return copy;
    });
  };

  const handleAdminReply = async (
    e: React.FormEvent,
    overrideStatus?: TicketStatus
  ) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setActionError(null);

    const targetStatus = overrideStatus || replyStatus || undefined;

    if (!replyText.trim() && replyImages.length === 0 && !targetStatus) {
      setActionError('Please enter a reply message, attach an image, or choose a new status.');
      return;
    }

    setIsSending(true);
    try {
      const fd = new FormData();
      fd.set('ticket_id', selectedTicket.id);
      fd.set('sender_role', 'admin');
      fd.set('message', replyText.trim());
      if (targetStatus) {
        fd.set('new_status', targetStatus);
      }
      for (const item of replyImages) {
        fd.append('attachments', item.file);
      }

      const res = await addTicketReplyAction(fd);
      if (!res.success || !res.ticket) {
        setActionError(res.error || 'Failed to send reply.');
        setIsSending(false);
        return;
      }

      const updated = res.ticket;
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setReplyText('');
      setReplyStatus('');
      setReplyImages([]);
      router.refresh();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to send reply.');
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickStatusOrSeverityChange = async (
    ticket: SupportTicketRecord,
    newStatus: TicketStatus,
    newSeverity: TicketSeverity
  ) => {
    setIsSending(true);
    setActionError(null);
    try {
      const statusChanged = newStatus !== ticket.status;
      const severityChanged = newSeverity !== ticket.severity;
      let note = '';
      if (statusChanged && severityChanged) {
        note = `Admin updated status to "${STATUS_CONFIG[newStatus].label}" and severity to "${SEVERITY_CONFIG[newSeverity].label}".`;
      } else if (statusChanged) {
        note = `Admin updated status to "${STATUS_CONFIG[newStatus].label}".`;
      } else if (severityChanged) {
        note = `Admin changed severity level to "${SEVERITY_CONFIG[newSeverity].label}".`;
      }

      const res = await updateTicketStatusAction({
        ticketId: ticket.id,
        status: newStatus,
        severity: newSeverity,
        note,
      });

      if (res.success && res.ticket) {
        setTickets((prev) => prev.map((t) => (t.id === res.ticket!.id ? res.ticket! : t)));
        router.refresh();
      } else if (res.error) {
        setActionError(res.error);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteTicket = async (ticket: SupportTicketRecord) => {
    if (
      !window.confirm(
        `Delete ticket ${formatTicketRef(ticket.ticket_number, ticket.id)} ("${ticket.subject}")?`
      )
    ) {
      return;
    }
    setIsSending(true);
    try {
      const res = await deleteTicketAction(ticket.id);
      if (res.success) {
        const remaining = tickets.filter((t) => t.id !== ticket.id);
        setTickets(remaining);
        if (selectedTicketId === ticket.id) {
          setSelectedTicketId(remaining[0]?.id || null);
        }
        router.refresh();
      }
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch {}
  };

  return (
    <div className="space-y-8">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('needs_reply')}
          className={`text-left bg-white p-6 rounded-3xl border transition-all shadow-sm ${
            statusFilter === 'needs_reply'
              ? 'border-brand-pink ring-2 ring-brand-pink/15'
              : 'border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Awaiting Admin Reply
            </p>
            <span className="w-2.5 h-2.5 rounded-full bg-brand-pink animate-pulse" />
          </div>
          <p className="text-3xl font-black text-brand-dark">{needsReplyCount}</p>
          <p className="text-xs font-bold text-brand-pink mt-1">Customer replied last</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('all');
            setSeverityFilter(severityFilter === 'urgent' ? 'all' : 'urgent');
          }}
          className={`text-left bg-white p-6 rounded-3xl border transition-all shadow-sm ${
            severityFilter === 'urgent'
              ? 'border-rose-500 ring-2 ring-rose-500/15'
              : 'border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Urgent &amp; High Priority
            </p>
            <span className="text-sm">🔥</span>
          </div>
          <p className="text-3xl font-black text-rose-600">{urgentHighCount}</p>
          <p className="text-xs font-bold text-gray-400 mt-1">Open high/urgent tickets</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('in_progress')}
          className={`text-left bg-white p-6 rounded-3xl border transition-all shadow-sm ${
            statusFilter === 'in_progress'
              ? 'border-indigo-500 ring-2 ring-indigo-500/15'
              : 'border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Total Open / Active
            </p>
            <span className="text-sm">🛠️</span>
          </div>
          <p className="text-3xl font-black text-brand-dark">{activeCount}</p>
          <p className="text-xs font-bold text-indigo-600 mt-1">In triage or progress</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('resolved')}
          className={`text-left bg-white p-6 rounded-3xl border transition-all shadow-sm ${
            statusFilter === 'resolved'
              ? 'border-emerald-500 ring-2 ring-emerald-500/15'
              : 'border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Resolved &amp; Closed
            </p>
            <span className="text-sm">✅</span>
          </div>
          <p className="text-3xl font-black text-emerald-600">{resolvedCount}</p>
          <p className="text-xs font-bold text-gray-400 mt-1">Completed threads</p>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'All Tickets' },
              { id: 'needs_reply', label: `Needs Reply (${needsReplyCount})` },
              { id: 'open', label: 'Open' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'waiting_on_customer', label: 'Waiting on Customer' },
              { id: 'resolved', label: 'Resolved' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                statusFilter === tab.id
                  ? 'bg-brand-dark text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:text-brand-dark'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-black uppercase tracking-wider text-brand-dark focus:outline-none focus:border-brand-pink"
          >
            <option value="all">All Severities</option>
            <option value="urgent">🔴 Urgent Only</option>
            <option value="high">🟠 High Severity</option>
            <option value="medium">🔵 Medium Severity</option>
            <option value="low">⚪ Low Severity</option>
          </select>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search #TKT, subject, customer..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-brand-pink focus:outline-none text-xs font-bold text-brand-dark"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Split Workspace */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-gray-100 p-16 text-center space-y-3 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-brand-pink/10 text-brand-pink flex items-center justify-center text-2xl mx-auto">
            🎫
          </div>
          <h3 className="text-xl font-black text-brand-dark">No matching support tickets</h3>
          <p className="text-sm text-gray-400 font-medium max-w-md mx-auto">
            When customers raise tickets in the Builder or Account Support page, they will appear
            here with their full message chain and attachments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Pane: Tickets Queue */}
          <div className="lg:col-span-5 space-y-3 max-h-[820px] overflow-y-auto pr-1">
            {filteredTickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              const sevCfg = SEVERITY_CONFIG[t.severity] || SEVERITY_CONFIG.medium;
              const statCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
              const catCfg = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.general;
              const needsAdminReply =
                t.last_reply_by === 'customer' &&
                t.status !== 'resolved' &&
                t.status !== 'closed';
              const totalAttachments = t.messages.reduce(
                (acc, m) => acc + (m.attachment_urls?.length || 0),
                0
              );

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTicketId(t.id);
                    setActionError(null);
                  }}
                  className={`w-full text-left p-5 rounded-3xl border transition-all block ${
                    isSelected
                      ? 'bg-white border-brand-pink ring-2 ring-brand-pink/15 shadow-md'
                      : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-black text-gray-500">
                        {formatTicketRef(t.ticket_number, t.id)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${sevCfg.badgeBg} ${sevCfg.badgeText} ${sevCfg.badgeBorder}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${sevCfg.dotColor}`} />
                        {sevCfg.label}
                      </span>
                      {needsAdminReply && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest">
                          Needs Reply
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

                  <h3 className="text-base font-black text-brand-dark line-clamp-1 mb-1">
                    {t.subject}
                  </h3>

                  <p className="text-xs font-bold text-gray-500 truncate mb-2">
                    👤 {t.user_name || 'Customer'} •{' '}
                    <span className="text-brand-pink">{t.user_email}</span>
                  </p>

                  {t.messages.length > 0 && (
                    <p className="text-xs text-gray-500 line-clamp-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mb-3">
                      <span className="font-bold text-gray-700">
                        {t.messages[t.messages.length - 1].sender_role === 'admin'
                          ? 'You: '
                          : `${t.user_name || 'Customer'}: `}
                      </span>
                      {t.messages[t.messages.length - 1].message}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 pt-2 border-t border-gray-50">
                    <span>
                      {catCfg.emoji} {catCfg.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {totalAttachments > 0 && <span>🖼️ {totalAttachments}</span>}
                      <span>💬 {t.messages.length}</span>
                      <span>•</span>
                      <span>
                        {new Date(t.updated_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Pane: Active Ticket Thread & Admin Responder */}
          <div className="lg:col-span-7">
            {selectedTicket ? (
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {/* Admin Ticket Header & Controls */}
                <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50/50 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-brand-dark text-white font-mono text-xs font-black">
                          {formatTicketRef(selectedTicket.ticket_number, selectedTicket.id)}
                        </span>
                        <span className="text-xs font-bold text-gray-400">
                          {CATEGORY_CONFIG[selectedTicket.category]?.emoji}{' '}
                          {CATEGORY_CONFIG[selectedTicket.category]?.label}
                        </span>
                        {selectedTicket.mystery_title && (
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-black">
                            🎭 {selectedTicket.mystery_title}
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-black text-brand-dark">
                        {selectedTicket.subject}
                      </h2>
                    </div>

                    {/* Status & Severity Live Selectors */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                          Status
                        </label>
                        <select
                          disabled={isSending}
                          value={selectedTicket.status}
                          onChange={(e) =>
                            handleQuickStatusOrSeverityChange(
                              selectedTicket,
                              e.target.value as TicketStatus,
                              selectedTicket.severity
                            )
                          }
                          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-black uppercase tracking-wider text-brand-dark focus:outline-none focus:border-brand-pink"
                        >
                          {(Object.keys(STATUS_CONFIG) as TicketStatus[]).map((st) => (
                            <option key={st} value={st}>
                              {STATUS_CONFIG[st].label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                          Severity
                        </label>
                        <select
                          disabled={isSending}
                          value={selectedTicket.severity}
                          onChange={(e) =>
                            handleQuickStatusOrSeverityChange(
                              selectedTicket,
                              selectedTicket.status,
                              e.target.value as TicketSeverity
                            )
                          }
                          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-black uppercase tracking-wider text-brand-dark focus:outline-none focus:border-brand-pink"
                        >
                          {(Object.keys(SEVERITY_CONFIG) as TicketSeverity[]).map((sev) => (
                            <option key={sev} value={sev}>
                              {SEVERITY_CONFIG[sev].label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={() => handleDeleteTicket(selectedTicket)}
                          disabled={isSending}
                          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-rose-600 hover:border-rose-200 transition-colors"
                          title="Delete Ticket"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info Card */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-pink/10 text-brand-pink font-black text-sm flex items-center justify-center">
                        {(selectedTicket.user_name || selectedTicket.user_email || '?')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-black text-brand-dark">
                          {selectedTicket.user_name || 'Customer'}
                        </p>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                          <a
                            href={`mailto:${selectedTicket.user_email}?subject=Re:%20${encodeURIComponent(
                              `${formatTicketRef(selectedTicket.ticket_number, selectedTicket.id)} - ${selectedTicket.subject}`
                            )}`}
                            className="text-brand-pink hover:underline"
                          >
                            {selectedTicket.user_email}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedTicket.user_email)}
                            className="text-[10px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-black uppercase"
                          >
                            {copiedEmail === selectedTicket.user_email ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedTicket.user_id && (
                        <Link
                          href={`/${locale}/admin/users/${selectedTicket.user_id}`}
                          className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-brand-dark hover:text-white text-brand-dark text-[11px] font-black uppercase tracking-wider transition-all"
                        >
                          👤 Customer Profile →
                        </Link>
                      )}
                      {selectedTicket.mystery_id && (
                        <Link
                          href={`/${locale}/builder/mysteries/${selectedTicket.mystery_id}`}
                          className="px-3.5 py-2 rounded-xl bg-brand-pink/10 hover:bg-brand-pink hover:text-white text-brand-pink text-[11px] font-black uppercase tracking-wider transition-all"
                        >
                          🛠️ Open in Builder →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chronological Text Chain */}
                <div className="p-6 sm:p-8 space-y-5 max-h-[500px] overflow-y-auto bg-slate-50/40">
                  {selectedTicket.messages.map((msg, idx) => {
                    const isAdminMsg = msg.sender_role === 'admin';
                    return (
                      <div key={msg.id || idx} className="space-y-2">
                        {msg.status_change_to && (
                          <div className="flex items-center justify-center my-2">
                            <span className="px-3.5 py-1 rounded-full bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-2xs">
                              Status changed to{' '}
                              <span className="text-brand-pink">
                                {STATUS_CONFIG[msg.status_change_to]?.label ||
                                  msg.status_change_to}
                              </span>
                            </span>
                          </div>
                        )}

                        <div
                          className={`flex flex-col ${
                            isAdminMsg ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div
                            className={`max-w-[90%] sm:max-w-[82%] rounded-2xl p-5 border ${
                              isAdminMsg
                                ? 'bg-brand-dark text-white border-brand-dark rounded-tr-sm shadow-md'
                                : 'bg-white text-gray-800 border-gray-200 rounded-tl-sm shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4 mb-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                    isAdminMsg
                                      ? 'bg-brand-pink text-white'
                                      : 'bg-gray-100 text-brand-dark'
                                  }`}
                                >
                                  {isAdminMsg ? 'Admin Reply' : 'Customer'}
                                </span>
                                <span
                                  className={`text-xs font-black ${
                                    isAdminMsg ? 'text-white' : 'text-brand-dark'
                                  }`}
                                >
                                  {msg.sender_name ||
                                    (isAdminMsg
                                      ? 'Back Pocket Support'
                                      : selectedTicket.user_name || 'Customer')}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-gray-400">
                                {new Date(msg.created_at).toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <p
                              className={`text-sm leading-relaxed whitespace-pre-wrap ${
                                isAdminMsg ? 'text-gray-100' : 'text-gray-700'
                              }`}
                            >
                              {msg.message}
                            </p>

                            {msg.attachment_urls && msg.attachment_urls.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 pt-3 border-t border-gray-200/20">
                                {msg.attachment_urls.map((url, aIdx) => {
                                  if (isImageUrl(url)) {
                                    return (
                                      <button
                                        key={aIdx}
                                        type="button"
                                        onClick={() => setLightboxUrl(url)}
                                        className="group relative aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-100 block"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={url}
                                          alt={`Attachment ${aIdx + 1}`}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                          <span className="opacity-0 group-hover:opacity-100 px-2.5 py-1 rounded-full bg-white text-brand-dark text-[10px] font-black uppercase tracking-wider">
                                            Inspect
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
                                          : 'bg-gray-50 border-gray-200 text-brand-dark hover:border-brand-pink'
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

                {/* Admin Reply & Update Composer */}
                <form
                  onSubmit={(e) => handleAdminReply(e)}
                  className="p-6 bg-white border-t border-gray-100 space-y-4"
                >
                  {actionError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                      {actionError}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-brand-dark">
                      Respond to Customer &amp; Update Thread
                    </label>
                    <span className="text-[11px] font-bold text-gray-400">
                      Emails customer from <span className="text-brand-pink">{SUPPORT_EMAIL}</span>
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Write a response or status update to ${
                      selectedTicket.user_name || selectedTicket.user_email
                    }...`}
                    className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50/70 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-medium text-brand-dark leading-relaxed transition-colors"
                  />

                  {replyImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {replyImages.map((img, idx) =>
                        img.isImage ? (
                          <div
                            key={idx}
                            className="relative w-24 h-16 rounded-xl overflow-hidden border border-gray-200"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.previewUrl}
                              alt="Admin attachment"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeReplyImage(idx)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-brand-dark text-white text-xs flex items-center justify-center"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-brand-dark"
                          >
                            <span className="text-[10px] font-black uppercase text-brand-pink">
                              {(img.file.name.split('.').pop() || 'FILE').slice(0, 5)}
                            </span>
                            <span className="max-w-[140px] truncate">{img.file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeReplyImage(idx)}
                              className="text-gray-400 hover:text-rose-600 font-black"
                            >
                              ×
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            addReplyFiles(e.target.files);
                            e.target.value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:border-brand-pink hover:text-brand-pink text-xs font-bold transition-all inline-flex items-center gap-1.5"
                      >
                        <span>Attach Files</span>
                      </button>

                      <select
                        value={replyStatus}
                        onChange={(e) => setReplyStatus(e.target.value as any)}
                        className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700 focus:outline-none focus:border-brand-pink"
                      >
                        <option value="">Status on send: Auto (In Progress)</option>
                        <option value="in_progress">Set to: In Progress</option>
                        <option value="waiting_on_customer">Set to: Waiting on Customer</option>
                        <option value="resolved">Set to: Resolved</option>
                        <option value="closed">Set to: Closed</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {selectedTicket.status !== 'resolved' && (
                        <button
                          type="button"
                          disabled={isSending}
                          onClick={(e) => handleAdminReply(e as any, 'resolved')}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          {replyText.trim() ? 'Send & Resolve ✓' : 'Mark Resolved ✓'}
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={isSending}
                        className="px-6 py-2.5 rounded-xl bg-brand-pink hover:bg-brand-dark text-white text-xs font-black uppercase tracking-widest transition-all shadow-md disabled:opacity-50"
                      >
                        {isSending ? 'Sending...' : 'Send Reply →'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-[32px] border border-gray-100 p-16 text-center text-gray-400 font-bold">
                Select a ticket on the left to inspect and reply.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 px-3 py-1 rounded-full bg-white text-brand-dark text-xs font-black uppercase tracking-widest"
            >
              Close ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Attachment Preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
