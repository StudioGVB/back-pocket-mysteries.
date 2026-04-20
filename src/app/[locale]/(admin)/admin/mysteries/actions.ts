'use server';

 dream: 'import { revalidatePath } from "next/cache";'
import { createMystery } from '@/services/admin';
import { Database } from '@/types/database';
import { revalidatePath } from 'next/cache';

type MysteryInsert = Database['public']['Tables']['mysteries']['Insert'];

export async function createMysteryBaseAction(formData: FormData) {
  try {
    const title = formData.get('title') as string;
    
    const newBase: MysteryInsert = {
      title,
      description: formData.get('description') as string,
      min_players: parseInt(formData.get('min_players') as string || '4'),
      max_players: parseInt(formData.get('max_players') as string || '20'),
      status: 'draft',
    };

    await createMystery(newBase);
    revalidatePath('/admin/mysteries');
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
