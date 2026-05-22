'use client';

import React, { useState, useEffect } from 'react';
import { completeOnboarding } from '@/app/actions/onboarding';

interface OnboardingWizardProps {
  onboardingCompleted: boolean;
  userName: string;
}

export function OnboardingWizard({ onboardingCompleted, userName }: OnboardingWizardProps) {
  const [isOpen, setIsOpen] = useState(!onboardingCompleted);
  const [step, setStep] = useState(1);
  const [isCompleting, setIsCompleting] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const totalSteps = 3;

  useEffect(() => {
    if (!isOpen) return;

    let targetId: string | null = null;
    if (step === 2) targetId = 'tour-step-mysteries';
    if (step === 3) targetId = 'tour-step-roster';

    if (targetId) {
      // Find the element in the DOM
      const el = document.getElementById(targetId);
      if (el) {
        // Force the element above the backdrop and add a glow
        el.classList.add('relative', 'z-[110]', 'ring-4', 'ring-brand-pink', 'bg-slate-800/80', 'rounded-xl');
        
        // Measure its position
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        
        // Cleanup function runs when step changes or component unmounts
        return () => {
          el.classList.remove('relative', 'z-[110]', 'ring-4', 'ring-brand-pink', 'bg-slate-800/80', 'rounded-xl');
        };
      }
    } else {
      setTargetRect(null);
    }
  }, [step, isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await completeOnboarding();
      setIsOpen(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsCompleting(false);
    }
  };

  return (
    <>
      {/* Dark backdrop */}
      <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-[2px] transition-all duration-500" />

      {/* Step 1: Central Welcome Modal */}
      {step === 1 && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-brand-dark p-8 flex-col justify-between relative overflow-hidden">
              <div className="relative z-10 text-center">
                <h2 className="text-brand-pink font-black uppercase tracking-widest text-xs mb-2">Welcome</h2>
                <p className="text-white font-bold text-xl leading-tight">Back Pocket Mysteries</p>
              </div>
            </div>
            
            <div className="p-8 space-y-4">
              <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
                Welcome, {userName || 'Host'}!
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                We're thrilled to have you here. Back Pocket Mysteries gives you everything you need to host unforgettable murder mystery parties. Let's take a quick look around.
              </p>

              <div className="pt-6 flex justify-between items-center border-t border-slate-100 mt-6">
                <div className="flex gap-1.5">
                  {[...Array(totalSteps)].map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full ${i + 1 === step ? 'w-4 bg-brand-pink' : 'w-1.5 bg-slate-200'}`} />
                  ))}
                </div>
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-brand-dark text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-pink transition-colors"
                >
                  Start Tour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 & 3: Contextual Tooltips attached to the highlighted sidebar element */}
      {step > 1 && targetRect && (
        <div 
          className="fixed z-[105] w-72 md:w-80 animate-in slide-in-from-left-4 fade-in duration-300"
          style={{
            // Position tooltip to the right of the highlighted element
            top: `${targetRect.top}px`,
            left: `${targetRect.right + 20}px`,
          }}
        >
          <div className="bg-white rounded-2xl p-6 shadow-2xl relative">
            {/* Arrow pointing left */}
            <div className="absolute top-4 -left-3 w-6 h-6 bg-white rotate-45 rounded-sm" />
            
            <div className="relative z-10">
              <div className="text-brand-pink mb-2">
                {step === 2 && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                )}
                {step === 3 && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                )}
              </div>
              
              <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-2">
                {step === 2 ? 'Your Mysteries' : 'Profile & Guests'}
              </h3>
              
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                {step === 2 
                  ? "Here you'll find all the mysteries you've purchased. You can assign characters and download your digital game packs."
                  : "Keep track of your own avatar and your roster of guests. Send them invitations right from the platform!"
                }
              </p>

              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <div className="flex gap-1.5">
                  {[...Array(totalSteps)].map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? 'w-4 bg-brand-pink' : 'w-1.5 bg-slate-200'}`} />
                  ))}
                </div>
                
                {step < totalSteps ? (
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-brand-dark text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-pink transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleComplete}
                    disabled={isCompleting}
                    className="px-6 py-2 bg-brand-pink text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-pink/80 transition-colors disabled:opacity-50"
                  >
                    {isCompleting ? '...' : 'Done'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
