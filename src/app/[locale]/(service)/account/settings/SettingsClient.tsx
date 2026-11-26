'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  updateProfile,
  updateRegionalSettings,
  updateNotificationSettings,
  updatePassword,
  deleteAccount,
} from './actions';
import { resendConfirmationEmail } from '@/app/actions/email-confirmation';
import { formatDate } from '@/utils/date';

interface OrderItem {
  id: string;
  mysteryId: string;
  mysteryTitle: string;
  mysteryTheme: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface SettingsClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    emailVerified: boolean;
    currency: string;
    country: string;
    timezone: string;
    referralCode?: string;
    referralLink?: string;
    referralsCompletedCount?: number;
    rewardVouchers?: Array<{
      code: string;
      discountPercent: number;
      used: boolean;
      referredEmail?: string;
    }>;
    appliedSignupPromo?: string | null;
    billing: {
      companyName: string;
      addressLine1: string;
      city: string;
      postalCode: string;
      billingCountry: string;
      taxId: string;
    };
    hostingPreferences: {
      defaultDelivery: 'email' | 'print' | 'both';
      complexityDefault: 'easy' | 'medium' | 'hard';
      spiceDefault: 'clean' | 'mild' | 'spicy' | 'filthy';
      largePrintPdf: boolean;
      dyslexiaFont: boolean;
    };
    notificationSettings: {
      mysteryUpdates: boolean;
      guestRsvpAlerts: boolean;
      eventReminders: boolean;
      referralRewards: boolean;
      marketingOffers: boolean;
      hostingTips: boolean;
    };
  };
  orders: OrderItem[];
  guests: any[];
  locale: string;
}

const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'NZD', symbol: 'NZ$', label: 'New Zealand Dollar' },
];

