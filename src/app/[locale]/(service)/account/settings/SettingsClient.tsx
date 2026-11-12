'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  updateProfile,
  updateRegionalSettings,
  updateBillingDetails,
  updateHostingPreferences,
  updateNotificationSettings,
  updatePassword,
  signOutOtherSessions,
  deleteAccount,
} from './actions';
import { resendConfirmationEmail } from '@/app/actions/email-confirmation';
import { formatDate } from '@/utils/date';
import { CustomSelect } from '@/components/ui/CustomSelect';

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
  { code: 'USD', symbol: '$', label: 'US Dollar (USD)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (GBP)' },
  { code: 'EUR', symbol: '€', label: 'Euro (EUR)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (AUD)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (CAD)' },
  { code: 'NZD', symbol: 'NZ$', label: 'New Zealand Dollar (NZD)' },
];

const LANGUAGE_OPTIONS = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
];

const COUNTRY_OPTIONS = [
  'United States',
  'United Kingdom',
  'Australia',
  'Canada',
  'New Zealand',
  'France',
  'Ireland',
  'Germany',
  'Other',
];

const TIMEZONE_OPTIONS = [
  { value: 'Europe/London', label: 'London (GMT / BST)' },
  { value: 'Europe/Paris', label: 'Paris / Central Europe (CET)' },
  { value: 'America/New_York', label: 'New York / Eastern (EST / EDT)' },
  { value: 'America/Chicago', label: 'Chicago / Central (CST / CDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles / Pacific (PST / PDT)' },
  { value: 'Australia/Sydney', label: 'Sydney / Melbourne (AEST / AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST / NZDT)' },
];

