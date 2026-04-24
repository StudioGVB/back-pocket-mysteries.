'use client';

import React, { useState } from 'react';
import { submitReview } from '@/app/actions/reviews';
import { FileUpload } from '@/components/marketing/FileUpload';

export function ReviewForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');
    
    const formData = new FormData(e.currentTarget);
    formData.append('rating', rating.toString());
    files.forEach((file) => {
      formData.append('attachments', file);
    });
    
    try {
      const result = await submitReview(formData);
      if (result.error) {
        setStatus('error');
        setErrorMessage(result.error);
      } else {
        setStatus('success');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="card-branded p-12 text-center bg-brand-gray border-2 border-brand-pink/20">
        <div className="w-16 h-16 bg-brand-pink/10 text-brand-pink rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight mb-4">Thank You!</h3>
        <p className="text-gray-500 font-bold">Your review has been submitted successfully. We appreciate your feedback!</p>
        <button 
          onClick={() => {
            setStatus('idle');
            setFiles([]);
            setRating(5);
            if(document.getElementById('review_text')) (document.getElementById('review_text') as HTMLTextAreaElement).value = '';
            if(document.getElementById('name')) (document.getElementById('name') as HTMLInputElement).value = '';
          }}
          className="mt-8 text-xs font-black uppercase tracking-widest text-brand-pink hover:text-brand-dark transition-colors"
        >
          Submit another review
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {status === 'error' && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold">
          {errorMessage}
        </div>
      )}
      
      <div>
        <label className="block text-[10px] font-black uppercase tracking-widest text-brand-dark mb-4 text-center">Rate your experience</label>
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
            >
              <svg 
                className={`w-12 h-12 transition-colors ${
                  (hoveredRating || rating) >= star 
                    ? 'text-brand-pink fill-brand-pink' 
                    : 'text-gray-300 fill-transparent'
                }`} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <label htmlFor="name" className="block text-[10px] font-black uppercase tracking-widest text-brand-dark mb-2 pl-4">Your Name (or Nickname)</label>
        <input 
          type="text" 
          id="name" 
          name="name" 
          required
          className="w-full bg-brand-gray border-2 border-transparent rounded-full px-6 py-4 text-brand-dark font-medium focus:outline-none focus:border-brand-pink transition-colors"
          placeholder="e.g. Detective Sarah"
        />
      </div>
      
      <div>
        <label htmlFor="review_text" className="block text-[10px] font-black uppercase tracking-widest text-brand-dark mb-2 pl-4">Your Review</label>
        <textarea 
          id="review_text" 
          name="review_text" 
          required
          rows={5}
          className="w-full bg-brand-gray border-2 border-transparent rounded-[2rem] px-6 py-5 text-brand-dark font-medium focus:outline-none focus:border-brand-pink transition-colors resize-none"
          placeholder="Tell us about your party..."
        ></textarea>
      </div>

      <FileUpload onFilesChange={setFiles} />

      <button 
        type="submit" 
        disabled={status === 'loading'}
        className="w-full px-12 py-5 bg-brand-dark text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-brand-pink transition-all shadow-xl hover:translate-y-[-4px] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
      >
        {status === 'loading' ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
