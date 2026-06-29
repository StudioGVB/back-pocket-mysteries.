'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/utils/date';
import { 
  adminUpdateProfile, 
  adminAddGuest, 
  adminUpdateGuest, 
  adminDeleteGuest 
} from '@/app/actions/admin-users';

export function CustomerDashboard({ profile, orders, mysteries, guests }: any) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'mysteries' | 'orders' | 'guests' | 'personal'>('mysteries');
  const [loading, setLoading] = useState(false);

  // AI Avatar Photo rendering logic
  const AIPhotoRenderer = ({ avatarUrl, name }: { avatarUrl: string, name: string }) => {
    const [photo, setPhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
  
    React.useEffect(() => {
      let isMounted = true;
      const fetchPhoto = async () => {
        try {
          const urlObj = new URL(avatarUrl);
          const aiUrl = urlObj.searchParams.get('aiPhotoUrl');
          const aiHash = urlObj.searchParams.get('aiPhotoHash'); // Backwards compatibility for already broken URLs
          
          if (aiUrl) {
            if (isMounted) setPhoto(decodeURIComponent(aiUrl));
          } else if (aiHash) {
            // Fallback for older links that had hash but the table doesn't exist
            // Try to fetch it just in case, or do nothing.
            const res = await fetch(`/api/admin/get-avatar-by-hash?hash=${aiHash}`).catch(() => null);
            if (res && res.ok) {
              const data = await res.json();
              if (isMounted) setPhoto(data.url);
            }
          } else if (avatarUrl.startsWith('data:')) {
            if (isMounted) setPhoto(avatarUrl);
          }
        } catch (e) {
          // If it's a relative URL or invalid URL, check if it's a data URI
          if (avatarUrl.startsWith('data:')) {
            if (isMounted) setPhoto(avatarUrl);
          }
        }
        if (isMounted) setLoading(false);
      };
      fetchPhoto();
      return () => { isMounted = false; };
    }, [avatarUrl]);
  
    if (photo) {
      /* eslint-disable-next-line @next/next/no-img-element */
      return <img src={photo} alt={name} className="absolute inset-0 w-full h-full object-cover" />;
    }
  
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <p className="font-bold text-sm">{loading ? 'Loading...' : 'No Photo Generated'}</p>
      </div>
    );
  };

  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedCount, setRegeneratedCount] = useState(0);
  const [currentlyGeneratingId, setCurrentlyGeneratingId] = useState<string | null>(null);

  // Edit Player Details states
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [detailBio, setDetailBio] = useState('');
  const [detailFunFacts, setDetailFunFacts] = useState('');
  const [detailPrefs, setDetailPrefs] = useState<string[]>([]);
  const [detailDiet, setDetailDiet] = useState<string[]>([]);
  const [prefInput, setPrefInput] = useState('');
  const [dietInput, setDietInput] = useState('');

  // Add Guest states
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [addGuestName, setAddGuestName] = useState('');
  const [addGuestEmail, setAddGuestEmail] = useState('');
  const [addGuestGender, setAddGuestGender] = useState('adaptable');
  const [addGuestEyeColor, setAddGuestEyeColor] = useState('');
  const [addGuestHeight, setAddGuestHeight] = useState('');
  const [addGuestEthnicity, setAddGuestEthnicity] = useState('');
  const [addGuestTraits, setAddGuestTraits] = useState<string[]>([]);
  const [addGuestBio, setAddGuestBio] = useState('');
  const [addTraitInput, setAddTraitInput] = useState('');

  // Edit Guest states
  const [isEditingGuest, setIsEditingGuest] = useState(false);
  const [editGuestName, setEditGuestName] = useState('');
  const [editGuestEmail, setEditGuestEmail] = useState('');
  const [editGuestGender, setEditGuestGender] = useState('adaptable');
  const [editGuestEyeColor, setEditGuestEyeColor] = useState('');
  const [editGuestHeight, setEditGuestHeight] = useState('');
  const [editGuestEthnicity, setEditGuestEthnicity] = useState('');
  const [editGuestTraits, setEditGuestTraits] = useState<string[]>([]);
  const [editGuestBio, setEditGuestBio] = useState('');
  const [editTraitInput, setEditTraitInput] = useState('');

  // Initializers
  const openEditDetails = () => {
    setDetailBio(profile.bio || '');
    setDetailFunFacts(profile.fun_facts || '');
    setDetailPrefs(profile.character_preferences || []);
    setDetailDiet(profile.dietary_needs || []);
    setPrefInput('');
    setDietInput('');
    setIsEditDetailsOpen(true);
  };

  const openAddGuest = () => {
    setAddGuestName('');
    setAddGuestEmail('');
    setAddGuestGender('adaptable');
    setAddGuestEyeColor('');
    setAddGuestHeight('');
    setAddGuestEthnicity('');
    setAddGuestTraits([]);
    setAddGuestBio('');
    setAddTraitInput('');
    setIsAddGuestOpen(true);
  };

  const startEditingGuest = (g: any) => {
    setEditGuestName(g.name || '');
    setEditGuestEmail(g.email || '');
    setEditGuestGender(g.gender || 'adaptable');
    setEditGuestEyeColor(g.eye_color || '');
    setEditGuestHeight(g.height || '');
    setEditGuestEthnicity(g.ethnicity || '');
    setEditGuestTraits(g.traits || []);
    setEditGuestBio(g.bio || '');
    setEditTraitInput('');
    setIsEditingGuest(true);
  };

  // Submit Handlers
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await adminUpdateProfile(profile.id, {
      bio: detailBio,
      fun_facts: detailFunFacts,
      character_preferences: detailPrefs,
      dietary_needs: detailDiet,
    });
    setLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setIsEditDetailsOpen(false);
      router.refresh();
    }
  };

  const handleAddGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addGuestName.trim()) {
      alert('Guest name is required');
      return;
    }
    setLoading(true);
    const res = await adminAddGuest(profile.id, {
      name: addGuestName,
      email: addGuestEmail || undefined,
      gender: addGuestGender || undefined,
      eye_color: addGuestEyeColor || undefined,
      height: addGuestHeight || undefined,
      ethnicity: addGuestEthnicity || undefined,
      traits: addGuestTraits,
      bio: addGuestBio || undefined,
    });
    setLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setIsAddGuestOpen(false);
      router.refresh();
    }
  };

  const handleEditGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGuestName.trim()) {
      alert('Guest name is required');
      return;
    }
    setLoading(true);
    const res = await adminUpdateGuest(selectedGuest.id, {
      name: editGuestName,
      email: editGuestEmail || undefined,
      gender: editGuestGender || undefined,
      eye_color: editGuestEyeColor || undefined,
      height: editGuestHeight || undefined,
      ethnicity: editGuestEthnicity || undefined,
      traits: editGuestTraits,
      bio: editGuestBio || undefined,
    });
    setLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setIsEditingGuest(false);
      setSelectedGuest(null);
      router.refresh();
    }
  };

  const handleDeleteGuest = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedGuest.name}? This action cannot be undone.`)) {
      return;
    }
    setLoading(true);
    const res = await adminDeleteGuest(selectedGuest.id);
    setLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setSelectedGuest(null);
      router.refresh();
    }
  };

  const handleRegenerateAll = async () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    setRegeneratedCount(0);

    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      setCurrentlyGeneratingId(guest.id);

      try {
        const res = await fetch(`/api/admin/generate-avatar-single`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestId: guest.id, userId: profile.id })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to generate avatar for guest ${guest.id}`);
        }
      } catch (e: any) {
        console.error(`Error generating avatar for guest ${guest.id}:`, e);
        alert(`Error generating avatar for ${guest.name || guest.id}: ${e.message}`);
        setCurrentlyGeneratingId(null);
        setIsRegenerating(false);
        return; // STOP the loop!
      }

      setRegeneratedCount(prev => prev + 1);
      // Wait to avoid Imagen 4.0 API rate limits (15 RPM)
      await new Promise(r => setTimeout(r, 4000));
    }

    setCurrentlyGeneratingId(null);
    setIsRegenerating(false);
    window.location.reload();
  };

  const inputClass = "w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-brand-dark outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/10 transition-all";
  const labelClass = "block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1";

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b border-gray-100">
        {[
          { id: 'mysteries', label: 'Mysteries Created' },
          { id: 'orders', label: 'Transaction History' },
          { id: 'guests', label: 'Guest Roster' },
          { id: 'personal', label: 'Player Details' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 ${
              activeTab === tab.id 
                ? 'border-brand-pink text-brand-dark' 
                : 'border-transparent text-gray-400 hover:text-brand-pink hover:bg-gray-50/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-8">
        
        {/* MYSTERIES TAB */}
        {activeTab === 'mysteries' && (
          <div>
            {mysteries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mysteries.map((m: any, i: number) => (
                  <Link href={`/en/builder/mysteries/${m.id}`} key={i} className="block group">
                    <div className="p-6 rounded-[2rem] border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all bg-gray-50 group-hover:bg-white group-hover:border-brand-blue/30">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          m.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {m.status}
                        </span>
                        <span className="text-xs font-bold text-gray-400">{m.max_players} Players</span>
                      </div>
                      <h3 className="text-xl font-black text-brand-dark mb-2 line-clamp-2 leading-tight">{m.title}</h3>
                      <p className="text-xs text-gray-500 font-medium">Created {formatDate(m.created_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <h3 className="text-lg font-black text-brand-dark mb-2">No mysteries yet</h3>
                <p className="text-gray-500 text-sm">This customer hasn't purchased or created any mysteries.</p>
              </div>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-500 font-medium">Viewing {orders.length} transactions</p>
            </div>
            
            {orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mystery</th>
                      <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4 text-sm font-medium text-gray-600">{formatDate(o.created_at)}</td>
                        <td className="py-4 px-4 text-sm font-bold text-brand-dark">{o.mystery?.title || 'Unknown Product'}</td>
                        <td className="py-4 px-4 text-sm font-black text-gray-900">${(o.amount || 0).toFixed(2)}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            o.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 font-bold text-sm text-center py-12">No transaction history.</p>
            )}
          </div>
        )}

        {/* GUESTS TAB */}
        {activeTab === 'guests' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-500 font-medium">Viewing {guests.length} guests</p>
              <div className="flex gap-3">
                <button
                  onClick={openAddGuest}
                  className="px-4 py-2 bg-brand-blue hover:bg-brand-dark text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                >
                  Add Guest
                </button>
                <button 
                  onClick={handleRegenerateAll}
                  disabled={isRegenerating}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm ${
                    isRegenerating 
                      ? 'bg-brand-pink animate-pulse cursor-not-allowed' 
                      : 'bg-brand-dark hover:bg-brand-pink active:scale-95'
                  }`}
                >
                  {isRegenerating 
                    ? `Updated ${regeneratedCount}/${guests.length} photos` 
                    : 'Regenerate All AI Avatars'}
                </button>
              </div>
            </div>
            
            {guests.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {guests.map((g: any, i: number) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedGuest(g)}
                    className="rounded-3xl border border-gray-100 flex flex-col hover:shadow-2xl hover:-translate-y-1 hover:border-brand-pink/40 transition-all duration-300 cursor-pointer group relative bg-white overflow-hidden"
                  >
                    {currentlyGeneratingId === g.id && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-30 flex items-center justify-center rounded-3xl">
                        <div className="w-10 h-10 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    
                    {/* Top: AI Photo (Full Width) */}
                    <div className="w-full h-64 sm:h-72 relative bg-gray-100 flex items-center justify-center overflow-hidden">
                      {(() => {
                         let aiUrl = null;
                         if (g.avatar_url) {
                           try {
                             const u = new URL(g.avatar_url);
                             const raw = u.searchParams.get('aiPhotoUrl');
                             if (raw) aiUrl = decodeURIComponent(raw);
                           } catch(e){}
                         }
                         if (aiUrl) {
                           /* eslint-disable-next-line @next/next/no-img-element */
                           return <img src={aiUrl} alt="AI Render" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />;
                         }
                         return (
                           <div className="flex flex-col items-center opacity-50">
                             <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                             <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">No AI Render</span>
                           </div>
                         );
                      })()}
                    </div>
                    
                    {/* Bottom: Info & Cartoon Avatar */}
                    <div className="bg-[#f0f0f0] p-6 flex items-start justify-between min-h-[160px] relative">
                      {/* Left: Text Info */}
                      <div className="flex flex-col h-full justify-between z-10 w-2/3">
                        <div>
                          <h3 className="font-black text-brand-pink text-4xl uppercase leading-none tracking-tighter mb-3">{g.name}</h3>
                          
                          <div className="text-black font-extrabold text-base leading-tight lowercase line-clamp-3 break-words pr-2">
                             {(() => {
                                const features = [];
                                if (g.gender) features.push(g.gender);
                                if (g.ethnicity) features.push(g.ethnicity);
                                
                                if (g.avatar_url) {
                                  try {
                                    const u = new URL(g.avatar_url);
                                    const hl = u.searchParams.get('hairLength');
                                    const ht = u.searchParams.get('hairTexture');
                                    const hc = u.searchParams.get('hairColor');
                                    
                                    let hairColorName = '';
                                    if (hc) {
                                      const cleanHex = hc.replace('#', '').toLowerCase();
                                      const mapping: Record<string, string> = {
                                        '282828': 'black',
                                        '4a3123': 'dark brown',
                                        'a0785a': 'light brown',
                                        'a55728': 'auburn',
                                        'c2a67e': 'ash blonde',
                                        'e8b07d': 'strawberry blonde',
                                        'd6b370': 'golden blonde',
                                        'f4f0e6': 'white blonde',
                                        'd95319': 'orange red',
                                        'ca4444': 'cherry red',
                                        'e8e1e1': 'silver / white',
                                        'f59797': 'pastel pink',
                                        'e84393': 'hot pink',
                                        '4b0082': 'indigo',
                                        '00a8ff': 'bright blue',
                                        '00b894': 'mint green'
                                      };
                                      hairColorName = mapping[cleanHex] || '';
                                    }
                                    
                                    const top = u.searchParams.get('top');
                                    
                                    if (hl) {
                                      if (hl === 'Bald') {
                                        features.push('bald');
                                      } else if (['Hijab', 'Turban', 'Beanie'].includes(hl)) {
                                        features.push(`wearing a ${hl.toLowerCase()}`);
                                      } else {
                                        const textureStr = ht ? ` ${ht.toLowerCase()}` : '';
                                        const colorStr = hairColorName ? ` ${hairColorName}` : '';
                                        features.push(`${hl.toLowerCase()}${textureStr}${colorStr} hair`);
                                      }
                                    } else if (top) {
                                      const cleanTop = top.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/[0-9]/g, '').trim();
                                      const colorStr = hairColorName ? ` ${hairColorName}` : '';
                                      features.push(`${cleanTop}${colorStr ? ` ${colorStr}` : ''} hair`);
                                    }
                                  } catch (e) {}
                                }

                                if (g.eye_color) features.push(`${g.eye_color} eyes`);
                                if (g.height) features.push(g.height);
                                if (g.traits && g.traits.length > 0) features.push(...g.traits);
                                
                                return features.length > 0 ? features.join(', ') : 'no features specified';
                             })()}
                          </div>
                        </div>
                        
                        <div className="mt-6">
                           <span className="text-gray-400 font-black text-xl opacity-70 tracking-tight">{g.isLinked ? 'Linked' : 'Manual'}</span>
                        </div>
                      </div>

                      {/* Right: Circular Cartoon Avatar Overlapping */}
                      <div className="absolute right-6 -top-12 w-28 h-28 rounded-full bg-[#7cd8ff] flex items-center justify-center overflow-hidden shadow-2xl border-[6px] border-[#f0f0f0] z-20 group-hover:-translate-y-2 group-hover:scale-105 transition-all duration-300">
                        {g.avatar_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={g.avatar_url.replace(/&?aiPhotoUrl=[^&]+/, '').replace(/&?aiPhotoHash=[^&]+/, '')} alt={g.name} className="w-full h-full object-cover scale-150 pt-6" />
                        ) : (
                          <span className="text-4xl font-black text-white">{g.name[0]}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 font-bold text-sm text-center py-12">Guest roster is empty.</p>
            )}
          </div>
        )}

        {/* PERSONAL DETAILS TAB */}
        {activeTab === 'personal' && (
          <div>
            <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
              <p className="text-gray-500 font-medium">Customer preferences and bio</p>
              <button
                onClick={openEditDetails}
                className="px-4 py-2 bg-brand-dark hover:bg-brand-pink text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
              >
                Edit Details
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Player Bio</h4>
                  <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {profile.bio || 'No bio provided.'}
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Fun Facts</h4>
                  <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {profile.fun_facts || 'No fun facts provided.'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Character Preferences</h4>
                  <div className="flex flex-wrap gap-2">
                    {(profile.character_preferences || []).length > 0 ? (
                      profile.character_preferences.map((pref: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-brand-dark text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                          {pref}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm font-bold">None specified</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Dietary Needs</h4>
                  <div className="flex flex-wrap gap-2">
                    {(profile.dietary_needs || []).length > 0 ? (
                      profile.dietary_needs.map((diet: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                          {diet}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm font-bold">None specified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>

      {/* Edit Player Details Modal */}
      {isEditDetailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditDetailsOpen(false)}>
          <div className="bg-white rounded-[32px] max-w-2xl w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsEditDetailsOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-black text-brand-dark tracking-tight uppercase">
                Edit Player <span className="text-brand-pink italic">Preferences</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-1">Configure user's preferences, bio, dietary needs, etc.</p>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Player Bio</label>
                    <textarea 
                      className={`${inputClass} min-h-[100px] resize-none`}
                      value={detailBio}
                      onChange={e => setDetailBio(e.target.value)}
                      placeholder="User's personal biography..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fun Facts</label>
                    <textarea 
                      className={`${inputClass} min-h-[100px] resize-none`}
                      value={detailFunFacts}
                      onChange={e => setDetailFunFacts(e.target.value)}
                      placeholder="Some interesting facts about the player..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Character Preferences Tag Editor */}
                  <div>
                    <label className={labelClass}>Character Preferences</label>
                    <div className="flex flex-wrap gap-1.5 mb-2 max-h-[80px] overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                      {detailPrefs.length > 0 ? (
                        detailPrefs.map(pref => (
                          <span key={pref} className="px-2.5 py-1 bg-brand-dark text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            {pref}
                            <button 
                              type="button" 
                              onClick={() => setDetailPrefs(detailPrefs.filter(p => p !== pref))}
                              className="text-brand-pink font-bold hover:scale-110 ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold p-1 italic">No preferences yet</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        className={inputClass}
                        value={prefInput}
                        onChange={e => setPrefInput(e.target.value)}
                        placeholder="Add tag (e.g. Comedy, Detective)"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (prefInput.trim() && !detailPrefs.includes(prefInput.trim())) {
                              setDetailPrefs([...detailPrefs, prefInput.trim()]);
                              setPrefInput('');
                            }
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (prefInput.trim() && !detailPrefs.includes(prefInput.trim())) {
                            setDetailPrefs([...detailPrefs, prefInput.trim()]);
                            setPrefInput('');
                          }
                        }}
                        className="px-4 bg-brand-dark hover:bg-brand-pink text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Dietary Needs Tag Editor */}
                  <div>
                    <label className={labelClass}>Dietary Needs</label>
                    <div className="flex flex-wrap gap-1.5 mb-2 max-h-[80px] overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                      {detailDiet.length > 0 ? (
                        detailDiet.map(diet => (
                          <span key={diet} className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            {diet}
                            <button 
                              type="button" 
                              onClick={() => setDetailDiet(detailDiet.filter(d => d !== diet))}
                              className="text-rose-900 font-bold hover:scale-110 ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold p-1 italic">No dietary needs yet</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        className={inputClass}
                        value={dietInput}
                        onChange={e => setDietInput(e.target.value)}
                        placeholder="Add diet (e.g. Vegetarian, Gluten-Free)"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (dietInput.trim() && !detailDiet.includes(dietInput.trim())) {
                              setDetailDiet([...detailDiet, dietInput.trim()]);
                              setDietInput('');
                            }
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (dietInput.trim() && !detailDiet.includes(dietInput.trim())) {
                            setDetailDiet([...detailDiet, dietInput.trim()]);
                            setDietInput('');
                          }
                        }}
                        className="px-4 bg-brand-dark hover:bg-brand-pink text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsEditDetailsOpen(false)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 py-3.5 bg-brand-dark hover:bg-brand-pink text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Guest Modal */}
      {isAddGuestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddGuestOpen(false)}>
          <div className="bg-white rounded-[32px] max-w-2xl w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsAddGuestOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-black text-brand-dark tracking-tight uppercase">
                Add New <span className="text-brand-pink italic">Guest</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-1">Create a guest profile manually for this customer's roster.</p>
            </div>

            <form onSubmit={handleAddGuestSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Name *</label>
                    <input 
                      type="text" 
                      className={inputClass} 
                      value={addGuestName}
                      onChange={e => setAddGuestName(e.target.value)}
                      placeholder="Guest's full name"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input 
                      type="email" 
                      className={inputClass} 
                      value={addGuestEmail}
                      onChange={e => setAddGuestEmail(e.target.value)}
                      placeholder="guest@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <div>
                      <label className={labelClass}>Gender</label>
                      <select 
                        className={inputClass}
                        value={addGuestGender}
                        onChange={e => setAddGuestGender(e.target.value)}
                      >
                        <option value="adaptable">Adaptable</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-Binary</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Eyes</label>
                      <input 
                        type="text" 
                        className={inputClass} 
                        value={addGuestEyeColor}
                        onChange={e => setAddGuestEyeColor(e.target.value)}
                        placeholder="Blue"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Height</label>
                      <input 
                        type="text" 
                        className={inputClass} 
                        value={addGuestHeight}
                        onChange={e => setAddGuestHeight(e.target.value)}
                        placeholder="6'1"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Ethnicity</label>
                      <select 
                        className={inputClass} 
                        value={addGuestEthnicity}
                        onChange={e => setAddGuestEthnicity(e.target.value)}
                      >
                        <option value="">Unspecified</option>
                        <option value="Caucasian / White">Caucasian / White</option>
                        <option value="Black / African Descent">Black / African Descent</option>
                        <option value="East Asian">East Asian</option>
                        <option value="South Asian">South Asian</option>
                        <option value="Southeast Asian">Southeast Asian</option>
                        <option value="Hispanic / Latino">Hispanic / Latino</option>
                        <option value="Middle Eastern">Middle Eastern</option>
                        <option value="Native American / Indigenous">Native American / Indigenous</option>
                        <option value="Pacific Islander">Pacific Islander</option>
                        <option value="Mixed / Multiracial">Mixed / Multiracial</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Guest Bio</label>
                    <textarea 
                      className={`${inputClass} min-h-[90px] resize-none`}
                      value={addGuestBio}
                      onChange={e => setAddGuestBio(e.target.value)}
                      placeholder="Brief guest description..."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Guest Traits</label>
                    <div className="flex flex-wrap gap-1.5 mb-2 max-h-[70px] overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                      {addGuestTraits.length > 0 ? (
                        addGuestTraits.map(t => (
                          <span key={t} className="px-2.5 py-1 bg-brand-pink/10 text-brand-pink rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            {t}
                            <button 
                              type="button" 
                              onClick={() => setAddGuestTraits(addGuestTraits.filter(item => item !== t))}
                              className="text-brand-pink font-bold hover:scale-110 ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold p-1 italic">No traits yet</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        className={inputClass}
                        value={addTraitInput}
                        onChange={e => setAddTraitInput(e.target.value)}
                        placeholder="Add trait (e.g. Outgoing, Shy)"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (addTraitInput.trim() && !addGuestTraits.includes(addTraitInput.trim())) {
                              setAddGuestTraits([...addGuestTraits, addTraitInput.trim()]);
                              setAddTraitInput('');
                            }
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (addTraitInput.trim() && !addGuestTraits.includes(addTraitInput.trim())) {
                            setAddGuestTraits([...addGuestTraits, addTraitInput.trim()]);
                            setAddTraitInput('');
                          }
                        }}
                        className="px-4 bg-brand-dark hover:bg-brand-pink text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddGuestOpen(false)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 py-3.5 bg-brand-dark hover:bg-brand-pink text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guest Modal (Details / Edit) */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setSelectedGuest(null); setIsEditingGuest(false); }}>
          <div className="bg-white rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => { setSelectedGuest(null); setIsEditingGuest(false); }}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            
            <div className="flex flex-col md:flex-row">
              {/* Photo Side (Only shown in Details Mode or if editing a manual guest) */}
              <div className="w-full md:w-1/2 bg-gray-100 relative min-h-[300px]">
                {selectedGuest.avatar_url ? (
                  <AIPhotoRenderer avatarUrl={selectedGuest.avatar_url} name={selectedGuest.name} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <p className="font-bold text-sm">No Photo Generated</p>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
                  <div className="text-center">
                    <span className="px-3 py-1 bg-black/50 backdrop-blur-md text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                      AI Reference Photo
                    </span>
                  </div>
                  <button
                    id={`gen-single-${selectedGuest.id}`}
                    onClick={async () => {
                      const btn = document.getElementById(`gen-single-${selectedGuest.id}`);
                      if (btn) btn.innerText = 'Generating... (Wait)';
                      try {
                        const res = await fetch(`/api/admin/generate-avatar-single`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ guestId: selectedGuest.id, userId: profile.id })
                        });
                        if (res.ok) {
                          if (btn) btn.innerText = 'Done! Refreshing...';
                          window.location.reload();
                        } else {
                          const errorData = await res.json().catch(() => ({}));
                          alert(`Failed: ${errorData.error || 'Unknown error'}`);
                          if (btn) btn.innerText = 'Regenerate Photo';
                        }
                      } catch (e: any) {
                        alert(`Error: ${e.message}`);
                        if (btn) btn.innerText = 'Regenerate Photo';
                      }
                    }}
                    className="w-full py-2 bg-brand-pink text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-dark transition-colors shadow-lg"
                  >
                    Regenerate Photo
                  </button>
                </div>
              </div>
              
              {/* Details / Edit Form Side */}
              <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
                {isEditingGuest ? (
                  /* EDIT MODE FORM */
                  <form onSubmit={handleEditGuestSubmit} className="space-y-4">
                    <div className="mb-2">
                      <h4 className="text-lg font-black uppercase tracking-tight text-brand-dark">Edit Guest</h4>
                      <p className="text-[10px] font-bold text-gray-400">Modify manually entered guest credentials</p>
                    </div>

                    <div>
                      <label className={labelClass}>Name *</label>
                      <input 
                        type="text" 
                        className={inputClass} 
                        value={editGuestName}
                        onChange={e => setEditGuestName(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Email</label>
                      <input 
                        type="email" 
                        className={inputClass} 
                        value={editGuestEmail}
                        onChange={e => setEditGuestEmail(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={labelClass}>Gender</label>
                        <select 
                          className={inputClass}
                          value={editGuestGender}
                          onChange={e => setEditGuestGender(e.target.value)}
                        >
                          <option value="adaptable">Adaptable</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="non-binary">Non-Binary</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Eyes</label>
                        <input 
                          type="text" 
                          className={inputClass} 
                          value={editGuestEyeColor}
                          onChange={e => setEditGuestEyeColor(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Height</label>
                        <input 
                          type="text" 
                          className={inputClass} 
                          value={editGuestHeight}
                          onChange={e => setEditGuestHeight(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className={labelClass}>Ethnicity</label>
                      <select 
                        className={inputClass} 
                        value={editGuestEthnicity}
                        onChange={e => setEditGuestEthnicity(e.target.value)}
                      >
                        <option value="">Unspecified</option>
                        <option value="Caucasian / White">Caucasian / White</option>
                        <option value="Black / African Descent">Black / African Descent</option>
                        <option value="East Asian">East Asian</option>
                        <option value="South Asian">South Asian</option>
                        <option value="Southeast Asian">Southeast Asian</option>
                        <option value="Hispanic / Latino">Hispanic / Latino</option>
                        <option value="Middle Eastern">Middle Eastern</option>
                        <option value="Native American / Indigenous">Native American / Indigenous</option>
                        <option value="Pacific Islander">Pacific Islander</option>
                        <option value="Mixed / Multiracial">Mixed / Multiracial</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Bio</label>
                      <textarea 
                        className={`${inputClass} min-h-[70px] resize-none`}
                        value={editGuestBio}
                        onChange={e => setEditGuestBio(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Traits</label>
                      <div className="flex flex-wrap gap-1.5 mb-2 max-h-[60px] overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                        {editGuestTraits.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-brand-pink/10 text-brand-pink rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            {t}
                            <button 
                              type="button" 
                              onClick={() => setEditGuestTraits(editGuestTraits.filter(item => item !== t))}
                              className="text-brand-pink font-bold ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          className={inputClass}
                          value={editTraitInput}
                          onChange={e => setEditTraitInput(e.target.value)}
                          placeholder="Add trait"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (editTraitInput.trim() && !editGuestTraits.includes(editTraitInput.trim())) {
                                setEditGuestTraits([...editGuestTraits, editTraitInput.trim()]);
                                setEditTraitInput('');
                              }
                            }
                          }}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            if (editTraitInput.trim() && !editGuestTraits.includes(editTraitInput.trim())) {
                              setEditGuestTraits([...editGuestTraits, editTraitInput.trim()]);
                              setEditTraitInput('');
                            }
                          }}
                          className="px-3 bg-brand-dark hover:bg-brand-pink text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setIsEditingGuest(false)}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="flex-1 py-2 bg-brand-dark hover:bg-brand-pink text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                ) : (
                  /* VIEW DETAILS MODE */
                  <div>
                    <div className="mb-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-2">
                        {selectedGuest.isLinked ? 'Linked Account' : 'Manual Entry'}
                      </p>
                      <h2 className="text-3xl font-black text-brand-dark tracking-tight leading-none mb-2">{selectedGuest.name}</h2>
                      {selectedGuest.email && (
                        <p className="text-sm font-bold text-gray-400">{selectedGuest.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Physical Attributes</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedGuest.gender ? <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">{selectedGuest.gender}</span> : null}
                          {selectedGuest.eye_color ? <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">{selectedGuest.eye_color} Eyes</span> : null}
                          {selectedGuest.height ? <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">{selectedGuest.height}</span> : null}
                          {selectedGuest.ethnicity ? <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">{selectedGuest.ethnicity}</span> : null}
                          {(() => {
                             if (!selectedGuest.avatar_url || selectedGuest.avatar_url.startsWith('data:')) return null;
                             try {
                               const url = new URL(selectedGuest.avatar_url);
                               const hc = url.searchParams.get('hairColor');
                               const sc = url.searchParams.get('skinColor');
                               const build = url.searchParams.get('build');
                               const features = url.searchParams.get('distinctiveFeatures');
                               const facialHair = url.searchParams.get('facialHair');
                               const hl = url.searchParams.get('hairLength');
                               const ht = url.searchParams.get('hairTexture');
                               const top = url.searchParams.get('top');
                               
                               let hairColorName = '';
                               if (hc) {
                                 const cleanHex = hc.replace('#', '').toLowerCase();
                                 const mapping: Record<string, string> = {
                                   '282828': 'Black',
                                   '4a3123': 'Dark Brown',
                                   'a0785a': 'Light Brown',
                                   'a55728': 'Auburn',
                                   'c2a67e': 'Ash Blonde',
                                   'e8b07d': 'Strawberry Blonde',
                                   'd6b370': 'Golden Blonde',
                                   'f4f0e6': 'White Blonde',
                                   'd95319': 'Orange Red',
                                   'ca4444': 'Cherry Red',
                                   'e8e1e1': 'Silver / White',
                                   'f59797': 'Pastel Pink',
                                   'e84393': 'Hot Pink',
                                   '4b0082': 'Indigo',
                                   '00a8ff': 'Bright Blue',
                                   '00b894': 'Mint Green'
                                 };
                                 hairColorName = mapping[cleanHex] || '';
                               }
                               
                               let hairStr = '';
                               if (hl) {
                                 if (hl === 'Bald') {
                                   hairStr = 'Bald';
                                 } else if (['Hijab', 'Turban', 'Beanie'].includes(hl)) {
                                   hairStr = `Wearing a ${hl}`;
                                 } else {
                                   const textureStr = ht ? ` ${ht}` : '';
                                   const colorStr = hairColorName ? ` ${hairColorName}` : '';
                                   hairStr = `${hl}${textureStr}${colorStr} Hair`;
                                 }
                               } else if (top) {
                                 const cleanTop = top.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/[0-9]/g, '').trim();
                                 const friendlyTop = cleanTop.charAt(0).toUpperCase() + cleanTop.slice(1);
                                 const colorStr = hairColorName ? ` (${hairColorName})` : '';
                                 hairStr = `Hair Style: ${friendlyTop}${colorStr}`;
                               }

                               return (
                                 <>
                                   {hairStr && <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">{hairStr}</span>}
                                   {sc && <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">Skin: #{sc}</span>}
                                   {build && <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">Build: {build}</span>}
                                   {facialHair && <span className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">Facial Hair: {facialHair}</span>}
                                   {features && features.split(',').map(f => (
                                     <span key={f} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">{f}</span>
                                   ))}
                                 </>
                               );
                             } catch(e) { return null; }
                           })()}
                          {!selectedGuest.gender && !selectedGuest.eye_color && !selectedGuest.height && !selectedGuest.avatar_url && <span className="text-xs text-gray-400 italic">No physical attributes provided.</span>}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Character Traits</h4>
                        <div className="flex flex-wrap gap-2">
                          {(selectedGuest.traits && selectedGuest.traits.length > 0) ? (
                            selectedGuest.traits.map((t: string, idx: number) => (
                              <span key={idx} className="px-3 py-1.5 bg-brand-pink/10 text-brand-pink rounded-lg text-xs font-black uppercase tracking-widest">
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 italic">No traits selected.</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Guest Bio</h4>
                        {selectedGuest.bio ? (
                          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                            {selectedGuest.bio}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No bio provided.</p>
                        )}
                      </div>

                      {/* Admin Actions */}
                      {!selectedGuest.isLinked && (
                        <div className="pt-6 flex gap-3 border-t border-gray-100">
                          <button
                            onClick={() => startEditingGuest(selectedGuest)}
                            className="flex-1 py-2.5 bg-gray-100 hover:bg-brand-pink hover:text-white text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                          >
                            Edit Guest
                          </button>
                          <button
                            onClick={handleDeleteGuest}
                            className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                          >
                            Delete Guest
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