function Section({
  id,
  title,
  description,
  icon,
  children,
  badge,
  footerNote,
  footerAction,
}: {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
  footerNote?: string;
  footerAction?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden scroll-mt-8 shadow-[0_1px_3px_rgba(15,23,42,0.03),0_10px_30px_-10px_rgba(15,23,42,0.04)] transition-shadow"
    >
      <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900/[0.04] border border-slate-200/60 text-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
            {icon}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              {title}
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        {badge && <div className="flex-shrink-0">{badge}</div>}
      </div>

      <div className="p-6 space-y-5">{children}</div>

      {(footerNote || footerAction) && (
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500 font-medium">{footerNote}</p>
          {footerAction && <div className="flex justify-end">{footerAction}</div>}
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  children,
  hint,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[13px] font-semibold text-slate-700">{label}</label>
        {optional && (
          <span className="text-[11px] font-medium text-slate-400">Optional</span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  description,
  icon,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div>
          <p className="font-semibold text-sm text-slate-900">{label}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-lg">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
          checked ? 'bg-slate-900' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsClient({ user, orders, guests, locale }: SettingsClientProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>('account-currency');

  // 1. Account & Currency
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [currency, setCurrency] = useState(user.currency || 'USD');
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [accountError, setAccountError] = useState('');

  // Email verification
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState('');

  // 2. Vouchers & Referral
  const personalReferralCode = user.referralCode || 'FRIEND5';
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [vouchers, setVouchers] = useState<Array<{ code: string; discount: string; status: string }>>(() => {
    const list: Array<{ code: string; discount: string; status: string }> = [
      {
        code: personalReferralCode,
        discount: 'Give £5, Get £5 (Your Personal Share Code)',
        status: user.referralsCompletedCount
          ? `${user.referralsCompletedCount} friend(s) referred (+£${(user.referralsCompletedCount * 5).toFixed(2)} earned)`
          : 'Share with friends to give £5 & earn £5 credit',
      },
    ];
    if (user.rewardVouchers && user.rewardVouchers.length > 0) {
      for (const rv of user.rewardVouchers) {
        list.unshift({
          code: rv.code,
          discount: `${rv.discountPercent}% Off Referral Reward`,
          status: rv.used ? 'Used' : 'Unlocked • Ready for checkout',
        });
      }
    }
    if (user.appliedSignupPromo) {
      list.unshift({
        code: user.appliedSignupPromo,
        discount: 'Welcome / Friend Promo Code',
        status: 'Saved • Auto-applies at checkout',
      });
    }
    return list;
  });
  const [voucherMessage, setVoucherMessage] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [creditBalanceGbp, setCreditBalanceGbp] = useState<number>(
    (user as any).creditBalanceGbp || 0
  );
  const [referralCopied, setReferralCopied] = useState(false);

  // 3. Email Preferences
  const [orderAndPartyAlerts, setOrderAndPartyAlerts] = useState(
    user.notificationSettings.mysteryUpdates ?? true
  );
  const [marketingAndTips, setMarketingAndTips] = useState(
    user.notificationSettings.marketingOffers ?? true
  );
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // 4. Password & Account Deletion
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAckChecked, setDeleteAckChecked] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const inputClass =
    'w-full bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all shadow-2xs';

  const referralLink =
    user.referralLink ||
    `https://backpocketmysteries.com/${locale}/login?promo=${encodeURIComponent(
      personalReferralCode
    )}&step=signup`;

  const handleResendConfirmation = async () => {
    setResendLoading(true);
    setResendError('');
    const result = await resendConfirmationEmail();
    setResendLoading(false);
    if (result.error) setResendError(result.error);
    else setResendSent(true);
  };

  const handleSaveAccountAndCurrency = async () => {
    setAccountLoading(true);
    setAccountError('');
    const [profileRes, regionalRes] = await Promise.all([
      updateProfile(name, email, phone),
      updateRegionalSettings({
        currency,
        locale,
        country: user.country || 'United States',
        timezone: user.timezone || 'Europe/London',
      }),
    ]);
    setAccountLoading(false);

    if (profileRes.error || regionalRes.error) {
      setAccountError(profileRes.error || regionalRes.error || 'Failed to save changes.');
      return;
    }

    document.cookie = `NEXT_CURRENCY=${currency}; path=/; max-age=31536000; SameSite=Lax`;
    setAccountSaved(true);
    setTimeout(() => setAccountSaved(false), 3000);
    router.refresh();
  };

  const handleApplyVoucher = async () => {
    const code = voucherCodeInput.trim().toUpperCase();
    if (!code) return;
    setVoucherMessage('');
    setVoucherError('');

    if (code === personalReferralCode) {
      setVoucherError('You cannot use your own referral code. Share it with a friend to give £5 & get £5!');
      return;
    }

    try {
      const { claimFriendReferralCodeForCreditAction } = await import('@/app/actions/referrals');
      const claimRes = await claimFriendReferralCodeForCreditAction(code);
      if (claimRes.matched) {
        if (!claimRes.success) {
          setVoucherError(claimRes.error || 'Could not apply referral code.');
          return;
        }
        if (typeof claimRes.newCreditBalanceGbp === 'number') {
          setCreditBalanceGbp(claimRes.newCreditBalanceGbp);
        } else {
          setCreditBalanceGbp((prev) => prev + (claimRes.creditAddedGbp || 5));
        }
        setVouchers((prev) => [
          {
            code,
            discount: `£5.00 Friend Referral Credit (from ${claimRes.referrerName || 'Friend'})`,
            status: '+£5.00 Added to Account Credits ✓',
          },
          ...prev,
        ]);
        setVoucherCodeInput('');
        setVoucherMessage(
          `✓ ${claimRes.message || '£5.00 referral credit added to your account!'}`
        );
        return;
      }
    } catch {
      // Fall through to standard voucher check
    }

    if (vouchers.some((v) => v.code === code)) {
      setVoucherError('This code is already in your wallet.');
      return;
    }
    const { verifySignupPromoCodeAction } = await import('@/app/[locale]/(auth)/actions');
    const res = await verifySignupPromoCodeAction(code);
    if (!res.valid) {
      setVoucherError(res.error || 'Invalid or expired promo code.');
      return;
    }
    document.cookie = `BPM_PROMO_CODE=${encodeURIComponent(code)}; path=/; max-age=7776000; SameSite=Lax`;
    setVouchers((prev) => [
      {
        code,
        discount: res.label || 'Promo Voucher',
        status: 'Active • Auto-applies at checkout',
      },
      ...prev,
    ]);
    setVoucherCodeInput('');
    setVoucherMessage(`✓ ${res.label || `Voucher "${code}" added to your account!`}`);
    setTimeout(() => setVoucherMessage(''), 5000);
  };

  const handleSaveNotifs = async () => {
    setNotifLoading(true);
    await updateNotificationSettings({
      mysteryUpdates: orderAndPartyAlerts,
      guestRsvpAlerts: orderAndPartyAlerts,
      eventReminders: orderAndPartyAlerts,
      referralRewards: orderAndPartyAlerts,
      marketingOffers: marketingAndTips,
      hostingTips: marketingAndTips,
    });
    setNotifLoading(false);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) return;
    setPasswordLoading(true);
    setPasswordError('');
    const result = await updatePassword(currentPassword, newPassword);
    setPasswordLoading(false);
    if (result.error) setPasswordError(result.error);
    else {
      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSaved(false), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAckChecked || deleteInput !== 'DELETE') return;
    setDeleteLoading(true);
    setDeleteError('');
    const result = await deleteAccount();
    if (result.error) {
      setDeleteLoading(false);
      setDeleteError(result.error);
    } else router.push('/');
  };

  const SaveBtn = ({
    onClick,
    loading,
    saved,
    disabled,
    label = 'Save Changes',
  }: {
    onClick: () => void;
    loading: boolean;
    saved: boolean;
    disabled?: boolean;
    label?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-2xs ${
        saved
          ? 'bg-emerald-600 text-white'
          : 'bg-[#1e191c] hover:bg-slate-800 text-white'
      }`}
    >
      {loading ? (
        'Saving...'
      ) : saved ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Saved</span>
        </>
      ) : (
        label
      )}
    </button>
  );

  const navItems = [
    {
      id: 'account-currency',
      label: 'Account & Currency',
      sublabel: 'Profile details & shop currency',
      badge: currency,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      id: 'vouchers-referrals',
      label: 'Credits & Referrals',
      sublabel: 'Give £5, Get £5 & promo wallet',
      badge: `£${creditBalanceGbp.toFixed(0)}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <path d="M13 5v2" />
          <path d="M13 17v2" />
          <path d="M13 11v2" />
        </svg>
      ),
    },
    {
      id: 'email-preferences',
      label: 'Email Preferences',
      sublabel: 'Party alerts & launch updates',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
    },
    {
      id: 'password-security',
      label: 'Password & Security',
      sublabel: 'Credentials & account privacy',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
  ];

  const initials = (name || user.email || 'H')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fe04c6]" />
            <span>Account Preferences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Settings
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your host profile, display currency, referral vouchers, and account security.
          </p>
        </div>

        {/* Mobile / Tablet Quick Jump Pills */}
        <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActiveSection(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-[#1e191c] text-white border-[#1e191c]'
                    : 'bg-white text-slate-600 border-slate-200/80 hover:text-slate-900'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </div>

      {/* Balanced Two-Column Layout: Sticky Settings Side Menu + Cards */}
      <div className="flex flex-col lg:flex-row items-start gap-7">
        {/* Sticky Left Settings Side Menu */}
        <aside className="w-64 xl:w-72 flex-shrink-0 hidden lg:block sticky top-8 space-y-4">
          {/* Host Overview Card inside Side Menu */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1e191c] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {name || 'Host Account'}
                  </p>
                </div>
                <p className="text-xs text-slate-500 truncate">{email}</p>
              </div>
            </div>

            <div className="mt-3.5 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-2">
              <div className="bg-slate-50/80 rounded-xl px-3 py-2 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Currency
                </p>
                <p className="text-xs font-extrabold text-slate-900 mt-0.5">{currency}</p>
              </div>
              <div className="bg-slate-50/80 rounded-xl px-3 py-2 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Guest Roster
                </p>
                <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                  {guests.length} {guests.length === 1 ? 'Guest' : 'Guests'}
                </p>
              </div>
            </div>
          </div>

          {/* Section Navigation */}
          <nav className="bg-white border border-slate-200/80 rounded-2xl p-2 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-1">
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Sections
            </p>
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setActiveSection(item.id)}
                  className={`group flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex-shrink-0 transition-colors ${
                        isActive ? 'text-[#fe04c6]' : 'text-slate-400 group-hover:text-slate-700'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{item.label}</p>
                      <p
                        className={`text-[11px] truncate ${
                          isActive ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {item.sublabel}
                      </p>
                    </div>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0 ${
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </a>
              );
            })}

            <div className="my-1.5 border-t border-slate-100" />

            <Link
              href={`/${locale}/account/profile`}
              className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <span className="flex items-center gap-2.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-400"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Profile &amp; Guest Roster</span>
              </span>
              <span className="text-slate-400">→</span>
            </Link>
          </nav>
        </aside>

        {/* Main Settings Cards Column */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* Email Verification Status Banner (only shown if unverified) */}
          {!user.emailVerified && (
            <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-950">Email not yet verified</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Verify your email address to unlock mystery purchases and automated guest invites.
                  </p>
                  {resendSent && (
                    <p className="text-xs font-bold text-emerald-700 mt-1.5">
                      ✓ Confirmation email sent!
                    </p>
                  )}
                  {resendError && (
                    <p className="text-xs font-bold text-red-600 mt-1.5">{resendError}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleResendConfirmation}
                disabled={resendLoading || resendSent}
                className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors whitespace-nowrap flex-shrink-0 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
              >
                {resendLoading ? 'Sending...' : resendSent ? 'Sent ✓' : 'Resend Verification'}
              </button>
            </div>
          )}

          {/* 1. Account & Currency */}
          <Section
            id="account-currency"
            title="Account & Currency"
            description="Update your host display name, contact details, and preferred shop currency."
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
            badge={
              user.emailVerified ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Verified Host
                </span>
              ) : undefined
            }
            footerNote="Prices across the shop and checkout automatically display in your selected currency."
            footerAction={
              <SaveBtn
                onClick={handleSaveAccountAndCurrency}
                loading={accountLoading}
                saved={accountSaved}
              />
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    className={`${inputClass} pl-10`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
              </Field>
              <Field label="Phone Number" optional>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <input
                    className={`${inputClass} pl-10`}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 7700 900000"
                  />
                </div>
              </Field>
            </div>

            <Field
              label="Email Address"
              hint="Changing your email address will send a confirmation link to the new address."
            >
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  className={`${inputClass} pl-10 pr-24`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
                {user.emailVerified && email === user.email && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    Verified
                  </span>
                )}
              </div>
            </Field>

            <Field label="Preferred Currency">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {CURRENCY_OPTIONS.map((opt) => {
                  const active = currency === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setCurrency(opt.code)}
                      className={`group px-3.5 py-2.5 rounded-xl text-left border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        active
                          ? 'border-slate-900 bg-slate-900/[0.03] ring-1 ring-slate-900 shadow-2xs'
                          : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center flex-shrink-0 transition-colors ${
                            active
                              ? 'bg-[#1e191c] text-white'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200/70'
                          }`}
                        >
                          {opt.symbol}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 leading-tight">
                            {opt.code}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                            {opt.label}
                          </p>
                        </div>
                      </div>
                      {active && (
                        <span className="w-2 h-2 rounded-full bg-[#fe04c6] flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </Field>

            {accountError && <p className="text-xs text-red-600 font-bold">{accountError}</p>}
          </Section>

          {/* 2. Credits, Give £5 Get £5 Referral Rewards & Vouchers */}
          <Section
            id="vouchers-referrals"
            title="Account Credits & Referrals (Give £5, Get £5)"
            description="Share your personal referral code so your friend gets a £5 credit and you get £5 in account credits too."
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                <path d="M13 5v2" />
                <path d="M13 17v2" />
                <path d="M13 11v2" />
              </svg>
            }
            badge={
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-extrabold border ${
                  creditBalanceGbp > 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                💷 Available Credit: £{creditBalanceGbp.toFixed(2)}
              </span>
            }
          >
            {/* Sleek Dark Referral Banner */}
            <div className="rounded-xl bg-[#1e191c] text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[#fe04c6]">
                  <span>✦ Give £5 • Get £5 Account Credit</span>
                </div>
                <p className="text-sm font-bold text-white">
                  Share your personal referral link with friends
                </p>
                <p className="text-xs text-white/60">
                  Code: <span className="font-mono font-bold text-white">{personalReferralCode}</span> • Both you &amp; your friend get £5.00 credit towards any mystery
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  setReferralCopied(true);
                  setTimeout(() => setReferralCopied(false), 2000);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition-colors self-start sm:self-auto flex-shrink-0 cursor-pointer shadow-xs"
              >
                {referralCopied ? 'Copied Link ✓' : 'Copy £5 Referral Link'}
              </button>
            </div>

            {/* Redeem Voucher Bar */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Redeem a Friend&apos;s Referral Code or Promo Voucher
              </label>
              <div className="flex gap-2">
                <input
                  className={`${inputClass} uppercase tracking-wider font-semibold`}
                  placeholder="Enter friend's referral code (e.g. FRIEND5-XXXX) or voucher"
                  value={voucherCodeInput}
                  onChange={(e) => setVoucherCodeInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  className="px-5 py-2.5 bg-[#1e191c] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex-shrink-0"
                >
                  Apply Code
                </button>
              </div>
              {voucherMessage && (
                <p className="text-xs font-bold text-emerald-600 mt-2">{voucherMessage}</p>
              )}
              {voucherError && (
                <p className="text-xs font-bold text-red-600 mt-2">{voucherError}</p>
              )}
            </div>

            {/* Active Vouchers List */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">
                Your Voucher Wallet ({vouchers.length})
              </p>
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/40">
                {vouchers.map((v) => (
                  <div
                    key={v.code}
                    className="px-4 py-3 flex items-center justify-between gap-3 bg-white hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                        %
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-900 font-mono">
                          {v.code}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{v.discount}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md shrink-0">
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {orders.length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-semibold text-slate-500">
                  Order History ({orders.length})
                </p>
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {order.mysteryTitle}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              order.status === 'succeeded'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {order.status === 'succeeded' ? 'Paid' : order.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          #{order.id.slice(0, 8).toUpperCase()} • {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-900 text-xs">
                          {(order.amount / 100).toFixed(2)} {order.currency}
                        </span>
                        <Link
                          href={`/${locale}/account/orders`}
                          className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700 transition-colors"
                        >
                          Open Story →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* 3. Email Preferences */}
          <Section
            id="email-preferences"
            title="Email Preferences"
            description="Choose which updates and party notifications you receive."
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            }
            footerNote="Transactional receipts and password reset emails are always delivered."
            footerAction={
              <SaveBtn
                onClick={handleSaveNotifs}
                loading={notifLoading}
                saved={notifSaved}
                label="Save Preferences"
              />
            }
          >
            <div className="divide-y divide-slate-100">
              <Toggle
                label="Order, Party & Guest RSVP Alerts"
                description="Essential updates when your custom mystery finishes generating, guests accept character invites, or referral vouchers unlock."
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                }
                checked={orderAndPartyAlerts}
                onChange={setOrderAndPartyAlerts}
              />
              <Toggle
                label="New Mystery Themes, Hosting Tips & Exclusive Offers"
                description="Early access to new mystery base packs, seasonal discounts, and dinner party hosting guides."
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                }
                checked={marketingAndTips}
                onChange={setMarketingAndTips}
              />
            </div>
          </Section>

          {/* 4. Password & Security */}
          <Section
            id="password-security"
            title="Password & Security"
            description="Update your account password or manage permanent account deletion."
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
            footerNote="Use at least 8 characters with a mix of letters and numbers."
            footerAction={
              <SaveBtn
                onClick={handleSavePassword}
                loading={passwordLoading}
                saved={passwordSaved}
                disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
                label="Update Password"
              />
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Current Password">
                <input
                  className={inputClass}
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <Field label="New Password">
                <input
                  className={inputClass}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <Field label="Confirm Password">
                <input
                  className={inputClass}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-600 font-bold">Passwords don&apos;t match.</p>
            )}
            {passwordError && <p className="text-xs text-red-600 font-bold">{passwordError}</p>}

            {/* Compact Delete Account Zone */}
            <div className="pt-5 border-t border-slate-100">
              {!showDeleteConfirm ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200/70">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Delete Account</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Permanently remove your account, custom mysteries, and saved guest roster.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setDeleteAckChecked(false);
                      setDeleteInput('');
                      setDeleteError('');
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors cursor-pointer self-start sm:self-auto flex-shrink-0"
                  >
                    Delete Account
                  </button>
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-red-50/70 border border-red-200 space-y-3.5">
                  <div className="flex items-center gap-2 text-red-700 font-extrabold text-xs uppercase tracking-wider">
                    <span>⚠️</span>
                    <span>Permanent Account &amp; Mystery Deletion Warning</span>
                  </div>
                  <p className="text-xs text-red-900 font-medium leading-relaxed">
                    Are you sure? Deleting your account is <strong>permanent and irreversible</strong>. The following will be immediately erased:
                  </p>
                  <ul className="space-y-1.5 text-xs text-red-800 font-medium pl-1">
                    <li className="flex items-start gap-2">
                      <span className="font-black text-red-600 shrink-0">•</span>
                      <span>
                        <strong>All Purchased &amp; Custom Mysteries ({orders.length} {orders.length === 1 ? 'pack' : 'packs'}):</strong> Every custom mystery pack you have purchased or created—including all AI-generated character portraits, crime-scene clue photos, audio wiretaps, printable PDFs, and active 6-digit Game PIN Playrooms—will be permanently deleted.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-black text-red-600 shrink-0">•</span>
                      <span>
                        <strong>Your Saved Guest Roster ({guests.length} {guests.length === 1 ? 'guest' : 'guests'}):</strong> All saved friend profiles, uploaded guest photos, and character preferences will be permanently wiped.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-black text-red-600 shrink-0">•</span>
                      <span>
                        <strong>Unused Vouchers, Referral Credits &amp; 60-Day Quarantine:</strong> Your account will be immediately deactivated and signed out. We hold an encrypted backup for <strong>60 days</strong> in case you contact <span className="underline">hello@backpocketgames.com</span> to request reinstatement, after which all data is permanently purged.
                      </span>
                    </li>
                  </ul>

                  <label className="flex items-start gap-2.5 pt-2 border-t border-red-200/80 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={deleteAckChecked}
                      onChange={(e) => setDeleteAckChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer shrink-0"
                    />
                    <span className="text-xs font-bold text-red-950 leading-snug">
                      I understand that all of my purchased mysteries, generated clues, and saved guests will be permanently deleted and cannot be recovered.
                    </span>
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <input
                      className="flex-1 bg-white border border-red-200 rounded-xl px-3.5 py-2 text-xs font-bold text-red-600 outline-none"
                      placeholder="Type DELETE to confirm"
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteAckChecked(false);
                        setDeleteInput('');
                        setDeleteError('');
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={!deleteAckChecked || deleteInput !== 'DELETE' || deleteLoading}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      {deleteLoading ? 'Deleting...' : 'Permanently Delete'}
                    </button>
                  </div>
                  {deleteError && <p className="text-xs text-red-600 font-bold">{deleteError}</p>}
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
