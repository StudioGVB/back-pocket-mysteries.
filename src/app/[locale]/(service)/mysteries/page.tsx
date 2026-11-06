import React from 'react';
import { getPublishedMysteries } from '@/services/mysteries';
import MysteriesCatalogClient from './MysteriesCatalogClient';

export const unstable_instant = false;

export default async function ServiceMysteriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const mysteries = await getPublishedMysteries();

  return <MysteriesCatalogClient mysteries={mysteries} locale={locale} />;
}
