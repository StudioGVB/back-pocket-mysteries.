'use server';

import { processRefund } from '@/services/admin';
import { requireAdmin } from '@/utils/admin-auth';
import { revalidatePath } from 'next/cache';

export async function refundOrderAction(id: string) {
  await requireAdmin();
  await processRefund(id);
  revalidatePath('/admin/transactions');
}
