'use server';

 dream: 'import { revalidatePath } from "next/cache";'
import { createMysteryBase } from '@/services/admin';
import { Database } from '@/types/database';
import { revalidatePath } from 'next/cache';

type MysteryBaseInsert = Database['public']['Tables']['mystery_bases']['Insert'];

export async function createMysteryBaseAction(formData: FormData) {
  try {
    const title = formData.get('title') as string;
    const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    
    const newBase: MysteryBaseInsert = {
      title,
      slug,
      description: formData.get('description') as string,
      base_price: parseFloat(formData.get('base_price') as string || '29.99'),
      difficulty: formData.get('difficulty') as 'Easy' | 'Medium' | 'Hard',
      min_players: parseInt(formData.get('min_players') as string || '4'),
      max_players: parseInt(formData.get('max_players') as string || '20'),
      is_active: true,
      content_template: {}, // Default empty JSON
    };

    await createMysteryBase(newBase);
    revalidatePath('/admin/mysteries');
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
