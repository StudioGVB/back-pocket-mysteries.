import React from 'react';
import Link from 'next/link';
import { getMysteries } from '@/services/admin';
import { CreateMysteryBaseButton } from './_components/CreateMysteryBaseButton';
import { Locale } from '@/lib/i18n-config';

export default async function AdminMysteries({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const mysteries = await getMysteries();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-brand-dark uppercase tracking-tight">Mystery Bases</h2>
          <p className="text-gray-500 text-sm font-medium">Create and manage the foundation of your murder mysteries</p>
        </div>
        <CreateMysteryBaseButton />
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        {!mysteries || mysteries.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <h3 className="text-lg font-black text-brand-dark mb-2">No Mystery Bases Yet</h3>
            <p className="text-gray-400 text-sm mb-8">Ready to create your first mystery template?</p>
            <button className="text-brand-pink text-xs font-black uppercase tracking-widest hover:underline">
              Learn how to create a mystery base
            </button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Title</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Theme</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mysteries.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-brand-dark">{item.title}</p>
                    <p className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                      Created {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown Date'}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-brand-dark">{item.theme || 'No theme'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'published' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <Link 
                      href={`/${locale}/builder/mysteries/${item.id}`}
                      className="text-brand-pink text-xs font-black uppercase tracking-widest hover:underline mr-4"
                    >
                      Edit
                    </Link>
                    <button className="text-gray-400 text-xs font-black uppercase tracking-widest hover:text-brand-dark">Archive</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

