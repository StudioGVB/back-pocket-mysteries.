'use server';

import { processRefund } from '@/services/admin';
import { revalidatePath } from 'next/cache';

export async function refundOrderAction(id: string) {
  await processRefund(id);
  revalidatePath('/admin/transactions');
}
