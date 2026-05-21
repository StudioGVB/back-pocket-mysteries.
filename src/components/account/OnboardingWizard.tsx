'use client';

import React, { useState } from 'react';
import { completeOnboarding } from '@/app/actions/onboarding';

interface OnboardingWizardProps {
  onboardingCompleted: boolean;
  userName: string;
}

export function OnboardingWizard({ onboardingCompleted, userName }: OnboardingWizardProps) {
  const [isOpen, setIsOpen] = useState(!onboardingCompleted);
  const [step, setStep] = useState(1);
  const [isCompleting, setIsCompleting] = useState(false);

  const totalSteps = 3;

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col md:flex-row">
        
        {/* Left side pattern / graphic */}
        <div className="hidden md:flex md:w-1/3 bg-brand-dark p-8 flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-brand-pink font-black uppercase tracking-widest text-xs mb-2">Welcome</h2>
            <p className="text-white font-bold text-xl leading-tight">Back Pocket Mysteries</p>
          </div>
          
          <div className="relative z-10 mt-12">
            <div className="flex gap-2">
              {[...Array(totalSteps)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 flex-1 rounded-full ${i + 1 <= step ? 'bg-brand-pink' : 'bg-white/20'}`}
                />
              ))}
            </div>
            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mt-3">
              Step {step} of {totalSteps}
            </p>
          </div>

          {/* Decorative circles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-white/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-white/5" />
        </div>

        {/* Right side content */}
        <div className="p-8 md:p-12 md:w-2/3 flex flex-col justify-center">
          
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-8 duration-500">
              <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
                Welcome, {userName || 'Host'}!
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                We're thrilled to have you here. Back Pocket Mysteries gives you everything you need to host unforgettable murder mystery parties. Let's take a quick look around.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-8 duration-500">
              <div className="w-12 h-12 bg-pink-50 text-brand-pink rounded-2xl flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight">
                Your Mysteries
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                In your dashboard, you'll find all the mysteries you've purchased. From there, you can invite guests, assign characters, and download the digital game packs.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right-8 duration-500">
              <div className="w-12 h-12 bg-pink-50 text-brand-pink rounded-2xl flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight">
                Manage Your Guests
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Use the Guests tab to keep track of everyone you invite. Send them beautifully designed digital invitations right from the platform!
              </p>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between">
            {/* Mobile progress indicators */}
            <div className="flex gap-1.5 md:hidden">
              {[...Array(totalSteps)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 w-1.5 rounded-full ${i + 1 === step ? 'bg-brand-pink' : 'bg-slate-200'}`}
                />
              ))}
            </div>
            
            <div className="flex gap-3 ml-auto">
              {step < totalSteps ? (
                <button
                  onClick={handleNext}
                  className="px-8 py-4 bg-brand-dark text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-pink transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="px-8 py-4 bg-brand-pink text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-pink/80 transition-colors disabled:opacity-50"
                >
                  {isCompleting ? 'Loading...' : 'Get Started'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
