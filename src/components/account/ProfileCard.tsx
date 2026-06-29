import React from 'react';
import { buildAvatarUrl, AvatarConfig } from '@/utils/avatar';

interface ProfileCardProps {
  user: { name: string; email: string };
  profile: {
    bio?: string | null;
    location?: string | null;
    pronouns?: string | null;
    avatar_config?: AvatarConfig | null;
    dietary_needs?: string[] | null;
    character_preferences?: string[] | null;
    fun_facts?: string | null;
  } | null;
  onEdit: () => void;
}

export function ProfileCard({ user, profile, onEdit }: ProfileCardProps) {
  const avatarUrl = profile?.avatar_config 
    ? buildAvatarUrl(profile.avatar_config as AvatarConfig, user.name) 
    : buildAvatarUrl({
        seed: user.name,
        top: 'shortFlat',
        hairColor: '282828',
        skinColor: 'ffe0bd',
        accessories: 'none'
      }, user.name);

  return (
    <div className="bg-white border-2 border-brand-pink/20 p-8 rounded-[2rem] shadow-xl shadow-brand-pink/5 relative overflow-hidden mb-10 group transition-all hover:border-brand-pink/40">
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-pink/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
      
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Avatar Section */}
        <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt={user.name} className="w-[120%] h-[120%] object-cover mt-4" />
        </div>

        {/* Info Section */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{user.name}</h2>
                {profile?.pronouns && (
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-widest">
                    {profile.pronouns}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-slate-400">{user.email}</p>
            </div>
            
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-6 py-3 bg-brand-pink text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-dark transition-colors shadow-md shadow-brand-pink/30 hover:shadow-xl hover:shadow-brand-dark/20 hover:-translate-y-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              Edit My Profile
            </button>
          </div>

          {/* Bio & Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">My Bio</h4>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                {profile?.bio || <span className="italic opacity-60">No bio written yet. Click edit to tell your host about yourself!</span>}
              </p>
            </div>
            
            <div className="space-y-4">
              {profile?.dietary_needs && profile.dietary_needs.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Dietary Needs</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.dietary_needs.map((d, i) => (
                      <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-100">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {profile?.character_preferences && profile.character_preferences.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Character Preferences</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.character_preferences.map((p, i) => (
                      <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
