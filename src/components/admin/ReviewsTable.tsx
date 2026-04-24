'use client';

import React, { useState } from 'react';
import { ReviewActions } from '@/app/[locale]/(admin)/admin/reviews/ReviewActions';
import { bulkUpdateReviews } from '@/app/actions/reviews';
import { useRouter } from 'next/navigation';

export default function ReviewsTable({ reviews }: { reviews: any[] }) {
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'published'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const router = useRouter();

  // Filter reviews
  const filteredReviews = reviews.filter(review => {
    if (filter === 'all') return true;
    return review.status === filter;
  });

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredReviews.length && filteredReviews.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReviews.map(r => r.id)));
    }
  };

  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'delete') => {
    setLoadingAction(action);
    await bulkUpdateReviews(Array.from(selectedIds), action);
    setSelectedIds(new Set());
    setLoadingAction(null);
    router.refresh();
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex bg-gray-100 p-1 rounded-full">
          {['all', 'pending', 'published'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                filter === f 
                  ? 'bg-white text-brand-dark shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[10px]">
            <tr>
              <th className="px-6 py-4 w-12">
                <input 
                  type="checkbox" 
                  checked={selectedIds.size > 0 && selectedIds.size === filteredReviews.length}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-brand-pink focus:ring-brand-pink cursor-pointer"
                />
              </th>
              <th className="px-4 py-4">Customer</th>
              <th className="px-4 py-4">Rating</th>
              <th className="px-4 py-4">Review</th>
              <th className="px-4 py-4">Date</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredReviews.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">
                  No {filter !== 'all' ? filter : ''} reviews found.
                </td>
              </tr>
            ) : (
              filteredReviews.map((review) => (
                <tr 
                  key={review.id} 
                  onClick={() => setSelectedReview(review)}
                  className="hover:bg-gray-50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(review.id)}
                      onChange={(e) => toggleSelection(review.id, e as any)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-pink focus:ring-brand-pink cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-4 font-bold text-brand-dark group-hover:text-brand-pink transition-colors">
                    {review.name}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1 text-brand-pink">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-200 fill-current'}`} viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-gray-500 max-w-xs truncate" title={review.review_text}>
                      {review.review_text}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-gray-400 font-medium whitespace-nowrap">
                    {new Date(review.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      review.status === 'published' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {review.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <ReviewActions review={review} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 z-40">
          <span className="text-sm font-black tracking-widest uppercase">
            <span className="text-brand-pink mr-2">{selectedIds.size}</span>
            Selected
          </span>
          <div className="w-px h-6 bg-gray-700"></div>
          <button 
            onClick={() => handleBulkAction('publish')}
            disabled={loadingAction !== null}
            className="text-xs font-bold uppercase tracking-widest hover:text-brand-pink transition-colors"
          >
            {loadingAction === 'publish' ? 'Processing...' : 'Publish'}
          </button>
          <button 
            onClick={() => handleBulkAction('unpublish')}
            disabled={loadingAction !== null}
            className="text-xs font-bold uppercase tracking-widest hover:text-white/70 transition-colors"
          >
            {loadingAction === 'unpublish' ? 'Processing...' : 'Unpublish'}
          </button>
          <button 
            onClick={() => handleBulkAction('delete')}
            disabled={loadingAction !== null}
            className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
          >
            {loadingAction === 'delete' ? 'Processing...' : 'Delete'}
          </button>
        </div>
      )}

      {/* Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setSelectedReview(null)}></div>
          <div className="relative bg-white rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedReview(null)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-brand-pink hover:bg-brand-pink/10 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Customer Review</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {new Date(selectedReview.created_at).toLocaleString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Customer Name</p>
                  <p className="text-base font-bold text-brand-dark">{selectedReview.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Rating</p>
                  <div className="flex gap-1 text-brand-pink justify-end">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className={`w-5 h-5 ${i < selectedReview.rating ? 'fill-current' : 'text-gray-200 fill-current'}`} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Review Content</p>
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 relative">
                  <span className="text-6xl text-brand-pink/20 absolute top-4 left-4 font-serif">"</span>
                  <p className="text-base text-gray-700 leading-relaxed relative z-10 italic">
                    {selectedReview.review_text}
                  </p>
                </div>
              </div>

              {selectedReview.attachment_urls && selectedReview.attachment_urls.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Attached Photos</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedReview.attachment_urls.map((url: string, idx: number) => {
                      const isImage = url.match(/\.(jpeg|jpg|gif|png)$/i) != null || url.includes('mock-storage');
                      return (
                        <a 
                          key={idx} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="group relative block aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:border-brand-pink transition-colors"
                        >
                          {isImage ? (
                            <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 group-hover:text-brand-pink transition-colors">
                              <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              <span className="text-xs font-bold">Document</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-brand-dark px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-sm shadow-sm transition-all scale-95 group-hover:scale-100">View</span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100 flex justify-end gap-3 items-center">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mr-auto ${
                selectedReview.status === 'published' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                Current Status: {selectedReview.status}
              </span>
              <button 
                onClick={() => setSelectedReview(null)}
                className="px-6 py-3 rounded-full font-bold text-sm text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              <ReviewActions review={selectedReview} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
