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
  const [theme, setTheme] = useState(initialTheme || '');
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
      setSavedGuests([res.guest, ...savedGuests]);
      // Auto assign if there's room
      if (assignedGuests.length < playerCount) {
        setAssignedGuests([...assignedGuests, res.guest]);
      }
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
      complexity,
      guests: assignedGuests,
      insideJokes,
    });

    if (res.mysteryId) {
      setMysteryId(res.mysteryId);
      setStep(5); // Go to checkout
    } else {
      setError(res.error || 'Failed to generate mystery.');
    }
    setIsProcessing(false);
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
            <span className={`text-xs font-bold uppercase tracking-widest ${step >= 1 ? 'text-brand-pink' : 'text-slate-400'}`}>Base</span>
            <span className={`text-xs font-bold uppercase tracking-widest ${step >= 2 ? 'text-brand-pink' : 'text-slate-400'}`}>Players</span>
            <span className={`text-xs font-bold uppercase tracking-widest ${step >= 3 ? 'text-brand-pink' : 'text-slate-400'}`}>Cast</span>
            <span className={`text-xs font-bold uppercase tracking-widest ${step >= 4 ? 'text-brand-pink' : 'text-slate-400'}`}>Jokes</span>
          </div>
        </div>
      )}

      {/* Step 1: Base */}
      {step === 1 && (
        <div className="space-y-8 animate-in fade-in">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Choose your mystery tier.</h2>
            <p className="text-slate-500">The tier determines the complexity, number of subplots, and depth of the story.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['basic', 'premium', 'grand'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setComplexity(tier)}
                className={`p-6 rounded-3xl border-2 text-left transition-all ${
                  complexity === tier 
                    ? 'border-brand-pink bg-brand-pink/5 ring-4 ring-brand-pink/20' 
                    : 'border-slate-200 hover:border-brand-pink/50 hover:bg-slate-50'
                }`}
              >
                <h3 className={`text-xl font-black uppercase tracking-tight mb-2 ${complexity === tier ? 'text-brand-pink' : 'text-slate-900'}`}>
                  {tier}
                </h3>
                <p className="text-sm font-medium text-slate-500">
                  {tier === 'basic' && 'A fun, straightforward mystery perfect for beginners and casual parties.'}
                  {tier === 'premium' && 'Our most popular tier. Deep subplots and hidden motives for everyone.'}
                  {tier === 'grand' && 'A complex, multi-layered narrative designed for experienced sleuths.'}
                </p>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Theme Idea (Optional)</label>
            <input 
              type="text" 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. 1920s Gatsby, Haunted Mansion, Sci-Fi Space Station"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-slate-900 font-medium focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none"
            />
          </div>

          <div className="flex justify-end pt-8">
            <button onClick={handleNext} className="btn-pill px-8 py-4 bg-brand-pink text-white font-black uppercase tracking-widest text-sm hover:bg-brand-dark">
              Next Step &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Player Count */}
      {step === 2 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">How many players?</h2>
            <p className="text-slate-500">We will generate exactly this many unique, fully-fleshed out character profiles.</p>
          </div>

          <div className="bg-white border border-slate-200 p-8 rounded-3xl flex flex-col items-center">
            <div className="text-7xl font-black text-brand-dark mb-8">{playerCount}</div>
            <input 
              type="range" 
              min="4" 
              max="20" 
              value={playerCount}
              onChange={(e) => setPlayerCount(parseInt(e.target.value))}
              className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-pink"
            />
            <div className="w-full flex justify-between mt-4 text-sm font-bold text-slate-400">
              <span>4</span>
              <span>20+</span>
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
            <h2 className="text-3xl font-black text-slate-900 mb-2">Cast your friends.</h2>
            <p className="text-slate-500">
              Select {playerCount} friends to play. You've assigned <strong className="text-brand-pink">{assignedGuests.length}</strong> so far.
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
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    {guest.avatar_url && (
                       // eslint-disable-next-line @next/next/no-img-element
                      <img src={guest.avatar_url} alt={guest.name} className="w-full h-full object-cover" />
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
              disabled={assignedGuests.length === 0}
              className="btn-pill px-8 py-4 bg-brand-pink text-white font-black uppercase tracking-widest text-sm hover:bg-brand-dark disabled:opacity-50"
            >
              Next Step &rarr;
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
              {isProcessing ? 'Saving Configuration...' : 'Finalize Package'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Checkout */}
      {step === 5 && mysteryId && (
        <div className="animate-in fade-in slide-in-from-bottom-8">
          <div className="bg-brand-dark rounded-3xl p-8 mb-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-white/5 rotate-12 pointer-events-none">
              <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-4 relative z-10">
              Your package will be ready in ~20 mins...
            </h2>
            <p className="text-brand-pink font-bold uppercase tracking-widest relative z-10">
              We will email you as soon as it's generated!
            </p>
            <p className="text-slate-400 mt-4 relative z-10">
              Fill in your card details below to finalize the creation process.
            </p>
          </div>

          <CheckoutClient 
            mysteryId={mysteryId}
            initialTier={complexity}
            guests={assignedGuests.length}
            locale={locale}
            currency={currency}
            mysteryTitle={theme ? `${theme} Mystery` : 'Custom Murder Mystery'}
          />
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
