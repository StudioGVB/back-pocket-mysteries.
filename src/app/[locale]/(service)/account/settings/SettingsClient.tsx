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
  title,
  description,
  children,
  badge,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
      <div className="p-7 sm:p-8 border-b border-slate-50">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-slate-900 mb-1">{title}</h2>
          {badge && (
            <span
              className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
              style={{ background: 'rgba(254,4,198,0.1)', color: '#fe04c6' }}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400 font-medium">{description}</p>
      </div>
      <div className="p-7 sm:p-8 space-y-6">{children}</div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-bold text-sm text-slate-900">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
          checked ? 'bg-brand-pink' : 'bg-slate-200'
        }`}
        style={{ background: checked ? '#fe04c6' : undefined }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsClient({ user, orders, guests, locale }: SettingsClientProps) {
  const router = useRouter();

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
  const personalReferralCode = user.referralCode || 'FRIEND20';
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [vouchers, setVouchers] = useState<Array<{ code: string; discount: string; status: string }>>(() => {
    const list: Array<{ code: string; discount: string; status: string }> = [
      {
        code: personalReferralCode,
        discount: 'Give 20% Off, Get 20% Off (Your Personal Share Code)',
        status: user.referralsCompletedCount
          ? `${user.referralsCompletedCount} friend(s) referred`
          : 'Share with friends to unlock 20% off',
      },
    ];
    if (user.rewardVouchers && user.rewardVouchers.length > 0) {
      for (const rv of user.rewardVouchers) {
        list.unshift({
          code: rv.code,
          discount: `${rv.discountPercent}% Off Referral Reward`,
          status: rv.used ? 'Used' : 'Unlocked - Ready for checkout!',
        });
      }
    }
    if (user.appliedSignupPromo) {
      list.unshift({
        code: user.appliedSignupPromo,
        discount: 'Welcome / Friend Promo Code',
        status: 'Saved - Auto-applies at checkout',
      });
    }
    return list;
  });
  const [voucherMessage, setVoucherMessage] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);

  // 3. Email Preferences (2 simplified toggles)
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
    'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none transition-all';

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
    if (vouchers.some((v) => v.code === code)) {
      setVoucherMessage('This code is already in your wallet.');
      return;
    }
    const { verifySignupPromoCodeAction } = await import('@/app/[locale]/(auth)/actions');
    const res = await verifySignupPromoCodeAction(code);
    if (!res.valid) {
      setVoucherMessage(res.error || 'Invalid or expired promo code.');
      return;
    }
    document.cookie = `BPM_PROMO_CODE=${encodeURIComponent(code)}; path=/; max-age=7776000; SameSite=Lax`;
    setVouchers((prev) => [
      {
        code,
        discount: res.label || '20% Off Voucher',
        status: 'Active - Auto-applies at checkout',
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
  }: {
    onClick: () => void;
    loading: boolean;
    saved: boolean;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className="px-6 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-40 border-2 cursor-pointer"
      style={{
        borderColor: saved ? '#10b981' : '#fe04c6',
        color: saved ? '#10b981' : '#fe04c6',
        background: 'transparent',
      }}
    >
      {loading ? 'Saving...' : saved ? 'Saved ✓' : 'Save Changes'}
    </button>
  );

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 mb-2">Settings</h1>
        <p className="text-slate-500 font-medium text-base">
          Manage your account details, currency, vouchers, email preferences, and password.
        </p>
      </div>

      <div className="space-y-7">
        {/* Email Verification Status Banner (only shown if unverified) */}
        {!user.emailVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 sm:p-7 flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 text-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div>
                <p className="font-black text-amber-900 mb-1">Email not yet verified</p>
                <p className="text-sm text-amber-700">Verify your email to unlock purchasing mysteries.</p>
                {resendSent && <p className="text-sm font-bold text-emerald-600 mt-2">✓ Confirmation email sent!</p>}
                {resendError && <p className="text-sm font-bold text-red-500 mt-2">{resendError}</p>}
              </div>
            </div>
            <button
              onClick={handleResendConfirmation}
              disabled={resendLoading || resendSent}
              className="px-4 py-2 text-xs font-black text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors whitespace-nowrap flex-shrink-0 disabled:opacity-50"
            >
              {resendLoading ? 'Sending...' : resendSent ? 'Sent ✓' : 'Resend Email'}
            </button>
          </div>
        )}

        {/* 1. Account & Currency */}
        <Section
          title="Account & Currency"
          description="Update your host display name, contact details, and preferred currency."
          badge={user.emailVerified ? 'Verified Host ✓' : undefined}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </Field>
            <Field label="Phone Number (Optional)">
              <input
                className={inputClass}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44 7700 900000"
              />
            </Field>
          </div>

          <Field label="Email Address" hint="Changing your email address will require re-verification.">
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </Field>

          <Field label="Preferred Currency" hint="Prices across the shop and checkout will display in this currency.">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
              {CURRENCY_OPTIONS.map((opt) => {
                const active = currency === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setCurrency(opt.code)}
                    className="p-3 rounded-xl text-left border-2 transition-all flex items-center justify-between cursor-pointer"
                    style={{
                      borderColor: active ? '#fe04c6' : '#e2e8f0',
                      background: active ? 'rgba(254,4,198,0.05)' : '#fff',
                    }}
                  >
                    <div>
                      <p className="text-xs font-black text-slate-900">{opt.code}</p>
                      <p className="text-[11px] font-medium text-slate-400 truncate">{opt.label}</p>
                    </div>
                    <span
                      className="text-xs font-black px-2 py-1 rounded-lg"
                      style={{
                        background: active ? '#fe04c6' : '#f1f5f9',
                        color: active ? '#fff' : '#64748b',
                      }}
                    >
                      {opt.symbol}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          {accountError && <p className="text-sm text-red-500 font-bold">{accountError}</p>}
          <div className="flex justify-end">
            <SaveBtn onClick={handleSaveAccountAndCurrency} loading={accountLoading} saved={accountSaved} />
          </div>
        </Section>

        {/* 2. Vouchers, 20% Referral Rewards & Receipts */}
        <Section
          title="Vouchers & Referral Rewards"
          description="Share your personal referral link to give friends 20% off (and earn 20% off), or redeem a promo code."
        >
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-900">Your 20% Referral Link & Wallet</p>
                <p className="text-xs text-slate-400">
                  Active vouchers auto-apply at checkout on your next mystery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  setReferralCopied(true);
                  setTimeout(() => setReferralCopied(false), 2000);
                }}
                className="text-xs font-black px-3.5 py-2 rounded-xl transition-all self-start sm:self-auto cursor-pointer"
                style={{ background: 'rgba(254,4,198,0.1)', color: '#fe04c6' }}
              >
                {referralCopied ? 'Copied Referral Link! ✅' : 'Copy My 20% Referral Link 🔗'}
              </button>
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-slate-900 focus:border-brand-pink outline-none"
                placeholder="Enter voucher or promo code"
                value={voucherCodeInput}
                onChange={(e) => setVoucherCodeInput(e.target.value)}
              />
              <button
                type="button"
                onClick={handleApplyVoucher}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-pink transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
            {voucherMessage && <p className="text-xs font-bold text-emerald-600">{voucherMessage}</p>}

            <div className="space-y-2 pt-1">
              {vouchers.map((v) => (
                <div
                  key={v.code}
                  className="bg-white border border-slate-200/80 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">🎟️</span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900">{v.code}</p>
                      <p className="text-[11px] font-medium text-slate-500 truncate">{v.discount}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink bg-brand-pink/5 px-2.5 py-1 rounded-full shrink-0">
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {orders.length > 0 && (
            <div className="pt-2 space-y-2.5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Past Purchases ({orders.length})
              </p>
              <div className="space-y-2">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-slate-100 bg-slate-50/60 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-xs">{order.mysteryTitle}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            order.status === 'succeeded'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {order.status === 'succeeded' ? 'Paid' : order.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                        #{order.id.slice(0, 8).toUpperCase()} • {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-900 text-sm">
                        {(order.amount / 100).toFixed(2)} {order.currency}
                      </span>
                      <Link
                        href={`/${locale}/account/orders`}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:border-brand-pink rounded-lg text-[11px] font-black text-slate-700 transition-colors"
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
          title="Email Preferences"
          description="Control which emails you receive from Back Pocket Mysteries."
        >
          <div className="space-y-5">
            <Toggle
              label="Order, Party & Guest RSVP Alerts"
              description="Essential updates when your custom mystery finishes generating, guests accept invites, or referral vouchers unlock."
              checked={orderAndPartyAlerts}
              onChange={setOrderAndPartyAlerts}
            />
            <Toggle
              label="New Mystery Themes, Hosting Tips & Exclusive Offers"
              description="Early access to new mystery launches, seasonal discounts, and dinner party hosting guides."
              checked={marketingAndTips}
              onChange={setMarketingAndTips}
            />
          </div>
          <div className="flex justify-end mt-2">
            <SaveBtn onClick={handleSaveNotifs} loading={notifLoading} saved={notifSaved} />
          </div>
        </Section>

        {/* 4. Password & Account Deletion */}
        <Section
          title="Password & Security"
          description="Update your account password or manage account deletion."
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
            <p className="text-sm text-red-500 font-bold">Passwords don&apos;t match.</p>
          )}
          {passwordError && <p className="text-sm text-red-500 font-bold">{passwordError}</p>}
          <div className="flex justify-end">
            <SaveBtn
              onClick={handleSavePassword}
              loading={passwordLoading}
              saved={passwordSaved}
              disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
            />
          </div>

          {/* Compact Delete Account Footer */}
          <div className="pt-5 border-t border-slate-100">
            {!showDeleteConfirm ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-slate-500">Delete Account</p>
                  <p className="text-xs text-slate-400">
                    Permanently remove your account, mysteries, and guest roster.
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Delete Account
                </button>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-red-50/80 border-2 border-red-200 space-y-3.5">
                <div className="flex items-center gap-2 text-red-700 font-black text-xs sm:text-sm uppercase tracking-wider">
                  <span>⚠️</span>
                  <span>Permanent Account &amp; Mystery Deletion Warning</span>
                </div>
                <p className="text-xs text-red-900 font-semibold leading-relaxed">
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
                      <strong>Unused Vouchers, Referral Credits &amp; Order Access:</strong> Any unused promo codes or referral rewards will be forfeited. Deleted mysteries cannot be recovered or refunded.
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
                    className="flex-1 bg-white border border-red-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-red-600 outline-none"
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
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel &amp; Keep Account
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={!deleteAckChecked || deleteInput !== 'DELETE' || deleteLoading}
                    className="px-4 py-2.5 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    {deleteLoading ? 'Deleting...' : 'Permanently Delete Account & Mysteries'}
                  </button>
                </div>
                {deleteError && <p className="text-xs text-red-600 font-bold">{deleteError}</p>}
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
