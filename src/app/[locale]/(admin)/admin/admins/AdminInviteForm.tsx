'use client';

import React, { useState } from 'react';
import { grantAdminStatus } from '../admin-data';
import { useRouter } from 'next/navigation';

export function AdminInviteForm() {
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsLoading(true);
    setMessage(null);

    try {
      await grantAdminStatus(userId, 'admin');
      setMessage({ type: 'success', text: 'Admin access granted successfully!' });
      setUserId('');
      router.refresh();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to grant access.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-brand-dark rounded-[32px] p-8 text-white relative overflow-hidden group border-4 border-white shadow-xl">
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-md text-center md:text-left">
          <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Invite a new Admin</h3>
          <p className="text-gray-400 text-sm font-bold">New admins will have full access to manage mysteries, transactions, and users.</p>
        </div>
        <form onSubmit={handleGrantAccess} className="flex flex-col gap-2 w-full md:w-auto">
          <div className="flex gap-4 w-full md:w-auto">
            <input 
              type="text" 
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User ID (find in Customers)"
              className="flex-grow md:w-64 px-6 py-4 rounded-full bg-white/10 border border-white/20 text-sm font-bold focus:outline-none focus:border-brand-pink transition-all text-white placeholder:text-gray-500"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={isLoading || !userId}
              className="px-8 py-4 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-white hover:text-brand-pink transition-all shadow-xl whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Grant Access'}
            </button>
          </div>
          {message && (
            <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message.text}
            </p>
          )}
        </form>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,45,85,0.15)_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
    </div>
  );
}
