'use client';

import React, { useState } from 'react';
import { Locale } from '@/lib/i18n-config';
import { GuestModal } from '@/components/account/GuestModal';
import { saveGuestAction } from '@/app/actions/guests';
import { saveWizardAction } from '@/app/actions/wizard';
import CheckoutClient from '@/components/checkout/CheckoutClient';
import { getCurrencyForLocale } from '@/utils/localization';
import { useRouter } from 'next/navigation';

interface WizardClientProps {
  initialGuests: any[];
  locale: Locale;
  userId: string;
  initialTheme?: string;
  initialComplexity?: string;
  initialPro?: boolean;
}

export default function WizardClient({ 
  initialGuests, 
  locale, 
  userId,
  initialTheme,
  initialComplexity,
  initialPro
}: WizardClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State Step 1
  const [theme, setTheme] = useState(initialTheme || 'Penthouse Murder');
  const [occasion, setOccasion] = useState('Birthday Party');
  const [spiceLevel, setSpiceLevel] = useState<'clean' | 'mild' | 'spicy' | 'filthy'>('mild');
  const [complexity, setComplexity] = useState<'basic' | 'premium' | 'grand'>(
    (initialComplexity === 'basic' || initialComplexity === 'premium' || initialComplexity === 'grand') 
      ? initialComplexity 
      : 'premium'
  );

  // State Step 2 & 3
  const [playerCount, setPlayerCount] = useState(8);
  const [savedGuests, setSavedGuests] = useState<any[]>(initialGuests);
  const [assignedGuests, setAssignedGuests] = useState<any[]>([]);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [generatingAvatars, setGeneratingAvatars] = useState<Set<string>>(new Set());

  // State Step 4
  const [insideJokes, setInsideJokes] = useState('');

  // State Step 5/6 (Checkout)
  const [mysteryId, setMysteryId] = useState<string | null>(null);

  const currency = getCurrencyForLocale(locale);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSaveNewGuest = async (guestData: any) => {
    const res = await saveGuestAction(guestData);
    if (res.guest) {
      const savedGuest = res.guest;
      setSavedGuests(prev => [savedGuest, ...prev]);
      if (assignedGuests.length < playerCount) {
        setAssignedGuests(prev => [...prev, savedGuest]);
      }

      setGeneratingAvatars(prev => new Set(prev).add(savedGuest.id));
      import('@/app/actions/ai-guests').then(({ generateGuestAvatarAction }) => {
        generateGuestAvatarAction(savedGuest.id, guestData)
          .then((actionRes) => {
             setSavedGuests(prev => prev.map(g => g.id === savedGuest.id ? { ...g, avatar_url: actionRes.publicUrl } : g));
             setAssignedGuests(prev => prev.map(g => g.id === savedGuest.id ? { ...g, avatar_url: actionRes.publicUrl } : g));
          })
          .catch(err => console.error('Failed to generate guest avatar:', err))
          .finally(() => {
            setGeneratingAvatars(prev => {
              const newSet = new Set(prev);
              newSet.delete(savedGuest.id);
              return newSet;
            });
          });
      });
    } else if (res.error) {
      alert('Error saving guest: ' + res.error);
    }
  };

  const toggleGuestAssignment = (guest: any) => {
    if (assignedGuests.find(g => g.id === guest.id)) {
      setAssignedGuests(assignedGuests.filter(g => g.id !== guest.id));
    } else {
      if (assignedGuests.length < playerCount) {
        setAssignedGuests([...assignedGuests, guest]);
      }
    }
  };

  const handleFinishConfiguration = async () => {
    setIsProcessing(true);
    setError(null);
    const title = theme ? `${theme} Mystery` : 'Custom Murder Mystery';
    
    const res = await saveWizardAction({
      title,
      theme,
      complexity,
      spiceLevel,
      occasion,
      guests: assignedGuests,
      insideJokes,
    });

    if (res.mysteryId) {
      router.push(`/${locale}/checkout/${res.mysteryId}?guests=${assignedGuests.length}`);
      return;
    } else {
      setError(res.error || 'Failed to generate mystery.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      {/* Progress Indicator */}
      {step < 5 && (
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10 rounded-full"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-pink -z-10 rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            ></div>
            
            {[1, 2, 3, 4].map(num => (
              <div 
                key={num} 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-4 transition-colors ${
                  step >= num 
                    ? 'bg-brand-pink border-white text-white shadow-md' 
                    : 'bg-white border-slate-100 text-slate-300'
                }`}
              >
                {num}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4">
            <span className={`text-xs font-bold uppercase tracking-widest ${step >= 1 ? 'text-brand-pink' : 'text-slate-400'}`}>Base Setup</span>
            <span className={`text-xs font-bold uppercase tracking-widest ${step >= 2 ? 'text-brand-pink' : 'text-slate-400'}`}>Players</span>
            <span className={`text-xs font-bold uppercase tracking-widest ${step >= 3 ? 'text-brand-pink' : 'text-slate-400'}`}>Cast</span>
            <span className={`text-xs font-bold uppercase tracking-widest ${step >= 4 ? 'text-brand-pink' : 'text-slate-400'}`}>Jokes & Notes</span>
          </div>
        </div>
      )}

      {/* Step 1: Base Setup */}
      {step === 1 && (
        <div className="space-y-10 animate-in fade-in">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Configure Your Mystery.</h2>
            <p className="text-slate-500">Select the event, theme, complexity, and spice level for your group.</p>
          </div>

          {/* Event Occasion */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">1. Celebrating Occasion</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['Birthday Party', 'Hen / Bachelorette', 'Stag / Bachelor', 'Dinner Party', 'Halloween', 'New Year Eve', 'Corporate Event', 'Casual Hangout'].map(occ => (
                <button
                  key={occ}
                  onClick={() => setOccasion(occ)}
                  className={`p-3.5 rounded-2xl border-2 text-xs font-black uppercase tracking-wider transition-all text-center ${
                    occasion === occ 
                      ? 'border-brand-pink bg-brand-pink/5 text-brand-pink ring-2 ring-brand-pink/20' 
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">2. Theme Preset</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              {[
                { name: 'Penthouse Murder', desc: 'High-stakes glam, VIP penthouse scandal' },
                { name: '1920s Speakeasy Gala', desc: 'Flappers, mobsters, prohibition secrets' },
                { name: 'VIP Music Festival', desc: 'Backstage drama, rockstars & influencer feuds' },
                { name: 'Haunted Gothic Manor', desc: 'Eerie mystery, aristocratic inheritance' },
              ].map(t => (
                <button
                  key={t.name}
                  onClick={() => setTheme(t.name)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    theme === t.name 
                      ? 'border-brand-pink bg-brand-pink/5 ring-2 ring-brand-pink/20' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`font-black text-sm uppercase ${theme === t.name ? 'text-brand-pink' : 'text-slate-900'}`}>{t.name}</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">{t.desc}</div>
                </button>
              ))}
            </div>
            <input 
              type="text" 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Or enter custom theme (e.g. 80s Disco Murder)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none"
            />
          </div>

          {/* Spice Level */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">3. Spice Level</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { level: 'clean', label: 'Clean (Family)', emoji: '😇' },
                { level: 'mild', label: 'Mild (PG-13)', emoji: '🥂' },
                { level: 'spicy', label: 'Spicy (Adults)', emoji: '🌶️' },
                { level: 'filthy', label: 'Filthy (18+ Uncensored)', emoji: '🔥' },
              ].map(s => (
                <button
                  key={s.level}
                  onClick={() => setSpiceLevel(s.level as any)}
                  className={`p-3.5 rounded-2xl border-2 text-xs font-black uppercase tracking-wider transition-all text-center flex flex-col items-center gap-1 ${
                    spiceLevel === s.level 
                      ? 'border-brand-pink bg-brand-pink/5 text-brand-pink ring-2 ring-brand-pink/20' 
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">{s.emoji}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Complexity Tier */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">4. Complexity Tier</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['basic', 'premium', 'grand'] as const).map(tier => (
                <button
                  key={tier}
                  onClick={() => setComplexity(tier)}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${
                    complexity === tier 
                      ? 'border-brand-pink bg-brand-pink/5 ring-2 ring-brand-pink/20' 
                      : 'border-slate-200 hover:border-brand-pink/50 hover:bg-slate-50'
                  }`}
                >
                  <h3 className={`text-base font-black uppercase tracking-tight mb-1 ${complexity === tier ? 'text-brand-pink' : 'text-slate-900'}`}>
                    {tier}
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    {tier === 'basic' && 'Straightforward mystery perfect for beginners.'}
                    {tier === 'premium' && 'Our most popular tier. Deep subplots and secrets.'}
                    {tier === 'grand' && 'Complex, multi-layered story for expert sleuths.'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button onClick={handleNext} className="btn-pill px-8 py-4 bg-brand-pink text-white font-black uppercase tracking-widest text-sm hover:bg-brand-dark">
              Next Step: Players &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Suspect Cast Size & Play Mode */}
      {step === 2 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">How many suspects in the story?</h2>
            <p className="text-slate-500">
              Every mystery requires at least <strong>5 characters</strong> so the alibis, backstories, and motives tangle properly. Hosting a party? Pick your exact guest count (5–16) so there are zero unplayed side characters. Playing solo or as a duo? Pick 5–8 characters and solve all their dossiers together like a detective case file!
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-8 rounded-3xl flex flex-col items-center">
            <div className="text-7xl font-black text-brand-dark mb-2">{Math.max(5, playerCount)}</div>
            <div className="text-xs font-black uppercase tracking-widest text-brand-pink mb-8">
              Suspect Dossiers Generated (Playable by 1–{Math.max(5, playerCount)} People)
            </div>
            <input 
              type="range" 
              min="5" 
              max="16" 
              value={Math.max(5, playerCount)}
              onChange={(e) => setPlayerCount(parseInt(e.target.value))}
              className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-pink"
            />
            <div className="w-full flex justify-between mt-4 text-sm font-bold text-slate-400">
              <span>5 Suspects (Min Web)</span>
              <span>16 Suspects (Full House)</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-black uppercase tracking-widest text-brand-dark mb-1">
                🎭 Hosting a Party (5–16 Guests)?
              </p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Set the slider to your exact guest count. Every guest plays 1 suspect, and there are zero random side characters that nobody is playing.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-brand-pink/5 border border-brand-pink/20">
              <p className="text-xs font-black uppercase tracking-widest text-brand-pink mb-1">
                📁 Solving Solo or as a Duo (1–4 Players)?
              </p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Leave the slider at 5–8 suspects! You don&apos;t need to act out a role to get information, you&apos;ll receive the full case file of all suspects, texts, and audio clues to solve together.
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-8">
            <button onClick={handleBack} className="px-8 py-4 font-bold text-slate-500 hover:text-slate-900">
              &larr; Back
            </button>
            <button onClick={handleNext} className="btn-pill px-8 py-4 bg-brand-pink text-white font-black uppercase tracking-widest text-sm hover:bg-brand-dark">
              Next Step &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Assign Guests */}
      {step === 3 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Cast the {Math.max(5, playerCount)} suspects.</h2>
            <p className="text-slate-500">
              Select {Math.max(5, playerCount)} friends/profiles to star in the mystery (minimum 5 so the backstories tangle). Playing solo or in a duo? Cast your friends or favourite personalities just for the hilarious personalized DMs! You&apos;ve assigned <strong className="text-brand-pink">{assignedGuests.length} / {Math.max(5, playerCount)}</strong> so far.
            </p>
          </div>

          <button 
            onClick={() => setIsGuestModalOpen(true)}
            className="w-full py-4 border-2 border-dashed border-brand-pink/50 text-brand-pink font-black uppercase tracking-widest rounded-2xl hover:bg-brand-pink/5 transition-colors"
          >
            + Create New Guest
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 pb-8">
            {savedGuests.map((guest) => {
              const isAssigned = assignedGuests.find(g => g.id === guest.id);
              const isDisabled = !isAssigned && assignedGuests.length >= playerCount;
              
              return (
                <div 
                  key={guest.id}
                  onClick={() => !isDisabled && toggleGuestAssignment(guest)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    isAssigned 
                      ? 'border-brand-pink bg-brand-pink/5 shadow-md shadow-brand-pink/10' 
                      : isDisabled 
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 hover:border-brand-pink/50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
                    {guest.avatar_url && (
                       // eslint-disable-next-line @next/next/no-img-element
                      <img src={guest.avatar_url} alt={guest.name} className="w-full h-full object-cover" />
                    )}
                    {generatingAvatars.has(guest.id) && (
                      <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                        <svg className="animate-spin h-4 w-4 text-brand-pink mb-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{guest.name}</h4>
                    <p className="text-xs text-slate-500 truncate">{guest.traits?.join(', ') || 'No traits'}</p>
                  </div>
                  <div className="shrink-0">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isAssigned ? 'bg-brand-pink border-brand-pink text-white' : 'border-slate-300'
                    }`}>
                      {isAssigned && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {savedGuests.length === 0 && (
              <div className="col-span-1 sm:col-span-2 text-center py-12 text-slate-500 font-medium">
                You don't have any guests saved yet. Create one above!
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button onClick={handleBack} className="px-8 py-4 font-bold text-slate-500 hover:text-slate-900">
              &larr; Back
            </button>
            <button 
              onClick={handleNext} 
              disabled={assignedGuests.length < 5}
              className="btn-pill px-8 py-4 bg-brand-pink text-white font-black uppercase tracking-widest text-sm hover:bg-brand-dark disabled:opacity-50"
            >
              {assignedGuests.length < 5 ? `Select ${5 - assignedGuests.length} More (Min 5)` : 'Next Step →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Customization */}
      {step === 4 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">The Secret Sauce.</h2>
            <p className="text-slate-500">Tell us about your group's inside jokes, references, or specific things you want the AI to weave into the story and clues.</p>
          </div>

          <div>
            <textarea
              value={insideJokes}
              onChange={(e) => setInsideJokes(e.target.value)}
              rows={8}
              placeholder="e.g. 'Make sure to mention that Uncle Dave always burns the turkey at Thanksgiving. Also, Sarah has a weird obsession with collecting vintage spoons...'"
              className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 text-slate-900 font-medium focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none resize-none"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-500 rounded-xl font-bold text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-between pt-8">
            <button onClick={handleBack} disabled={isProcessing} className="px-8 py-4 font-bold text-slate-500 hover:text-slate-900 disabled:opacity-50">
              &larr; Back
            </button>
            <button 
              onClick={handleFinishConfiguration} 
              disabled={isProcessing}
              className="btn-pill px-8 py-4 bg-brand-pink text-white font-black uppercase tracking-widest text-sm hover:bg-brand-dark disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? 'Saving & Redirecting to Checkout...' : 'Continue to Checkout →'}
            </button>
          </div>
        </div>
      )}

      <GuestModal 
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onSave={handleSaveNewGuest}
      />
    </div>
  );
}
