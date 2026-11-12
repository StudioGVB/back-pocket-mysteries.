export const SUPPORT_EMAIL = 'hello@backpocketgames.com';

export type TicketSeverity = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_on_customer'
  | 'resolved'
  | 'closed';
export type TicketCategory =
  | 'bug'
  | 'mystery_content'
  | 'billing'
  | 'feature_request'
  | 'general';
export type TicketSenderRole = 'customer' | 'admin' | 'system';

export interface TicketMessageRecord {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_role: TicketSenderRole;
  sender_name: string | null;
  message: string;
  attachment_urls: string[];
  status_change_to: TicketStatus | null;
  created_at: string;
}

export interface SupportTicketRecord {
  id: string;
  ticket_number: number;
  user_id: string | null;
  user_name: string | null;
  user_email: string;
  mystery_id: string | null;
  mystery_title?: string | null;
  category: TicketCategory;
  subject: string;
  severity: TicketSeverity;
  status: TicketStatus;
  last_reply_by: 'customer' | 'admin';
  created_at: string;
  updated_at: string;
  messages: TicketMessageRecord[];
}

export function formatTicketRef(ticketNumber?: number, id?: string): string {
  if (typeof ticketNumber === 'number' && ticketNumber > 0) {
    return `#TKT-${String(ticketNumber).padStart(4, '0')}`;
  }
  if (id) {
    return `#TKT-${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()}`;
  }
  return '#TKT-0001';
}

export const SEVERITY_CONFIG: Record<
  TicketSeverity,
  {
    label: string;
    shortDesc: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotColor: string;
    rank: number;
  }
> = {
  low: {
    label: 'Low',
    shortDesc: 'Minor question, cosmetic tweak, or general feedback',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    dotColor: 'bg-slate-400',
    rank: 1,
  },
  medium: {
    label: 'Medium',
    shortDesc: 'Standard issue or help needed with setup / customization',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    dotColor: 'bg-blue-500',
    rank: 2,
  },
  high: {
    label: 'High',
    shortDesc: 'Important feature broken or upcoming party prep affected',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    dotColor: 'bg-amber-500',
    rank: 3,
  },
  urgent: {
    label: 'Urgent',
    shortDesc: 'Live party in progress or critical game blocker',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    dotColor: 'bg-rose-500',
    rank: 4,
  },
};

export const STATUS_CONFIG: Record<
  TicketStatus,
  {
    label: string;
    customerLabel: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotColor: string;
  }
> = {
  open: {
    label: 'Open',
    customerLabel: 'Open - Awaiting Review',
    badgeBg: 'bg-pink-50',
    badgeText: 'text-brand-pink',
    badgeBorder: 'border-pink-200',
    dotColor: 'bg-brand-pink',
  },
  in_progress: {
    label: 'In Progress',
    customerLabel: 'In Progress - Being Investigated',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    dotColor: 'bg-indigo-500',
  },
  waiting_on_customer: {
    label: 'Waiting on Customer',
    customerLabel: 'Action Needed - Reply Requested',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  resolved: {
    label: 'Resolved',
    customerLabel: 'Resolved',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  closed: {
    label: 'Closed',
    customerLabel: 'Closed',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-600',
    badgeBorder: 'border-slate-200',
    dotColor: 'bg-slate-400',
  },
};

export const CATEGORY_CONFIG: Record<TicketCategory, { label: string; emoji: string }> = {
  bug: { label: 'Bug / Technical Issue', emoji: '🐛' },
  mystery_content: { label: 'Mystery Story, Clues & Cast', emoji: '🕵️' },
  billing: { label: 'Orders, Billing & Access PIN', emoji: '💳' },
  feature_request: { label: 'Feature Request / Feedback', emoji: '💡' },
  general: { label: 'General Support Question', emoji: '💬' },
};
