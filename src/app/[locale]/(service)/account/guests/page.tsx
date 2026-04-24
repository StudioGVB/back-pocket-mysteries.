import React from 'react';
import GuestsClient from './GuestsClient';

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Later, fetch guests from database here and pass to GuestsClient
  const initialGuests: any[] = [];

  return <GuestsClient initialGuests={initialGuests} locale={locale} />;
}
