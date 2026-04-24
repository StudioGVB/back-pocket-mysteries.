import React from 'react';
import { getMysteryById } from '@/services/mysteries';
import { updateMysteryAction } from '../actions';
import { Locale } from '@/lib/i18n-config';
import { AIGenerateDescriptionButton } from './_components/AIGenerateDescriptionButton';
import { MysteryForm } from './_components/MysteryForm';
import { MysterySettings } from './_components/MysterySettings';

export default async function MysteryOverviewPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const mystery = await getMysteryById(id);


  if (!mystery) return null;


  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Mystery Details</h1>
        <p className="text-slate-500 font-medium text-sm">Fill in the core details to define your mystery experience.</p>
      </div>

      <div className="max-w-4xl space-y-8">
        <MysteryForm mystery={mystery} mysteryId={id} />
      </div>
    </div>
  );
}
