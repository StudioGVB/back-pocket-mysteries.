import React from 'react';
import CustomerMysteryCastPage from '../cast/page';

export const unstable_instant = false;

export default async function CustomerMysteryReadyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{
    checkout?: string;
    orderId?: string;
    payment_intent?: string;
    session_id?: string;
    view?: string;
  }>;
}) {
  const resolvedSearch = await searchParams;
  return (
    <CustomerMysteryCastPage
      params={params}
      searchParams={Promise.resolve({
        ...resolvedSearch,
        view: resolvedSearch?.view || 'ready',
      })}
    />
  );
}
