'use client';

import React, { useState } from 'react';
import { inviteSuperAdminByEmailAction } from '../admin-data';
import { useRouter } from 'next/navigation';

export function AdminInviteForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const router = useRouter();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await inviteSuperAdminByEmailAction({
        emailOrId: email.trim(),
        name: name.trim() || undefined,
        role: 'superadmin',
      });

      if (!res.success) {
        setMessage({
          type: 'error',
          text: res.error || 'Failed to invite Super Admin.',
        });
      } else {
        setMessage({
          type: 'success',
          text: res.message || 'Super Admin invitation sent!',
        });
        setEmail('');
        setName('');
        router.refresh();
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || 'Failed to send Super Admin invitation.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-brand-dark rounded-[32px] p-8 text-white relative overflow-hidden group border-4 border-white shadow-xl">
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-md text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink text-[10px] font-black uppercase tracking-widest mb-2">
            <span>✉️ Email Invitation &amp; Instant Role Provisioning</span>
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight mb-1.5">
            Invite a Super Admin by Email
          </h3>
          <p className="text-gray-400 text-xs font-bold leading-relaxed">
            Enter their email address below. They&apos;ll receive an email invite and automatically
            get full Super Admin &amp; Studio Builder access as soon as they sign in.
          </p>
        </div>

        <form onSubmit={handleInvite} className="flex flex-col gap-2.5 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="sm:w-44 px-5 py-3.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold focus:outline-none focus:border-brand-pink transition-all text-white placeholder:text-gray-500"
              disabled={isLoading}
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partner@example.com"
              className="flex-grow sm:w-72 px-6 py-3.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold focus:outline-none focus:border-brand-pink transition-all text-white placeholder:text-gray-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="px-7 py-3.5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-white hover:text-brand-pink transition-all shadow-xl whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending Invite...' : 'Send Super Admin Invite'}
            </button>
          </div>
          {message && (
            <p
              className={`text-[11px] font-black tracking-wide mt-1 ${
                message.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {message.text}
            </p>
          )}
        </form>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,45,85,0.15)_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
    </div>
  );
}
