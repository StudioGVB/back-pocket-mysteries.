'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateProfile, updatePassword, deleteAccount } from './actions';
import { resendConfirmationEmail } from '@/app/actions/email-confirmation';

interface SettingsClientProps {
  user: {
    name: string;
    email: string;
    emailVerified: boolean;
  };
}

function Section({ title, description, children, danger, id }: { title: string; description: string; children: React.ReactNode; danger?: boolean; id?: string }) {
  return (
    <div id={id} className={`bg-white border rounded-[2rem] overflow-hidden scroll-mt-8 ${danger ? 'border-red-100' : 'border-slate-100'}`}>
      <div className={`p-8 border-b ${danger ? 'border-red-50 bg-red-50/30' : 'border-slate-50'}`}>
        <h2 className={`text-xl font-black mb-1 ${danger ? 'text-red-600' : 'text-slate-900'}`}>{title}</h2>
        <p className="text-sm text-slate-400 font-medium">{description}</p>
      </div>
      <div className="p-8 space-y-6">
        {children}
      </div>
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

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-bold text-sm text-slate-900">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-pink' : 'bg-slate-200'}`}
        style={{ background: checked ? '#fe04c6' : undefined }}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

export default function SettingsClient({ user }: SettingsClientProps) {
  const router = useRouter();

  // Profile
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Email verification
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Preferences
  const [defaultDelivery, setDefaultDelivery] = useState<'email' | 'print' | 'both'>('email');
  const [complexityDefault, setComplexityDefault] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [prefSaved, setPrefSaved] = useState(false);

  // Notifications
  const [notifMystery, setNotifMystery] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(true);
  const [notifTips, setNotifTips] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none transition-all";

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
    const result = await updateProfile(name, email);
    setProfileLoading(false);
    if (result.error) setProfileError(result.error);
    else { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000); }
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
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setPasswordSaved(false), 3000);
    }
  };

  const handleSavePrefs = () => {
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2500);
  };

  const handleSaveNotifs = () => {
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleteLoading(true);
    setDeleteError('');
    const result = await deleteAccount();
    if (result.error) { setDeleteLoading(false); setDeleteError(result.error); }
    else router.push('/');
  };

  const SaveBtn = ({ onClick, loading, saved, disabled }: { onClick: () => void; loading: boolean; saved: boolean; disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="px-6 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-40 border-2"
      style={{
        borderColor: saved ? '#10b981' : '#fe04c6',
        color: saved ? '#10b981' : '#fe04c6',
        background: 'transparent',
      }}
    >
      {loading ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
    </button>
  );

  return (
    <div className="w-full">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 mb-2">Settings</h1>
        <p className="text-slate-500 font-medium text-lg">Manage your account details and preferences.</p>
      </div>

      <div className="flex items-start gap-12">
        {/* Sidebar menu */}
        <div className="w-56 flex-shrink-0 hidden md:block sticky top-8 space-y-1">
          <Link href="/account/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm text-slate-500 hover:text-brand-pink hover:bg-brand-pink/5">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            My Profile
          </Link>
          <div className="my-2 border-t border-slate-100 mx-4" />
          <a href="#personal-info" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm text-slate-500 hover:text-brand-pink hover:bg-brand-pink/5">
            Personal Info
          </a>
          <a href="#security" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm text-slate-500 hover:text-brand-pink hover:bg-brand-pink/5">
            Security
          </a>
          <a href="#preferences" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm text-slate-500 hover:text-brand-pink hover:bg-brand-pink/5">
            Preferences
          </a>
          <a href="#notifications" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm text-slate-500 hover:text-brand-pink hover:bg-brand-pink/5">
            Notifications
          </a>
          <a href="#danger-zone" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm text-slate-500 hover:text-red-500 hover:bg-red-50">
            Danger Zone
          </a>
        </div>

        <div className="flex-1 max-w-2xl space-y-8">

        {/* Email Verification Status */}
        {!user.emailVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-8 flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 text-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <div>
                <p className="font-black text-amber-900 mb-1">Email not yet verified</p>
                <p className="text-sm text-amber-700">Verify your email to unlock purchasing mysteries.</p>
                {resendSent && <p className="text-sm font-bold text-emerald-600 mt-2">✓ Confirmation email sent!</p>}
                {resendError && <p className="text-sm font-bold text-red-500 mt-2">{resendError}</p>}
              </div>
            </div>
            <button onClick={handleResendConfirmation} disabled={resendLoading || resendSent} className="px-4 py-2 text-xs font-black text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors whitespace-nowrap flex-shrink-0 disabled:opacity-50">
              {resendLoading ? 'Sending...' : resendSent ? 'Sent ✓' : 'Resend Email'}
            </button>
          </div>
        )}
        {user.emailVerified && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <p className="font-black text-emerald-900">Email verified</p>
              <p className="text-sm text-emerald-700">{user.email} — Your account is fully active.</p>
            </div>
          </div>
        )}

        {/* Personal Information */}
        <Section id="personal-info" title="Personal Information" description="Update your display name and email address.">
          <Field label="Full Name">
            <input className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          </Field>
          <Field label="Email Address" hint="Changing your email will require re-verification.">
            <input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </Field>
          {profileError && <p className="text-sm text-red-500 font-bold">{profileError}</p>}
          <div className="flex justify-end">
            <SaveBtn onClick={handleSaveProfile} loading={profileLoading} saved={profileSaved} />
          </div>
        </Section>

        {/* Security */}
        <Section id="security" title="Security" description="Change your password. We recommend using a strong, unique password.">
          <Field label="Current Password">
            <input className={inputClass} type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="New Password">
            <input className={inputClass} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="Confirm New Password">
            <input className={inputClass} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-sm text-red-500 font-bold">Passwords don't match.</p>
          )}
          {passwordError && <p className="text-sm text-red-500 font-bold">{passwordError}</p>}
          <div className="flex justify-end">
            <SaveBtn onClick={handleSavePassword} loading={passwordLoading} saved={passwordSaved} disabled={!currentPassword || !newPassword || newPassword !== confirmPassword} />
          </div>
        </Section>

        {/* Game Master Preferences */}
        <Section id="preferences" title="Game Master Preferences" description="Set your default options when building and ordering mysteries.">
          <Field label="Default Delivery Method" hint="How you prefer to receive your mystery materials.">
            <div className="grid grid-cols-3 gap-3 mt-1">
              {(['email', 'print', 'both'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => setDefaultDelivery(opt)}
                  className="py-3 rounded-xl text-sm font-black border-2 transition-all"
                  style={{
                    borderColor: defaultDelivery === opt ? '#fe04c6' : '#e2e8f0',
                    color: defaultDelivery === opt ? '#fe04c6' : '#94a3b8',
                    background: defaultDelivery === opt ? 'rgba(254,4,198,0.05)' : '#fff',
                  }}
                >
                  {opt === 'email' ? 'Email' : opt === 'print' ? 'Print' : 'Both'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Default Complexity" hint="The difficulty level pre-selected when you start building.">
            <div className="grid grid-cols-3 gap-3 mt-1">
              {(['easy', 'medium', 'hard'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => setComplexityDefault(opt)}
                  className="py-3 rounded-xl text-sm font-black border-2 transition-all capitalize"
                  style={{
                    borderColor: complexityDefault === opt ? '#fe04c6' : '#e2e8f0',
                    color: complexityDefault === opt ? '#fe04c6' : '#94a3b8',
                    background: complexityDefault === opt ? 'rgba(254,4,198,0.05)' : '#fff',
                  }}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex justify-end">
            <SaveBtn onClick={handleSavePrefs} loading={false} saved={prefSaved} />
          </div>
        </Section>

        {/* Notifications */}
        <Section id="notifications" title="Notifications" description="Choose what emails you'd like to receive from us.">
          <div className="space-y-5">
            <Toggle label="Mystery Updates" description="Get notified when your mystery is ready or updated." checked={notifMystery} onChange={setNotifMystery} />
            <Toggle label="Marketing & Offers" description="New mystery themes, discounts, and special events." checked={notifMarketing} onChange={setNotifMarketing} />
            <Toggle label="Hosting Tips & Tricks" description="Weekly tips to help you run the perfect mystery night." checked={notifTips} onChange={setNotifTips} />
          </div>
          <div className="flex justify-end mt-2">
            <SaveBtn onClick={handleSaveNotifs} loading={false} saved={notifSaved} />
          </div>
        </Section>

        {/* Danger Zone */}
        <Section id="danger-zone" title="Danger Zone" description="Permanent actions that cannot be undone." danger>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 rounded-xl text-sm font-black text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-100"
            >
              Delete My Account
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 font-medium">
                This will permanently delete your account, all mysteries, and all saved guests. Type <strong>DELETE</strong> to confirm.
              </p>
              <input
                className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-bold text-red-600 focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                placeholder="Type DELETE to confirm"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
              />
              {deleteError && <p className="text-sm text-red-500 font-bold">{deleteError}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }} className="px-5 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDeleteAccount} disabled={deleteInput !== 'DELETE' || deleteLoading} className="px-5 py-3 rounded-xl text-sm font-black text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-40">
                  {deleteLoading ? 'Deleting...' : 'Delete Account'}
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
