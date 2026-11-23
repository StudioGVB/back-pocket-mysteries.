import React from 'react';
import CustomerMysteryCastPage from '../../../mysteries/[slug]/cast/page';

export const unstable_instant = false;

export default async function MyMysteryReadyHubPage({
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
    edit?: string;
  }>;
}) {
  const resolvedSearch = await searchParams;
  const isEditingCast =
    resolvedSearch?.edit === '1' ||
    resolvedSearch?.edit === 'true' ||
    resolvedSearch?.view === 'cast';

  return (
    <CustomerMysteryCastPage
      params={params}
      searchParams={Promise.resolve({
        ...resolvedSearch,
        view: isEditingCast ? 'cast' : resolvedSearch?.view || 'ready',
        edit: isEditingCast ? '1' : resolvedSearch?.edit,
      })}
    />
  );
}
