import React from 'react';
import { BaseArchitectClient } from '@/components/admin/BaseArchitectClient';

export const unstable_instant = false;

export default async function AdminBaseArchitectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <BaseArchitectClient locale={locale} />;
}
