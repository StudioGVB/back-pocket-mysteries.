'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button 
      type="submit"
      disabled={pending}
      className="px-8 py-3 bg-brand-pink text-white rounded-xl font-black uppercase tracking-widest hover:bg-[#FF3366] transition-all shadow-lg shadow-brand-pink/20 disabled:opacity-50 disabled:cursor-wait"
    >
      {pending ? 'Saving Changes...' : 'Save Changes'}
    </button>
  );
}
