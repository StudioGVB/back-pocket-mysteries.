'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { createPlotBeat, updatePlotBeat, deletePlotBeat } from '@/services/mysteries';
import { TimelinePhase, BeatType } from '@/types/database';

export async function addBeatAction(mysteryId: string, currentCount: number) {
  await createPlotBeat({
    mystery_id: mysteryId,
    event_title: 'New Story Beat',
    beat_number: currentCount + 1,
    sort_order: currentCount + 1,
    timeline_phase: 'investigation',
    beat_type: 'discovery',
    is_required: true,
  });

  revalidatePath(`/builder/mysteries/${mysteryId}/timeline`);
}

export async function updateBeatAction(mysteryId: string, id: string, updates: any) {
  await updatePlotBeat(id, updates);
  revalidatePath(`/builder/mysteries/${mysteryId}/timeline`);
}

export async function removeBeatAction(mysteryId: string, id: string) {
  await deletePlotBeat(id);
  revalidatePath(`/builder/mysteries/${mysteryId}/timeline`);
}

export async function reorderBeatsAction(mysteryId: string, beats: { id: string, sort_order: number }[]) {
  const supabase = await createClient();
  
  // Perform multiple updates (could be optimized with a single RPC if needed frequently)
  for (const beat of beats) {
    await supabase
      .from('plot_beats')
      .update({ sort_order: beat.sort_order })
      .eq('id', beat.id);
  }

  revalidatePath(`/builder/mysteries/${mysteryId}/timeline`);
}
