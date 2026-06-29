'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminUpdateProfile } from '@/app/actions/admin-users';

interface EditProfileButtonProps {
  profile: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    location?: string | null;
    country?: string | null;
    how_found_us?: string | null;
  };
}

export function EditProfileButton({ profile }: EditProfileButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [email, setEmail] = useState(profile.email || '');
  const [location, setLocation] = useState(profile.location || '');
  const [country, setCountry] = useState(profile.country || '');
  const [howFoundUs, setHowFoundUs] = useState(profile.how_found_us || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await adminUpdateProfile(profile.id, {
      full_name: fullName,
      email: email,
      location: location,
      country: country,
      how_found_us: howFoundUs,
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setIsOpen(false);
      router.refresh();
    }
  };

  const inputClass = "w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-brand-dark outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/10 transition-all";
  const labelClass = "block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1";

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-white/10 hover:bg-brand-pink text-white hover:text-white flex items-center justify-center transition-all active:scale-95 z-20 group"
        title="Edit Profile"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div 
            className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-black text-brand-dark tracking-tight uppercase">
                Edit Customer <span className="text-brand-pink italic">Profile</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-1">Update basic customer profile parameters.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className={labelClass}>Full Name</label>
                <input 
                  type="text" 
                  className={inputClass} 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Email Address</label>
                <input 
                  type="email" 
                  className={inputClass} 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Location</label>
                  <input 
                    type="text" 
                    className={inputClass} 
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. London"
                  />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input 
                    type="text" 
                    className={inputClass} 
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    placeholder="e.g. United Kingdom"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Acquisition Source</label>
                <input 
                  type="text" 
                  className={inputClass} 
                  value={howFoundUs}
                  onChange={e => setHowFoundUs(e.target.value)}
                  placeholder="e.g. google, instagram, referral"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 py-3.5 bg-brand-dark hover:bg-brand-pink text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
