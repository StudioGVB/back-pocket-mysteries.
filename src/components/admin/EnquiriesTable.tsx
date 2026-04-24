'use client';

import React, { useState } from 'react';
import { updateEnquiryStatus, bulkUpdateEnquiries } from '@/app/actions/contact';
import { useRouter } from 'next/navigation';

export default function EnquiriesTable({ enquiries }: { enquiries: any[] }) {
  const [selectedEnquiry, setSelectedEnquiry] = useState<any | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const router = useRouter();

  // Filter enquiries
  const filteredEnquiries = enquiries.filter(enquiry => {
    if (filter === 'all') return true;
    return enquiry.status === filter;
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
    if (selectedIds.size === filteredEnquiries.length && filteredEnquiries.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEnquiries.map(e => e.id)));
    }
  };

  const handleBulkAction = async (action: 'resolve' | 'delete') => {
    setLoadingAction(action);
    await bulkUpdateEnquiries(Array.from(selectedIds), action);
    setSelectedIds(new Set());
    setLoadingAction(null);
    router.refresh();
  };

  const handleStatusToggle = async (enquiry: any) => {
    const newStatus = enquiry.status === 'pending' ? 'resolved' : 'pending';
    setLoadingAction(`status-${enquiry.id}`);
    await updateEnquiryStatus(enquiry.id, newStatus);
    
    if (selectedEnquiry?.id === enquiry.id) {
      setSelectedEnquiry({ ...selectedEnquiry, status: newStatus });
    }
    
    setLoadingAction(null);
    router.refresh();
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex bg-gray-100 p-1 rounded-full">
          {['all', 'pending', 'resolved'].map((f) => (
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

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-6 w-12">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size > 0 && selectedIds.size === filteredEnquiries.length}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-brand-pink focus:ring-brand-pink cursor-pointer"
                  />
                </th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Date Received</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Name</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Email</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Message</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEnquiries.length > 0 ? (
                filteredEnquiries.map((enquiry: any) => (
                  <tr 
                    key={enquiry.id} 
                    onClick={() => setSelectedEnquiry(enquiry)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(enquiry.id)}
                        onChange={(e) => toggleSelection(enquiry.id, e as any)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-pink focus:ring-brand-pink cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-6 text-sm font-bold text-gray-400 whitespace-nowrap group-hover:text-brand-pink transition-colors">
                      {new Date(enquiry.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-6">
                      <div className="text-sm font-black text-brand-dark group-hover:text-brand-pink transition-colors">{enquiry.name}</div>
                    </td>
                    <td className="px-4 py-6">
                      <div className="text-sm font-bold text-gray-500">{enquiry.email}</div>
                    </td>
                    <td className="px-4 py-6">
                      <div className="text-sm font-medium text-gray-600 max-w-xs truncate" title={enquiry.message}>
                        {enquiry.message}
                      </div>
                    </td>
                    <td className="px-4 py-6 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${enquiry.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${enquiry.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400'}`}></span>
                        {enquiry.status || 'Received'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-gray-400 font-bold">
                    No {filter !== 'all' ? filter : ''} enquiries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
            onClick={() => handleBulkAction('resolve')}
            disabled={loadingAction !== null}
            className="text-xs font-bold uppercase tracking-widest hover:text-brand-pink transition-colors"
          >
            {loadingAction === 'resolve' ? 'Processing...' : 'Mark Resolved'}
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
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setSelectedEnquiry(null)}></div>
          <div className="relative bg-white rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedEnquiry(null)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-brand-pink hover:bg-brand-pink/10 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-pink/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Customer Enquiry</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {new Date(selectedEnquiry.created_at).toLocaleString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Name</p>
                  <p className="text-base font-bold text-brand-dark">{selectedEnquiry.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Email</p>
                  <a href={`mailto:${selectedEnquiry.email}`} className="text-base font-bold text-brand-pink hover:underline inline-flex items-center gap-1">
                    {selectedEnquiry.email}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
              </div>
              
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Message</p>
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                  <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedEnquiry.message}
                  </p>
                </div>
              </div>

              {selectedEnquiry.attachment_urls && selectedEnquiry.attachment_urls.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Attachments</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedEnquiry.attachment_urls.map((url: string, idx: number) => {
                      const isImage = url.match(/\.(jpeg|jpg|gif|png)$/i) != null || url.includes('mock-storage');
                      return (
                        <a 
                          key={idx} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="group relative block aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:border-brand-pink transition-colors"
                        >
                          {isImage ? (
                            <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
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

            <div className="mt-8 pt-8 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={() => handleStatusToggle(selectedEnquiry)}
                disabled={loadingAction === `status-${selectedEnquiry.id}`}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
                  selectedEnquiry.status === 'resolved' 
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                {loadingAction === `status-${selectedEnquiry.id}` 
                  ? '...' 
                  : selectedEnquiry.status === 'resolved' 
                    ? 'Mark as Pending' 
                    : 'Mark as Resolved'}
              </button>
              
              <div className="flex gap-3">
                <button onClick={() => setSelectedEnquiry(null)} className="px-6 py-3 rounded-full font-bold text-sm text-gray-500 hover:bg-gray-100 transition-colors">
                  Close
                </button>
                <a 
                  href={`mailto:${selectedEnquiry.email}?subject=Re: Your enquiry to Back Pocket Mysteries`}
                  className="px-6 py-3 rounded-full font-black uppercase tracking-widest text-sm text-white bg-brand-pink hover:bg-brand-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Reply via Email
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