function Section({
  title,
  description,
  children,
  danger,
  id,
  badge,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  danger?: boolean;
  id?: string;
  badge?: string;
}) {
  return (
    <div
      id={id}
      className={`bg-white border rounded-[2rem] overflow-hidden scroll-mt-8 shadow-sm ${
        danger ? 'border-red-100' : 'border-slate-100'
      }`}
    >
      <div className={`p-8 border-b ${danger ? 'border-red-50 bg-red-50/30' : 'border-slate-50'}`}>
        <div className="flex items-center justify-between gap-4">
          <h2 className={`text-xl font-black mb-1 ${danger ? 'text-red-600' : 'text-slate-900'}`}>{title}</h2>
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
      <div className="p-8 space-y-6">{children}</div>
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
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
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
  const pathname = usePathname();

  // 1. Personal Info
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Email verification
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState('');

  // 2. Regional & Display
  const [currency, setCurrency] = useState(user.currency || 'USD');
  const [selectedLocale, setSelectedLocale] = useState(locale || 'en');
  const [country, setCountry] = useState(user.country || 'United States');
  const [timezone, setTimezone] = useState(user.timezone || 'Europe/London');
  const [regionalLoading, setRegionalLoading] = useState(false);
  const [regionalSaved, setRegionalSaved] = useState(false);
  const [regionalError, setRegionalError] = useState('');

  // 3. Billing, Subscription & Vouchers
  const [companyName, setCompanyName] = useState(user.billing.companyName || '');
  const [addressLine1, setAddressLine1] = useState(user.billing.addressLine1 || '');
  const [city, setCity] = useState(user.billing.city || '');
  const [postalCode, setPostalCode] = useState(user.billing.postalCode || '');
  const [billingCountry, setBillingCountry] = useState(user.billing.billingCountry || user.country || 'United States');
  const [taxId, setTaxId] = useState(user.billing.taxId || '');
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingSaved, setBillingSaved] = useState(false);
  const [billingError, setBillingError] = useState('');

  // Vouchers & Referral
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

  // 4. Hosting & Mystery Defaults
  const [defaultDelivery, setDefaultDelivery] = useState<'email' | 'print' | 'both'>(
    user.hostingPreferences.defaultDelivery || 'both'
  );
  const [complexityDefault, setComplexityDefault] = useState<'easy' | 'medium' | 'hard'>(
    user.hostingPreferences.complexityDefault || 'medium'
  );
  const [spiceDefault, setSpiceDefault] = useState<'clean' | 'mild' | 'spicy' | 'filthy'>(
    user.hostingPreferences.spiceDefault || 'mild'
  );
  const [largePrintPdf, setLargePrintPdf] = useState<boolean>(!!user.hostingPreferences.largePrintPdf);
  const [dyslexiaFont, setDyslexiaFont] = useState<boolean>(!!user.hostingPreferences.dyslexiaFont);
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);

  // 5. Notifications
  const [notifMystery, setNotifMystery] = useState(user.notificationSettings.mysteryUpdates ?? true);
  const [notifRsvp, setNotifRsvp] = useState(user.notificationSettings.guestRsvpAlerts ?? true);
  const [notifReminders, setNotifReminders] = useState(user.notificationSettings.eventReminders ?? true);
  const [notifReferral, setNotifReferral] = useState(user.notificationSettings.referralRewards ?? true);
  const [notifMarketing, setNotifMarketing] = useState(user.notificationSettings.marketingOffers ?? true);
  const [notifTips, setNotifTips] = useState(user.notificationSettings.hostingTips ?? false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // 6. Security & Sessions
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsSignedOut, setSessionsSignedOut] = useState(false);

  // 7. Danger Zone & Data Export
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [exportedData, setExportedData] = useState(false);

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

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setProfileError('');
    const result = await updateProfile(name, email, phone);
    setProfileLoading(false);
    if (result.error) setProfileError(result.error);
    else {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    }
  };

  const handleSaveRegional = async () => {
    setRegionalLoading(true);
    setRegionalError('');
    const result = await updateRegionalSettings({
      currency,
      locale: selectedLocale,
      country,
      timezone,
    });
    setRegionalLoading(false);
    if (result.error) {
      setRegionalError(result.error);
    } else {
      document.cookie = `NEXT_CURRENCY=${currency}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `NEXT_LOCALE=${selectedLocale}; path=/; max-age=31536000; SameSite=Lax`;
      setRegionalSaved(true);
      setTimeout(() => setRegionalSaved(false), 3000);
      if (selectedLocale !== locale && pathname) {
        const segments = pathname.split('/');
        segments[1] = selectedLocale;
        router.push(segments.join('/'));
      } else {
        router.refresh();
      }
    }
  };

  const handleSaveBilling = async () => {
    setBillingLoading(true);
    setBillingError('');
    const result = await updateBillingDetails({
      companyName,
      addressLine1,
      city,
      postalCode,
      billingCountry,
      taxId,
    });
    setBillingLoading(false);
    if (result.error) setBillingError(result.error);
    else {
      setBillingSaved(true);
      setTimeout(() => setBillingSaved(false), 3000);
    }
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

  const handleSavePrefs = async () => {
    setPrefLoading(true);
    await updateHostingPreferences({
      defaultDelivery,
      complexityDefault,
      spiceDefault,
      largePrintPdf,
      dyslexiaFont,
    });
    setPrefLoading(false);
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2500);
  };

  const handleSaveNotifs = async () => {
    setNotifLoading(true);
    await updateNotificationSettings({
      mysteryUpdates: notifMystery,
      guestRsvpAlerts: notifRsvp,
      eventReminders: notifReminders,
      referralRewards: notifReferral,
      marketingOffers: notifMarketing,
      hostingTips: notifTips,
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

  const handleSignOutOthers = async () => {
    setSessionsLoading(true);
    await signOutOtherSessions();
    setSessionsLoading(false);
    setSessionsSignedOut(true);
    setTimeout(() => setSessionsSignedOut(false), 3000);
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        name,
        email,
        phone,
        country,
        currency,
        timezone,
      },
      billing: {
        companyName,
        addressLine1,
        city,
        postalCode,
        billingCountry,
        taxId,
      },
      hostingPreferences: {
        defaultDelivery,
        complexityDefault,
        spiceDefault,
        largePrintPdf,
        dyslexiaFont,
      },
      orders,
      guests,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `back-pocket-mysteries-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportedData(true);
    setTimeout(() => setExportedData(false), 3000);
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
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
      className="px-6 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-40 border-2"
      style={{
        borderColor: saved ? '#10b981' : '#fe04c6',
        color: saved ? '#10b981' : '#fe04c6',
        background: 'transparent',
      }}
    >
      {loading ? 'Saving...' : saved ? 'Saved ✓' : 'Save Changes'}
    </button>
  );

  const navItems = [
    { href: '#personal-info', label: 'Personal Info' },
    { href: '#regional', label: 'Currency & Language' },
    { href: '#billing', label: 'Billing & Vouchers' },
    { href: '#purchase-history', label: 'Purchase History' },
    { href: '#preferences', label: 'Hosting Defaults' },
    { href: '#notifications', label: 'Notifications' },
    { href: '#security', label: 'Security & Sessions' },
    { href: '#danger-zone', label: 'Privacy & Danger Zone', danger: true },
  ];

  return (
    <div className="w-full">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 mb-2">Settings</h1>
        <p className="text-slate-500 font-medium text-lg">
          Manage your currency, language, billing, purchase history, and hosting preferences.
        </p>
      </div>

      <div className="flex items-start gap-10">
        {/* Sticky Jump Sidebar */}
        <div className="w-60 flex-shrink-0 hidden lg:block sticky top-8 bg-white border border-slate-100 rounded-3xl p-4 shadow-sm space-y-1">
          <Link
            href={`/${locale}/account/profile`}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm text-slate-600 hover:text-brand-pink hover:bg-brand-pink/5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile & Guest Roster
          </Link>
          <div className="my-2 border-t border-slate-100 mx-2" />
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-bold text-xs uppercase tracking-wider ${
                item.danger
                  ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                  : 'text-slate-500 hover:text-brand-pink hover:bg-brand-pink/5'
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex-1 max-w-3xl space-y-8">
          {/* Email Verification Status Banner */}
          {!user.emailVerified ? (
            <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-8 flex items-start justify-between gap-6">
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
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="font-black text-emerald-900">Verified Host Account</p>
                <p className="text-sm text-emerald-700">{user.email} - Your account is active and ready to host.</p>
              </div>
            </div>
          )}

          {/* 1. Personal Information */}
          <Section
            id="personal-info"
            title="Personal & Contact Details"
            description="Update your host display name, email address, and optional phone number."
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
              <Field label="Phone Number (Optional)" hint="Used for optional WhatsApp / SMS party reminders.">
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
            {profileError && <p className="text-sm text-red-500 font-bold">{profileError}</p>}
            <div className="flex justify-end">
              <SaveBtn onClick={handleSaveProfile} loading={profileLoading} saved={profileSaved} />
            </div>
          </Section>

          {/* 2. Regional & Display Preferences (Currency & Language) */}
          <Section
            id="regional"
            title="Currency & Language"
            description="Choose your local currency for pricing & checkout, and your preferred portal language."
          >
            <Field label="Preferred Currency" hint="Prices across the portal and checkout will display in this currency.">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                {CURRENCY_OPTIONS.map((opt) => {
                  const active = currency === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setCurrency(opt.code)}
                      className="p-3.5 rounded-xl text-left border-2 transition-all flex items-center justify-between"
                      style={{
                        borderColor: active ? '#fe04c6' : '#e2e8f0',
                        background: active ? 'rgba(254,4,198,0.05)' : '#fff',
                      }}
                    >
                      <div>
                        <p className="text-xs font-black text-slate-900">{opt.code}</p>
                        <p className="text-[11px] font-medium text-slate-400 truncate">{opt.label.split(' (')[0]}</p>
                      </div>
                      <span
                        className="text-sm font-black px-2 py-1 rounded-lg"
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

            <Field label="Language / Locale" hint="Controls the language of the customer portal and generated mysteries.">
              <div className="grid grid-cols-2 gap-3 mt-1">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const active = selectedLocale === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setSelectedLocale(lang.code)}
                      className="p-4 rounded-xl border-2 transition-all flex items-center gap-3"
                      style={{
                        borderColor: active ? '#fe04c6' : '#e2e8f0',
                        background: active ? 'rgba(254,4,198,0.05)' : '#fff',
                      }}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-900">{lang.label}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{lang.code}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Country / Region">
                <CustomSelect className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </CustomSelect>
              </Field>
              <Field label="Timezone">
                <CustomSelect className={inputClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </CustomSelect>
              </Field>
            </div>

            {regionalError && <p className="text-sm text-red-500 font-bold">{regionalError}</p>}
            <div className="flex justify-end">
              <SaveBtn onClick={handleSaveRegional} loading={regionalLoading} saved={regionalSaved} />
            </div>
          </Section>

          {/* 3. Billing, Subscription & Vouchers */}
          <Section
            id="billing"
            title="Billing, Subscription & Vouchers"
            description="Manage your subscription plan, referral vouchers, promo codes, and invoice details."
            badge="Pay-Per-Event Plan"
          >
            {/* Current Subscription Plan Banner */}
            <div
              className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white"
              style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Current Plan</span>
                  <span className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] font-bold">Standard</span>
                </div>
                <h3 className="text-lg font-black">Pay-Per-Event Host</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Upgrade to Unlimited Monthly to host unlimited mysteries & unlock exclusive themes.
                </p>
              </div>
              <Link
                href={`/${locale}/pricing`}
                className="px-5 py-3 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap"
              >
                Upgrade to Unlimited ✨
              </Link>
            </div>

            {/* Vouchers & Referral Rewards Wallet */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-900">Vouchers & Referral Rewards</p>
                  <p className="text-xs text-slate-400">
                    Share your link for 20% off, or enter a voucher code below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink);
                    setReferralCopied(true);
                    setTimeout(() => setReferralCopied(false), 2000);
                  }}
                  className="text-xs font-black px-3.5 py-2 rounded-xl transition-all self-start sm:self-auto"
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
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-pink transition-colors"
                >
                  Apply
                </button>
              </div>
              {voucherMessage && <p className="text-xs font-bold text-emerald-600">{voucherMessage}</p>}

              <div className="space-y-2 pt-2">
                {vouchers.map((v) => (
                  <div
                    key={v.code}
                    className="bg-white border border-slate-200/80 rounded-xl px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🎟️</span>
                      <div>
                        <p className="text-xs font-black text-slate-900">{v.code}</p>
                        <p className="text-[11px] font-medium text-slate-500">{v.discount}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink bg-brand-pink/5 px-2.5 py-1 rounded-full">
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Billing Address & Invoice Info */}
            <div className="pt-2 space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Billing Address & Invoice Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Company / Event Name (Optional)">
                  <input
                    className={inputClass}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Events Ltd"
                  />
                </Field>
                <Field label="Tax / VAT ID (Optional)">
                  <input
                    className={inputClass}
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g. GB123456789"
                  />
                </Field>
              </div>
              <Field label="Street Address">
                <input
                  className={inputClass}
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="123 Baker Street"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="City">
                  <input
                    className={inputClass}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="London"
                  />
                </Field>
                <Field label="Postcode / ZIP">
                  <input
                    className={inputClass}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="NW1 6XE"
                  />
                </Field>
                <Field label="Country">
                  <CustomSelect
                    className={inputClass}
                    value={billingCountry}
                    onChange={(e) => setBillingCountry(e.target.value)}
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </CustomSelect>
                </Field>
              </div>
              {billingError && <p className="text-sm text-red-500 font-bold">{billingError}</p>}
              <div className="flex justify-end">
                <SaveBtn onClick={handleSaveBilling} loading={billingLoading} saved={billingSaved} />
              </div>
            </div>
          </Section>

          {/* 4. Purchase & Order History */}
          <Section
            id="purchase-history"
            title="Purchase History"
            description="View your past mystery purchases, payment statuses, and downloadable receipts."
            badge={`${orders.length} ${orders.length === 1 ? 'Order' : 'Orders'}`}
          >
            {orders.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                <p className="text-2xl mb-2">🧾</p>
                <p className="font-black text-slate-900 text-sm mb-1">No purchases yet</p>
                <p className="text-xs text-slate-400 mb-5">
                  When you purchase a mystery pack or subscription, your orders and receipts will appear here.
                </p>
                <Link
                  href={`/${locale}/mysteries`}
                  className="inline-block px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white"
                  style={{ background: '#fe04c6' }}
                >
                  Browse Mysteries →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-slate-100 bg-slate-50/60 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="font-black text-slate-900 text-sm">{order.mysteryTitle}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            order.status === 'succeeded'
                              ? 'bg-emerald-100 text-emerald-700'
                              : order.status === 'refunded'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {order.status === 'succeeded' ? 'Paid' : order.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-bold">
                        Order #{order.id.slice(0, 8).toUpperCase()} • {formatDate(order.createdAt)} •{' '}
                        {order.mysteryTheme}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-slate-900 text-base">
                        {(order.amount / 100).toFixed(2)} {order.currency}
                      </span>
                      <Link
                        href={`/${locale}/account/orders`}
                        className="px-4 py-2 bg-white border border-slate-200 hover:border-brand-pink rounded-xl text-xs font-black text-slate-700 transition-colors"
                      >
                        View Story
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 5. Hosting & Mystery Defaults */}
          <Section
            id="preferences"
            title="Hosting & Mystery Defaults"
            description="Set your default spice level, complexity tier, delivery method, and accessibility options."
          >
            <Field label="Default Spice Level" hint="Pre-selected tone when you start customizing a new mystery.">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
                {(
                  [
                    { id: 'clean', label: 'Clean', emoji: '😇', sub: 'Family friendly' },
                    { id: 'mild', label: 'Mild', emoji: '🥂', sub: 'PG-13 cheekiness' },
                    { id: 'spicy', label: 'Spicy', emoji: '🌶️', sub: 'Adult scandal' },
                    { id: 'filthy', label: 'Filthy', emoji: '🔥', sub: '18+ uncensored' },
                  ] as const
                ).map((opt) => {
                  const active = spiceDefault === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSpiceDefault(opt.id)}
                      className="p-3.5 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-1"
                      style={{
                        borderColor: active ? '#fe04c6' : '#e2e8f0',
                        color: active ? '#fe04c6' : '#475569',
                        background: active ? 'rgba(254,4,198,0.05)' : '#fff',
                      }}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="text-xs font-black uppercase tracking-wider">{opt.label}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{opt.sub}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Default Complexity Tier" hint="The puzzle and clue depth pre-selected for your group.">
              <div className="grid grid-cols-3 gap-3 mt-1">
                {(
                  [
                    { id: 'easy', label: 'Easy (Basic)' },
                    { id: 'medium', label: 'Medium (Premium)' },
                    { id: 'hard', label: 'Hard (Grand)' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setComplexityDefault(opt.id)}
                    className="py-3 px-3 rounded-xl text-xs font-black border-2 transition-all"
                    style={{
                      borderColor: complexityDefault === opt.id ? '#fe04c6' : '#e2e8f0',
                      color: complexityDefault === opt.id ? '#fe04c6' : '#94a3b8',
                      background: complexityDefault === opt.id ? 'rgba(254,4,198,0.05)' : '#fff',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Default Delivery Format" hint="How you prefer to receive and run your mystery materials.">
              <div className="grid grid-cols-3 gap-3 mt-1">
                {(
                  [
                    { id: 'email', label: 'Digital Playroom' },
                    { id: 'print', label: 'Printable PDF' },
                    { id: 'both', label: 'Both Digital & Print' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDefaultDelivery(opt.id)}
                    className="py-3 px-3 rounded-xl text-xs font-black border-2 transition-all"
                    style={{
                      borderColor: defaultDelivery === opt.id ? '#fe04c6' : '#e2e8f0',
                      color: defaultDelivery === opt.id ? '#fe04c6' : '#94a3b8',
                      background: defaultDelivery === opt.id ? 'rgba(254,4,198,0.05)' : '#fff',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="pt-2 border-t border-slate-100 space-y-4">
              <Toggle
                label="Large-Print PDF Character Booklets"
                description="Generate printable PDFs with larger 14pt body text for easier reading in dim party lighting."
                checked={largePrintPdf}
                onChange={setLargePrintPdf}
              />
              <Toggle
                label="Dyslexia-Friendly Font Mode"
                description="Use high-legibility spacing and fonts on digital character sheets and clues."
                checked={dyslexiaFont}
                onChange={setDyslexiaFont}
              />
            </div>

            <div className="flex justify-end">
              <SaveBtn onClick={handleSavePrefs} loading={prefLoading} saved={prefSaved} />
            </div>
          </Section>

          {/* 6. Notifications & Communications */}
          <Section
            id="notifications"
            title="Notifications & Communications"
            description="Choose which email alerts and updates you want to receive."
          >
            <div className="space-y-5">
              <Toggle
                label="Mystery Generation & Order Updates"
                description="Get notified immediately when your custom mystery pack finishes generating."
                checked={notifMystery}
                onChange={setNotifMystery}
              />
              <Toggle
                label="Guest RSVP & Character Claim Alerts"
                description="Receive an email when an invited guest accepts their invite or updates their character profile."
                checked={notifRsvp}
                onChange={setNotifRsvp}
              />
              <Toggle
                label="Event Countdown Reminders"
                description="Helpful host checklist reminder 3 days before your scheduled mystery party date."
                checked={notifReminders}
                onChange={setNotifReminders}
              />
              <Toggle
                label="Referral Rewards & Voucher Alerts"
                description="Get notified when a friend uses your referral link and unlocks your 20% off voucher."
                checked={notifReferral}
                onChange={setNotifReferral}
              />
              <Toggle
                label="New Mystery Themes & Seasonal Promos"
                description="Early access to new themes, holiday specials, and subscriber discounts."
                checked={notifMarketing}
                onChange={setNotifMarketing}
              />
              <Toggle
                label="Hosting Tips & Tricks"
                description="Occasional guides on atmosphere, props, and food pairings for mystery nights."
                checked={notifTips}
                onChange={setNotifTips}
              />
            </div>
            <div className="flex justify-end mt-2">
              <SaveBtn onClick={handleSaveNotifs} loading={notifLoading} saved={notifSaved} />
            </div>
          </Section>

          {/* 7. Security & Active Sessions */}
          <Section
            id="security"
            title="Security & Sessions"
            description="Update your password and manage your active signed-in devices."
          >
            <Field label="Current Password">
              <input
                className={inputClass}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="New Password">
                <input
                  className={inputClass}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <Field label="Confirm New Password">
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

            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-900">Sign Out of All Other Devices</p>
                <p className="text-xs text-slate-400">
                  Keep this browser signed in, but log out of any other phones, tablets, or computers.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOutOthers}
                disabled={sessionsLoading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black whitespace-nowrap transition-colors"
              >
                {sessionsLoading
                  ? 'Signing out...'
                  : sessionsSignedOut
                  ? 'Other devices signed out ✓'
                  : 'Sign Out Other Sessions'}
              </button>
            </div>
          </Section>

          {/* 8. Privacy & Danger Zone */}
          <Section
            id="danger-zone"
            title="Privacy & Danger Zone"
            description="Download a copy of your account data or permanently delete your account."
            danger
          >
            {/* Export Data */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-red-100">
              <div>
                <p className="text-sm font-black text-slate-900">Export My Account Data</p>
                <p className="text-xs text-slate-400">
                  Download a JSON archive of your profile, guest roster ({guests.length} guests), and order history.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportData}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-xs font-black whitespace-nowrap transition-colors"
              >
                {exportedData ? 'Downloaded ✓' : 'Export Data (JSON) ↓'}
              </button>
            </div>

            {/* Delete Account */}
            {!showDeleteConfirm ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                  <p className="text-sm font-black text-red-600">Delete My Account</p>
                  <p className="text-xs text-slate-400">
                    Permanently delete your account, mysteries, and saved guest roster.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-6 py-3 rounded-xl text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-100 whitespace-nowrap"
                >
                  Delete My Account
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <p className="text-sm text-slate-600 font-medium">
                  This will permanently delete your account, all mysteries, and all saved guests. Type{' '}
                  <strong>DELETE</strong> to confirm.
                </p>
                <input
                  className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-bold text-red-600 focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                  placeholder="Type DELETE to confirm"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                />
                {deleteError && <p className="text-sm text-red-500 font-bold">{deleteError}</p>}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteInput('');
                    }}
                    className="px-5 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== 'DELETE' || deleteLoading}
                    className="px-5 py-3 rounded-xl text-sm font-black text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-40"
                  >
                    {deleteLoading ? 'Deleting...' : 'Permanently Delete Account'}
                  </button>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
